import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import { isWithinQuietHours, nextAllowedTime, sendExpoPush, enqueueExpoPush } from "./notifications";

async function getHouseholdTimezone(hid: string): Promise<string> {
  try {
    const snap = await db.doc(`households/${hid}`).get();
    const tz = (snap.data() as any)?.timezone;
    if (typeof tz === "string" && tz.includes("/")) return tz;
  } catch {}
  return "UTC";
}

export const onCommentCreate = functions.firestore
  .document("households/{hid}/tasks/{taskId}/comments/{commentId}")
  .onCreate(async (snap, ctx) => {
    const hid = ctx.params.hid as string;
    const taskId = ctx.params.taskId as string;
    const c = snap.data() as any;
    const mentions: string[] = Array.isArray(c?.mentions) ? c.mentions : [];

    // Activity log for comment add
  try {
      await db.collection(`households/${hid}/activity`).add({
        actorId: c?.authorId ?? null,
        action: "comment.add",
        taskId,
    payload: { text: String(c?.text || "").slice(0, 200), authorDisplayName: c?.authorDisplayName || null },
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}

    if (!mentions.length) return;

    try {
      const taskSnap = await db.doc(`households/${hid}/tasks/${taskId}`).get();
      const taskTitle = (taskSnap.data() as any)?.title || taskId;
      const usersSnap = await db.getAll(
        ...mentions.map((uid) => db.doc(`users/${uid}`)),
      );
      const tz = await getHouseholdTimezone(hid);
      const now = new Date();
      const messages: { to: string[]; title: string; body: string; data?: any; categoryId?: string }[] = [];
      for (const u of usersSnap) {
        const data = u.data() as any;
        if (!data) continue;
        if (data?.notificationsEnabled === false) continue;
        const token: string | undefined = data?.pushToken;
        if (!token) continue;
        const quiet = data?.quietHours as { start: string; end: string; tz?: string } | undefined;
        const body = String(c?.text || "New comment").slice(0, 120);
        const payload = { type: "comment.mention", hid, taskId, commentId: snap.id };
        if (isWithinQuietHours(now, quiet, tz)) {
          const scheduledAt = nextAllowedTime(now, quiet, tz);
          await enqueueExpoPush({
            hid,
            to: [token],
            uids: [u.id],
            title: `Comment: ${taskTitle}`,
            body,
            data: payload,
            scheduledAt,
          });
        } else {
          messages.push({
            to: [token],
            title: `Comment: ${taskTitle}`,
            body,
            data: payload,
          });
        }
      }
      if (messages.length) await sendExpoPush(messages);
    } catch (e) {
      console.warn("[comments.onCreate] mention push failed", e);
    }
    return null;
  });
