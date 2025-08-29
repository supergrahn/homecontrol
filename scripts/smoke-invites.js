// Quick emulator smoke test for createInvite/acceptInvite
// Requires Auth + Functions + Firestore emulators.
// Seeds via firebase-admin to bypass rules, then calls callable functions through Firebase client SDK and verifies state.

const PROJECT_ID = process.env.PROJECT_ID || "demo-homecontrol";
const REGION = process.env.FUNCTIONS_REGION || "us-central1";
const HOST = process.env.FUNCTIONS_EMULATOR_HOST || "127.0.0.1";
const PORTS = {
  functions: Number(process.env.FUNCTIONS_EMULATOR_PORT || 5001),
  firestore: Number(process.env.FIRESTORE_EMULATOR_PORT || 8080),
  auth: Number(process.env.AUTH_EMULATOR_PORT || 9099),
};

// Point admin SDK to emulator
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || `${HOST}:${PORTS.firestore}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || `${HOST}:${PORTS.auth}`;

const BASE_FN = `http://${HOST}:${PORTS.functions}/${PROJECT_ID}/${REGION}`;
// Node Buffer for base64 encoding (lint fix)
const { Buffer } = require("node:buffer");

// Lazy load firebase-admin (installed in root dev deps)
let admin;
try {
  admin = require("firebase-admin");
} catch (e) {
  try {
    admin = require("../functions/node_modules/firebase-admin");
  } catch (e2) {
    console.error(
      "Missing firebase-admin in root or functions. Run npm --prefix functions i"
    );
    process.exit(1);
  }
}
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

function authHeader(uid, claims = {}) {
  // Functions emulator: pass an owner bearer to bypass verification and X-Firebase-Auth JSON for context.auth
  const payload = { uid, token: { uid, ...claims } };
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  return {
    Authorization: "Bearer owner",
    "X-Firebase-Auth": b64,
  };
}

async function http(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText} -> ${url}`);
    err.response = json;
    throw err;
  }
  return json;
}

async function seedHousehold({
  hid = "h1",
  createdBy = "admin1",
  timezone = "UTC",
} = {}) {
  await db.doc(`households/${hid}`).set(
    {
      createdBy,
      name: "Smoke Test Household",
      timezone,
    },
    { merge: true }
  );
  // Seed admin membership explicitly (bypass crashing trigger during smoke)
  await db.doc(`households/${hid}/members/${createdBy}`).set(
    {
      userId: createdBy,
      role: "admin",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await db.doc(`users/${createdBy}`).set(
    {
      householdIds: admin.firestore.FieldValue.arrayUnion(hid),
    },
    { merge: true }
  );
  return hid;
}

async function getDoc(path) {
  const snap = await db.doc(path).get();
  if (!snap.exists) throw new Error(`Doc not found: ${path}`);
  return snap.data();
}

// Firebase client SDK for auth + functions
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} = require("firebase/auth");
const {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} = require("firebase/functions");

function initClient() {
  const app = initializeApp({
    projectId: PROJECT_ID,
    apiKey: "demo",
    appId: "demo",
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${HOST}:${PORTS.auth}`);
  const funcs = getFunctions(app, REGION);
  connectFunctionsEmulator(funcs, HOST, PORTS.functions);
  return { app, auth, funcs };
}

async function signInAs(uid, auth) {
  const customToken = await admin.auth().createCustomToken(uid, {});
  const cred = await signInWithCustomToken(auth, customToken);
  return cred.user;
}

async function callCallable(name, data, uid, auth, funcs) {
  await signOut(auth).catch(() => {});
  await signInAs(uid, auth);
  const fn = httpsCallable(funcs, name);
  const res = await fn(data);
  return res.data;
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Functions: ${BASE_FN}`);
  console.log(`Firestore emulator at: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`Auth emulator at: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

  // Basic readiness probe: try GET non-existing document until emulator responds
  let ready = false;
  for (let i = 0; i < 20 && !ready; i++) {
    try {
      await http("GET", `${BASE_FN}/__health__/probe`);
      ready = true;
      break;
    } catch (e) {
      await wait(250);
    }
  }

  const hid = await seedHousehold();
  // Client init
  const { auth, funcs } = initClient();

  // 1) Admin creates invite
  const createRes = await callCallable(
    "createInvite",
    { householdId: hid, email: "invitee@example.com", role: "adult" },
    "admin1",
    auth,
    funcs
  );
  console.log("createInvite ->", createRes);

  const inviteId = createRes.inviteId;
  const token = createRes.token;
  if (!inviteId || !token)
    throw new Error("Missing inviteId/token from createInvite");

  // 2) Invitee accepts
  const acceptRes = await callCallable(
    "acceptInvite",
    { householdId: hid, inviteId, token },
    "user2",
    auth,
    funcs
  );
  console.log("acceptInvite ->", acceptRes);

  // 3) Verify Firestore state
  const memberDoc = await getDoc(`households/${hid}/members/user2`);
  const inviteDoc = await getDoc(`households/${hid}/invites/${inviteId}`);
  const role = memberDoc.role;
  const status = inviteDoc.status;

  console.log(`Member user2 role: ${role}`);
  console.log(`Invite ${inviteId} status: ${status}`);

  const ok = role === "adult" && status === "accepted";
  if (!ok) {
    throw new Error("Smoke test failed: state not as expected");
  }

  console.log("Smoke test passed ✅");
}

main().catch((e) => {
  console.error("Smoke test error:", e && (e.stack || e.message || e));
  process.exit(1);
});
