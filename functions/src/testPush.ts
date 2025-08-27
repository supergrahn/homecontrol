import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import { isWithinQuietHours, nextAllowedTime, enqueueExpoPush, sendExpoPush } from "./notifications";

export const sendTestPush = functions.https.onCall(async (_data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in");
  const user = await db.doc(`users/${uid}`).get();
  const u = user.data() as any;
  const token: string | undefined = u?.pushToken;
  if (!token) throw new functions.https.HttpsError("failed-precondition", "No push token");
  const quiet = u?.quietHours as { start: string; end: string; tz?: string } | undefined;

  const now = new Date();
  const title = "Test notification";
  const body = "This is a test from HomeControl";
  const data = { type: "test" };

  if (isWithinQuietHours(now, quiet, u?.timezone || "UTC")) {
    const scheduledAt = nextAllowedTime(now, quiet, u?.timezone || "UTC");
    const hid = Array.isArray(u?.householdIds) && u.householdIds.length ? String(u.householdIds[0]) : "system";
    await enqueueExpoPush({ hid, to: [token], uids: [uid], title, body, data, scheduledAt });
    return { ok: true, scheduled: scheduledAt.toISOString() };
  }

  await sendExpoPush([{ to: [token], title, body, data }]);
  return { ok: true, sent: true };
});
