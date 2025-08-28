import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { isWithinQuietHours, nextAllowedTime, sendExpoPush, enqueueExpoPush } from "./notifications";


dayjs.extend(utc);
dayjs.extend(timezone);

// Run hourly; for each household, emit digest at its local target hour (default 07:00).
export const runDailyDigests = functions.pubsub
  .schedule("0 * * * *")
  .timeZone("Etc/UTC")
  .onRun(async () => {
    const householdsSnap = await db.collection("households").get();
    for (const h of householdsSnap.docs) {
      const hid = h.id;
      const tz = (h.data() as any)?.timezone || "UTC";
      const targetHour = Number((h.data() as any)?.digestHour ?? 7);
      const nowTz = dayjs().tz(tz);
      if (nowTz.hour() !== targetHour) continue; // only process at local target hour
      const start = nowTz.startOf("day").toDate();
      const end = nowTz.endOf("day").toDate();
      const now = nowTz.toDate();

      // Fetch members
      const membersSnap = await db
        .collection(`households/${hid}/members`)
        .get();
      const memberIds = membersSnap.docs.map((d) => d.id);
      if (memberIds.length === 0) continue;

      // Today via nextOccurrenceAt
      const tasksRef = db.collection(`households/${hid}/tasks`);
      const statusIn = ["open", "in_progress", "blocked"];
      const todayNextSnap = await tasksRef
        .where("status", "in", statusIn as any)
        .where("nextOccurrenceAt", ">=", start)
        .where("nextOccurrenceAt", "<=", end)
        .orderBy("nextOccurrenceAt", "asc")
        .get();
      // Today via dueAt
      const todayDueSnap = await tasksRef
        .where("status", "in", statusIn as any)
        .where("dueAt", ">=", start)
        .where("dueAt", "<=", end)
        .orderBy("dueAt", "asc")
        .get();
      // Overdue via dueAt < now
      const overdueSnap = await tasksRef
        .where("status", "in", statusIn as any)
        .where("dueAt", "<", now)
        .orderBy("dueAt", "asc")
        .get();

      const dedup: Record<string, FirebaseFirestore.DocumentSnapshot> = {};
      todayNextSnap.docs.forEach((d) => {
        dedup[d.id] = d;
      });
      todayDueSnap.docs.forEach((d) => {
        dedup[d.id] = d;
      });
  const todayTasks = Object.values(dedup);
      const overdueTasks = overdueSnap.docs.filter(
        (d) => !todayTasks.find((t) => t.id === d.id),
      );

      const topTitles = (
        docs: FirebaseFirestore.DocumentSnapshot[],
        n: number,
      ) =>
        docs.slice(0, n).map((d) => String((d.data() as any)?.title || d.id));

      // Summarize
      const summary = {
        date: nowTz.format("YYYY-MM-DD"),
        tz,
        counts: {
          today: todayTasks.length,
          overdue: overdueTasks.length,
        },
        samples: {
          todayTitles: topTitles(todayTasks, 2),
          overdueTitles: topTitles(overdueTasks, 2),
        },
      };

      // Write one activity entry per day (skip if already exists)
      const digestId = `digest_${summary.date}`;
      const digestRef = db.doc(`households/${hid}/activity/${digestId}`);
      const existed = await digestRef.get();
      if (existed.exists) continue;
      await digestRef.set(
        {
          actorId: null,
          action: "digest.daily",
          taskId: null,
          payload: summary,
          at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Push notifications to members who have a pushToken set, respecting quiet hours
      try {
        const usersSnap = await db.getAll(
          ...memberIds.map((uid) => db.doc(`users/${uid}`)),
        );
        const tzFallback = tz;
        const now = new Date();
        const messages: {
          to: string[];
          title: string;
          body: string;
          data?: Record<string, any>;
        }[] = [];
        for (const doc of usersSnap) {
          const u = doc.data() as any;
          if (u?.notificationsEnabled === false) continue;
          const token: string | undefined = u?.pushToken;
          if (!token) continue;
          const uid = doc.id;
          const quiet = u?.quietHours as
            | { start: string; end: string; tz?: string }
            | undefined;
          if (isWithinQuietHours(now, quiet, tzFallback)) {
            const scheduled = nextAllowedTime(now, quiet, tzFallback);
            await enqueueExpoPush({
              hid,
              to: [token],
              uids: [uid],
              title: "Daily summary",
              body: `Today ${summary.counts.today} · Overdue ${summary.counts.overdue}`,
              data: { type: "digest.daily", hid, counts: summary.counts, date: summary.date },
              scheduledAt: scheduled,
            });
          } else {
            messages.push({
              to: [token],
              title: "Daily summary",
              body: `Today ${summary.counts.today} · Overdue ${summary.counts.overdue}`,
              data: {
                type: "digest.daily",
                hid,
                counts: summary.counts,
                date: summary.date,
              },
            });
          }
        }
        if (messages.length) await sendExpoPush(messages);
      } catch (e) {
        console.warn("[digest] push step failed", e);
      }

      // Optional escalation: if enabled at household level and a task is due within 3h with no assignee, ping unassigned adults
      try {
        const hdata = (h.data() as any) || {};
        if (hdata.escalationEnabled !== true) {
          continue;
        }
        const now = new Date();
        const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const candidates = await tasksRef
          .where("status", "in", statusIn as any)
          .where("dueAt", ">=", now)
          .where("dueAt", "<=", soon)
          .get();
        if (candidates.empty) continue;

        // Load member roles to identify adults
        const membersSnap2 = await db.collection(`households/${hid}/members`).get();
        const roles: Record<string, string> = {};
        membersSnap2.docs.forEach((d) => (roles[d.id] = (d.data() as any)?.role || "adult"));
        const adultIds = Object.keys(roles).filter((uid) => roles[uid] === "adult" || roles[uid] === "admin");

        const escalationMsgs: { to: string[]; title: string; body: string; data?: any }[] = [];
  const usersSnap2 = await db.getAll(...adultIds.map((uid) => db.doc(`users/${uid}`)));
        const pushTokens: Record<string, string | undefined> = {};
        usersSnap2.forEach((u) => (pushTokens[u.id] = (u.data() as any)?.pushToken));

        for (const t of candidates.docs) {
          const td = t.data() as any;
          const assignees: string[] = Array.isArray(td.assigneeIds) ? td.assigneeIds : [];
          const acceptedBy: string[] = Array.isArray(td.acceptedBy) ? td.acceptedBy : [];
          const hasAcceptance = assignees.length > 0 && assignees.some((uid) => acceptedBy.includes(uid));
          // Escalate if:
          //  - No assignees at all, or
          //  - There are assignees, but none accepted yet
          if (assignees.length > 0 && hasAcceptance) continue;
          const title = String(td.title || t.id);
          for (const uid of adultIds) {
            // If assigned but unaccepted, escalate to other adults (exclude assignees)
            if (assignees.length > 0 && assignees.includes(uid)) continue;
            const token = pushTokens[uid];
            if (!token) continue;
      const quiet = (usersSnap2.find((u) => u.id === uid)?.data() as any)?.quietHours;
            if (isWithinQuietHours(now, quiet, tz)) {
              const scheduled = nextAllowedTime(now, quiet, tz);
              await enqueueExpoPush({
                hid,
                to: [token],
        uids: [uid],
                title: "Heads-up",
                body: `Unassigned task due soon: ${title}`,
                data: { type: "escalation", hid, taskId: t.id },
                scheduledAt: scheduled,
              });
            } else {
              escalationMsgs.push({
                to: [token],
                title: "Heads-up",
                body: `Unassigned task due soon: ${title}`,
                data: { type: "escalation", hid, taskId: t.id },
              });
            }
          }
        }
        if (escalationMsgs.length) await sendExpoPush(escalationMsgs);
      } catch (e) {
        console.warn("[digest] escalation step failed", e);
      }
    }
    return null;
  });

// Dev/admin callable to run a digest now for a specific household
export const runDigestNow = functions.https.onCall(async (data, context) => {
  const { householdId } = data as { householdId: string };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in");
  const member = await db.doc(`households/${householdId}/members/${uid}`).get();
  if (!member.exists || (member.data() as any)?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  const h = await db.doc(`households/${householdId}`).get();
  const tz = (h.data() as any)?.timezone || "UTC";
  const nowTz = dayjs().tz(tz);
  const start = nowTz.startOf("day").toDate();
  const end = nowTz.endOf("day").toDate();
  const now = nowTz.toDate();
  const tasksRef = db.collection(`households/${householdId}/tasks`);
  const statusIn = ["open", "in_progress", "blocked"];
  const todayNextSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("nextOccurrenceAt", ">=", start)
    .where("nextOccurrenceAt", "<=", end)
    .orderBy("nextOccurrenceAt", "asc")
    .get();
  const todayDueSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("dueAt", ">=", start)
    .where("dueAt", "<=", end)
    .orderBy("dueAt", "asc")
    .get();
  const overdueSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("dueAt", "<", now)
    .orderBy("dueAt", "asc")
    .get();
  const dedup: Record<string, FirebaseFirestore.DocumentSnapshot> = {};
  todayNextSnap.docs.forEach((d) => (dedup[d.id] = d));
  todayDueSnap.docs.forEach((d) => (dedup[d.id] = d));
  const todayTasks = Object.values(dedup);
  const overdueTasks = overdueSnap.docs.filter((d) => !todayTasks.find((t) => t.id === d.id));
  const topTitles = (
    docs: FirebaseFirestore.DocumentSnapshot[],
    n: number,
  ) => docs.slice(0, n).map((d) => String((d.data() as any)?.title || d.id));
  const summary = {
    date: nowTz.format("YYYY-MM-DD"),
    tz,
    counts: { today: todayTasks.length, overdue: overdueTasks.length },
    samples: {
      todayTitles: topTitles(todayTasks, 2),
      overdueTitles: topTitles(overdueTasks, 2),
    },
  };
  // Dedupe: use deterministic id like scheduled job (digest_YYYY-MM-DD)
  const digestId = `digest_${summary.date}`;
  const digestRef = db.doc(`households/${householdId}/activity/${digestId}`);
  const existed = await digestRef.get();
  if (!existed.exists) {
    await digestRef.set(
      {
        actorId: uid, // manual trigger
        action: "digest.daily",
        taskId: null,
        payload: summary,
        at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Push notifications mirroring scheduled job, respecting quiet hours
    try {
      const membersSnap = await db
        .collection(`households/${householdId}/members`)
        .get();
      const memberIds = membersSnap.docs.map((d) => d.id);
      if (memberIds.length) {
        const usersSnap = await db.getAll(
          ...memberIds.map((m) => db.doc(`users/${m}`)),
        );
        const messages: { to: string[]; title: string; body: string; data?: any }[] = [];
        for (const doc of usersSnap) {
          const u = doc.data() as any;
          if (u?.notificationsEnabled === false) continue;
          const token: string | undefined = u?.pushToken;
          if (!token) continue;
          const quiet = u?.quietHours as { start: string; end: string; tz?: string } | undefined;
          if (isWithinQuietHours(now, quiet, tz)) {
            const scheduledAt = nextAllowedTime(now, quiet, tz);
            await enqueueExpoPush({
              hid: householdId,
              to: [token],
              title: "Daily summary",
              body: `Today ${summary.counts.today} · Overdue ${summary.counts.overdue}`,
              data: { type: "digest.daily", hid: householdId, counts: summary.counts, date: summary.date },
              scheduledAt,
            });
          } else {
            messages.push({
              to: [token],
              title: "Daily summary",
              body: `Today ${summary.counts.today} · Overdue ${summary.counts.overdue}`,
              data: { type: "digest.daily", hid: householdId, counts: summary.counts, date: summary.date },
            });
          }
        }
        if (messages.length) await sendExpoPush(messages);
      }
    } catch (e) {
      console.warn("[runDigestNow] push step failed", e);
    }
  }
  return { ok: true, summary, skipped: existed.exists };
});

// Admin-only: compute today's digest summary but do not write or send push
export const runDigestDryRun = functions.https.onCall(async (data, context) => {
  const { householdId } = data as { householdId: string };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in");
  const member = await db.doc(`households/${householdId}/members/${uid}`).get();
  if (!member.exists || (member.data() as any)?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }

  const h = await db.doc(`households/${householdId}`).get();
  const tz = (h.data() as any)?.timezone || "UTC";
  const nowTz = dayjs().tz(tz);
  const start = nowTz.startOf("day").toDate();
  const end = nowTz.endOf("day").toDate();
  const now = nowTz.toDate();
  const tasksRef = db.collection(`households/${householdId}/tasks`);
  const statusIn = ["open", "in_progress", "blocked"];
  const todayNextSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("nextOccurrenceAt", ">=", start)
    .where("nextOccurrenceAt", "<=", end)
    .orderBy("nextOccurrenceAt", "asc")
    .get();
  const todayDueSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("dueAt", ">=", start)
    .where("dueAt", "<=", end)
    .orderBy("dueAt", "asc")
    .get();
  const overdueSnap = await tasksRef
    .where("status", "in", statusIn as any)
    .where("dueAt", "<", now)
    .orderBy("dueAt", "asc")
    .get();
  const dedup: Record<string, FirebaseFirestore.DocumentSnapshot> = {};
  todayNextSnap.docs.forEach((d) => (dedup[d.id] = d));
  todayDueSnap.docs.forEach((d) => (dedup[d.id] = d));
  const todayTasks = Object.values(dedup);
  const overdueTasks = overdueSnap.docs.filter((d) => !todayTasks.find((t) => t.id === d.id));
  const topTitles = (
    docs: FirebaseFirestore.DocumentSnapshot[],
    n: number,
  ) => docs.slice(0, n).map((d) => String((d.data() as any)?.title || d.id));
  const summary = {
    date: nowTz.format("YYYY-MM-DD"),
    tz,
    counts: { today: todayTasks.length, overdue: overdueTasks.length },
    samples: {
      todayTitles: topTitles(todayTasks, 2),
      overdueTitles: topTitles(overdueTasks, 2),
    },
  };
  return { ok: true, summary };
});
