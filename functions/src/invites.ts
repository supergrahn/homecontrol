import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import crypto from "crypto";

export const createInvite = functions.https.onCall(async (data, context) => {
  const { householdId, email, role } = data as {
    householdId: string;
    email: string;
    role?: string;
  };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in");

  const member = await db.doc(`households/${householdId}/members/${uid}`).get();
  if (!member.exists || member.data()?.role !== "admin")
    throw new functions.https.HttpsError("permission-denied", "Admin only");

  const token = crypto.randomUUID();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const inviteRef = db.collection(`households/${householdId}/invites`).doc();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 7 * 864e5),
  );

  await inviteRef.set({
    email,
    role: role ?? "adult",
    status: "pending",
    tokenHash,
    createdBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });

  // Build links
  const deepLink = buildAppDeepLink(householdId, inviteRef.id, token);
  const dynamicLink = buildDynamicLink(deepLink);

  // Try sending an email if SMTP config is set; otherwise, return token for client sharing
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "no-reply@homecontrol";
    const appLink = dynamicLink || deepLink;
    if (host && user && pass) {
      const nodemailer = require("nodemailer") as typeof import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({
        from,
        to: email,
        subject: "You're invited to a household on HomeControl",
        text: `You've been invited to join a household. Open this link on your phone: ${appLink}`,
        html: `<p>You've been invited to join a household on <b>HomeControl</b>.</p><p>Open this link on your phone:</p><p><a href="${appLink}">${appLink}</a></p>`,
      });
      console.log("Invite email sent:", info.messageId);
    } else {
      console.log("SMTP not configured; returning token for client share.");
    }
  } catch (e) {
    console.warn("Failed to send invite email:", e);
  }

  return { inviteId: inviteRef.id, token, url: dynamicLink || deepLink };
});

export const acceptInvite = functions.https.onCall(async (data, context) => {
  const { householdId, inviteId, token } = data as {
    householdId: string;
    inviteId: string;
    token: string;
  };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in");

  const invRef = db.doc(`households/${householdId}/invites/${inviteId}`);
  const invSnap = await invRef.get();
  if (!invSnap.exists)
    throw new functions.https.HttpsError("not-found", "Invite missing");

  const inv = invSnap.data()!;
  if (inv.status !== "pending" || inv.expiresAt.toDate() < new Date())
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Invite invalid/expired",
    );

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  if (hash !== inv.tokenHash)
    throw new functions.https.HttpsError("permission-denied", "Bad token");

  await db.doc(`households/${householdId}/members/${uid}`).set(
    {
      userId: uid,
      role: inv.role ?? "adult",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await invRef.update({ status: "accepted" });

  await db.doc(`users/${uid}`).set(
    {
      householdIds: admin.firestore.FieldValue.arrayUnion(householdId),
    },
    { merge: true },
  );

  // Append activity: invite accepted
  await db.collection(`households/${householdId}/activity`).add({
    actorId: uid,
    action: "invite.accept",
    taskId: null,
    payload: { inviteId },
    at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

function buildAppDeepLink(hid: string, inviteId: string, token: string): string {
  return `homecontrol://invite?hid=${encodeURIComponent(hid)}&inviteId=${encodeURIComponent(inviteId)}&token=${encodeURIComponent(token)}`;
}

// Build a long Firebase Dynamic Link if configured via env vars.
// Required env:
//   DYNAMIC_LINK_DOMAIN (e.g., hc.page.link)
// Optional env:
//   DYNAMIC_LINK_APN (Android package)
//   DYNAMIC_LINK_IBI (iOS bundle id)
//   DYNAMIC_LINK_ISI (iOS App Store id)
//   DYNAMIC_LINK_LINK_BASE (https base to wrap deep params, e.g., https://homecontrol.app/invite)
function buildDynamicLink(deepLink: string): string | null {
  const domain = process.env.DYNAMIC_LINK_DOMAIN; // e.g., hc.page.link
  if (!domain) return null;
  // Prefer wrapping deep parameters into an https link base if provided
  const base = process.env.DYNAMIC_LINK_LINK_BASE; // e.g., https://homecontrol.app/invite
  const url = base ? `${base}?d=${encodeURIComponent(deepLink)}` : deepLink;
  const apn = process.env.DYNAMIC_LINK_APN;
  const ibi = process.env.DYNAMIC_LINK_IBI;
  const isi = process.env.DYNAMIC_LINK_ISI;
  const params = new URLSearchParams({ link: url, efr: "1" });
  if (apn) params.set("apn", apn);
  if (ibi) params.set("ibi", ibi);
  if (isi) params.set("isi", isi);
  return `https://${domain}/?${params.toString()}`;
}
