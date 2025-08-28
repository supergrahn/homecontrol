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

  // Simple rate limit: max 5 invites per user per household per hour
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1h
  const limit = 5;
  const rlId = `${uid}:${householdId}`;
  const rlRef = db.doc(`rateLimits/invites_${rlId}`);
  const rlSnap = await rlRef.get();
  const bucket = rlSnap.exists ? (rlSnap.data() as any) : null;
  const resetAt = bucket?.resetAt?.toDate ? bucket.resetAt.toDate().getTime() : bucket?.resetAt || 0;
  const count = typeof bucket?.count === "number" ? bucket.count : 0;
  if (bucket && now < resetAt && count >= limit) {
    throw new functions.https.HttpsError("resource-exhausted", "Too many invites; try again later");
  }
  const newResetAt = now >= resetAt ? now + windowMs : resetAt;
  await rlRef.set(
    {
      count: now >= resetAt ? 1 : (count + 1),
      resetAt:
        (admin.firestore as any)?.Timestamp?.fromDate?.(new Date(newResetAt)) || new Date(newResetAt),
      updatedAt:
        (admin.firestore as any)?.FieldValue?.serverTimestamp?.() || new Date(),
    },
    { merge: true },
  );

  const token = crypto.randomUUID();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const inviteRef = db.collection(`households/${householdId}/invites`).doc();
  const expiresAt = (admin.firestore as any)?.Timestamp?.fromDate
    ? (admin.firestore as any).Timestamp.fromDate(
        new Date(Date.now() + 7 * 864e5),
      )
    : new Date(Date.now() + 7 * 864e5);

  await inviteRef.set({
    email,
    role: role ?? "adult",
    status: "pending",
    tokenHash,
    createdBy: uid,
    createdAt:
      (admin.firestore as any)?.FieldValue?.serverTimestamp?.() || new Date(),
    expiresAt,
  });

  // Build links
  const deepLink = buildAppDeepLink(householdId, inviteRef.id, token);
  const dynamicLink = buildDynamicLink(deepLink);

  // Try sending an email if SMTP config is set; otherwise, return token for client sharing
  try {
    const cfg: any = (functions as any).config ? (functions as any).config() : {};
    const smtpCfg = (cfg && cfg.smtp) || {};
    const host = process.env.SMTP_HOST || smtpCfg.host;
    const port = Number(process.env.SMTP_PORT || smtpCfg.port || 587);
    const user = process.env.SMTP_USER || smtpCfg.user;
    const pass = process.env.SMTP_PASS || smtpCfg.pass;
    const from = process.env.SMTP_FROM || smtpCfg.from || "no-reply@homecontrol";
    const appLink = dynamicLink || deepLink;
    if (host && user && pass) {
  // Require nodemailer dynamically to avoid type resolution issues if types are absent in some environments
  const nodemailer = require("nodemailer");
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
      joinedAt:
        (admin.firestore as any)?.FieldValue?.serverTimestamp?.() || new Date(),
    },
    { merge: true },
  );

  await invRef.update({ status: "accepted" });

  try {
    await db.doc(`users/${uid}`).set(
      {
        householdIds:
          (admin.firestore as any)?.FieldValue?.arrayUnion?.(householdId) || [
            householdId,
          ],
      },
      { merge: true },
    );
  } catch {
    // best-effort in emulator
    await db.doc(`users/${uid}`).set(
      { householdIds: [householdId] },
      { merge: true },
    );
  }

  // Append activity: invite accepted
  await db.collection(`households/${householdId}/activity`).add({
    actorId: uid,
    action: "invite.accept",
    taskId: null,
    payload: { inviteId },
    at:
      (admin.firestore as any)?.FieldValue?.serverTimestamp?.() || new Date(),
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
export function buildDynamicLink(deepLink: string): string | null {
  const cfg: any = (functions as any).config ? (functions as any).config() : {};
  const dlCfg = (cfg && cfg.dynamiclinks) || {};
  const domain = process.env.DYNAMIC_LINK_DOMAIN || dlCfg.domain; // e.g., hc.page.link
  if (!domain) return null;
  // Prefer wrapping deep parameters into an https link base if provided
  const base = process.env.DYNAMIC_LINK_LINK_BASE || dlCfg.link_base; // e.g., https://homecontrol.app/invite
  const url = base ? `${base}?d=${encodeURIComponent(deepLink)}` : deepLink;
  const apn = process.env.DYNAMIC_LINK_APN || dlCfg.apn;
  const ibi = process.env.DYNAMIC_LINK_IBI || dlCfg.ibi;
  const isi = process.env.DYNAMIC_LINK_ISI || dlCfg.isi;
  const params = new URLSearchParams({ link: url, efr: "1" });
  if (apn) params.set("apn", apn);
  if (ibi) params.set("ibi", ibi);
  if (isi) params.set("isi", isi);
  return `https://${domain}/?${params.toString()}`;
}

// Firestore trigger: log invite activity on create/update (revoke/expire)
export const onInviteWrite = functions.firestore
  .document("households/{hid}/invites/{inviteId}")
  .onWrite(async (change, ctx) => {
    const hid = ctx.params.hid as string;
    const inviteId = ctx.params.inviteId as string;

    // Created
    if (!change.before.exists && change.after.exists) {
      const inv = change.after.data() as any;
      await db.collection(`households/${hid}/activity`).add({
        actorId: inv.createdBy ?? null,
        action: "invite.create",
        taskId: null,
        payload: { inviteId, email: inv.email, role: inv.role ?? "adult" },
        at:
          (admin.firestore as any)?.FieldValue?.serverTimestamp?.() ||
          new Date(),
      });
      return;
    }

    // Updated
    if (change.before.exists && change.after.exists) {
      const before = change.before.data() as any;
      const after = change.after.data() as any;
      if (before.status !== after.status) {
        const newStatus = String(after.status);
        // accept is already logged in acceptInvite; avoid duplicate
        if (newStatus === "revoked" || newStatus === "expired") {
          const action = newStatus === "revoked" ? "invite.revoke" : "invite.expire";
          await db.collection(`households/${hid}/activity`).add({
            actorId: after.updatedBy ?? after.createdBy ?? null,
            action,
            taskId: null,
            payload: { inviteId },
            at:
              (admin.firestore as any)?.FieldValue?.serverTimestamp?.() ||
              new Date(),
          });
        }
      }
    }
  });
