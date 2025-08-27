import { admin } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Expo } from "expo-server-sdk";

dayjs.extend(utc);
dayjs.extend(timezone);

const expo = new Expo();

export type QuietHours =
  | { start: string; end: string; tz?: string }
  | undefined;

export function isWithinQuietHours(
  now: Date,
  quiet: QuietHours,
  tzFallback: string,
): boolean {
  if (!quiet) return false;
  const tz = quiet.tz || tzFallback || "UTC";
  const nowTz = dayjs(now).tz(tz);
  const [sH, sM] = quiet.start.split(":").map(Number);
  const [eH, eM] = quiet.end.split(":").map(Number);
  const start = nowTz.hour(sH).minute(sM).second(0).millisecond(0);
  const endSameDay = nowTz.hour(eH).minute(eM).second(0).millisecond(0);
  // overnight window if start >= end
  if (sH > eH || (sH === eH && sM >= eM)) {
    // Quiet spans from start today into next day until endSameDay
    return nowTz.isAfter(start) || nowTz.isBefore(endSameDay);
  } else {
    // Same-day window
    return nowTz.isAfter(start) && nowTz.isBefore(endSameDay);
  }
}

export function nextAllowedTime(
  now: Date,
  quiet: QuietHours,
  tzFallback: string,
): Date {
  if (!quiet) return now;
  const tz = quiet.tz || tzFallback || "UTC";
  const nowTz = dayjs(now).tz(tz);
  const [sH, sM] = quiet.start.split(":").map(Number);
  const [eH, eM] = quiet.end.split(":").map(Number);
  const start = nowTz.hour(sH).minute(sM).second(0).millisecond(0);
  const endSameDay = nowTz.hour(eH).minute(eM).second(0).millisecond(0);
  const overnight = sH > eH || (sH === eH && sM >= eM);
  if (overnight) {
    // Quiet from start -> end next day
    if (nowTz.isBefore(endSameDay)) {
      // Still in the early-morning quiet segment; allow at endSameDay today
      return endSameDay.toDate();
    }
    if (nowTz.isAfter(start)) {
      // In evening quiet segment; allow at endSameDay tomorrow
      return endSameDay.add(1, "day").toDate();
    }
    // Outside quiet; allow now
    return now;
  } else {
    // Same-day window
    if (nowTz.isBefore(start) || nowTz.isAfter(endSameDay)) return now;
    return endSameDay.toDate();
  }
}

type PushMessage = {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
};

export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  const chunks: any[] = [];
  for (const msg of messages) {
    const valids = msg.to.filter(Expo.isExpoPushToken);
    if (valids.length === 0) continue;
    const payloads = valids.map((token) => ({
      to: token,
      title: msg.title,
      body: msg.body,
      data: msg.data,
    }));
    chunks.push(...expo.chunkPushNotifications(payloads));
  }
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk as any);
    } catch (e) {
      console.warn("[push] send chunk failed", e);
    }
  }
}

export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

// Queue-based push to respect quiet hours
export async function enqueueExpoPush(options: {
  hid: string;
  to: string[];
  uids?: string[]; // optional mapping 1:1 with 'to'
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledAt: Date;
}) {
  const { hid, to, uids, title, body, data, scheduledAt } = options;
  // Dedupe tokens, keeping first UID association if provided
  const seen = new Set<string>();
  const dedupTo: string[] = [];
  const dedupUids: string[] = [];
  to.forEach((tok, i) => {
    if (seen.has(tok)) return;
    seen.add(tok);
    dedupTo.push(tok);
    if (Array.isArray(uids)) dedupUids.push(uids[i]);
  });
  const ref = admin
    .firestore()
    .collection(`households/${hid}/pushQueue`)
    .doc();
  await ref.set({
  hid,
    to: dedupTo,
    uids: Array.isArray(uids) ? dedupUids : [],
    title,
    body,
    data: data || null,
    scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
    createdAt: serverTimestamp(),
    attempts: 0,
  });
}

// Run every 5 minutes to deliver queued push notifications
export const processPushQueue = require("firebase-functions").pubsub
  .schedule("*/5 * * * *")
  .timeZone("Etc/UTC")
  .onRun(async () => {
    const now = new Date();
    const db = admin.firestore();
    const snap = await db
      .collectionGroup("pushQueue")
      .where("scheduledAt", "<=", admin.firestore.Timestamp.fromDate(now))
      .limit(200)
      .get();
    if (snap.empty) return null;

    const maxAttempts = 5;
    const baseDelayMin = 5; // minutes
    let sent = 0;
    let dropped = 0;
    let retriedCount = 0;

    for (const d of snap.docs) {
      const x = d.data() as any;
      const attempts = Number(x.attempts || 0);
      const to: string[] = Array.isArray(x.to) ? x.to : [];
      const uids: string[] = Array.isArray(x.uids) ? x.uids : [];
      const uidByToken: Record<string, string | undefined> = {};
      to.forEach((tok, i) => (uidByToken[tok] = uids[i]));
      const valids = to.filter(Expo.isExpoPushToken);
      if (valids.length === 0) {
        await d.ref.delete();
        continue;
      }

      const payloads = valids.map((token) => ({
        to: token,
        title: String(x.title || ""),
        body: String(x.body || ""),
        data: x.data || undefined,
      }));

      let transientError = false;
      try {
        const chunks = expo.chunkPushNotifications(payloads);
        for (const chunk of chunks) {
          const arr = chunk as any[];
          const tickets = await expo.sendPushNotificationsAsync(arr as any);
          tickets.forEach((t, i) => {
            if (t.status === "error") {
              const token = (arr[i] as any)?.to as string;
              const code = (t as any).details?.error || (t as any).message || "unknown";
              // Treat rate limits and unknown as transient
              if (
                code === "MessageRateExceeded" ||
                code === "ExpoRateLimitExceeded" ||
                code === "InternalServerError" ||
                code === "UnknownError" ||
                code === "unknown"
              ) {
                transientError = true;
              } else if (code === "DeviceNotRegistered") {
                // Clear invalid token on user document if we can identify
                const uid = uidByToken[token];
                (async () => {
                  try {
                    if (uid) {
                      await db.collection("users").doc(uid).set({ pushToken: null }, { merge: true });
                    } else {
                      const q = await db.collection("users").where("pushToken", "==", token).limit(5).get();
                      for (const u of q.docs) {
                        await u.ref.set({ pushToken: null }, { merge: true });
                      }
                    }
                  } catch (e) {
                    console.warn("[pushQueue] failed to clear bad token", e);
                  }
                })();
                dropped++;
              }
            } else {
              sent++;
            }
          });
        }
      } catch (e) {
        transientError = true;
        console.warn("[pushQueue] send failed", e);
      }

      if (transientError && attempts + 1 < maxAttempts) {
        const delayMin = Math.min(Math.pow(2, attempts) * baseDelayMin, 60 * 6); // cap at 6h
        const scheduledAt = new Date(Date.now() + delayMin * 60 * 1000);
        await d.ref.update({
          attempts: attempts + 1,
          scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
          updatedAt: serverTimestamp(),
        });
        retriedCount++;
      } else {
        // Success or exceeded retries: delete, but if exceeded retries, move to DLQ first
        if (transientError || attempts + 1 >= maxAttempts) {
          try {
            const hid: string | undefined = (x as any)?.hid;
            const dlq = hid
              ? db.collection(`households/${hid}/pushDLQ`).doc(d.id)
              : db.collection("system").doc("pushDLQ").collection("items").doc(d.id);
            await dlq.set({
              ...x,
              at: serverTimestamp(),
              reason: transientError ? "transient_max_attempts" : "max_attempts",
            });
          } catch (e) {
            console.warn("[pushQueue] DLQ write failed", e);
          }
        }
        await d.ref.delete();
      }
    }
    // Log basic run metrics
    try {
      const runId = new Date().toISOString().replace(/[:.]/g, "-");
      await db.collection("system").doc("pushRuns").collection("runs").doc(runId).set({
        at: serverTimestamp(),
        checked: snap.size,
        sent,
        dropped,
        retried: retriedCount,
      });
    } catch (e) {
      console.warn("[pushQueue] metrics log failed", e);
    }
    return null;
  });
