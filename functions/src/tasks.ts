import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { computeNextOccurrence } from "./utils/rrule";
import { isWithinQuietHours, nextAllowedTime, sendExpoPush, enqueueExpoPush } from "./notifications";

dayjs.extend(utc);
dayjs.extend(timezone);

export const onHouseholdCreate = functions.firestore
  .document("households/{hid}")
  .onCreate(
    async (
      snap: functions.firestore.DocumentSnapshot,
      ctx: functions.EventContext,
    ) => {
      const { createdBy } = snap.data() as any;
      if (!createdBy) return;
      const fv: any = (admin.firestore as any)?.FieldValue ?? {};
      const joinedAt = typeof fv.serverTimestamp === "function"
        ? fv.serverTimestamp()
        : new Date();
      const unionHid = typeof fv.arrayUnion === "function"
        ? fv.arrayUnion(ctx.params.hid)
        : [ctx.params.hid];

      await db.doc(`households/${ctx.params.hid}/members/${createdBy}`).set(
        {
          userId: createdBy,
          role: "admin",
          joinedAt,
        },
        { merge: true },
      );

      await db.doc(`users/${createdBy}`).set(
        {
          householdIds: unionHid,
        },
        { merge: true },
      );
    },
  );

/**
 * Recompute nextOccurrenceAt whenever a task is created/updated.
 * For MVP, a very simple heuristic:
 * - if rrule present & startAt present -> nextOccurrenceAt = startAt (or next future occurrence, TBA)
 * - else if dueAt present -> nextOccurrenceAt = dueAt
 * - else -> null
 * You can expand with full RRULE parsing (rrule package) in a later revision of this function.
 */
export const onTaskWrite = functions.firestore
  .document("households/{hid}/tasks/{taskId}")
  .onWrite(
    async (
      change: functions.Change<functions.firestore.DocumentSnapshot>,
      ctx: functions.EventContext,
    ) => {
      const after = change.after.exists ? change.after.data() : null;
      const before = change.before.exists ? change.before.data() : null;
      const hid = ctx.params.hid as string;
      const taskId = ctx.params.taskId as string;
      if (!after) return;

  const startAt = asDate(after.startAt);
  const dueAt = asDate(after.dueAt);
  const prepHours = Number((after as any)?.prepWindowHours ?? 0);
  let nextOccurrence: Date | null = null; // the actual event/due time in UTC

      const tz = await getHouseholdTimezone(hid);
    const { occurrenceAt, nextOccurrenceAt } = await computeNextOccurrence(
        tz,
        {
          rrule: (after as any)?.rrule ?? null,
          startAt,
          dueAt,
      prepWindowHours: prepHours,
      pausedUntil: asDate((after as any)?.pausedUntil) ?? null,
      skipDates: Array.isArray((after as any)?.skipDates) ? (after as any)?.skipDates : [],
      exceptionShifts: (after as any)?.exceptionShifts ?? {},
        },
      );
      nextOccurrence = occurrenceAt;

      // only write if changed, to avoid loops
      // Apply prep window if present: notify/show earlier than the actual occurrence
  const showAt = nextOccurrenceAt;

      const prevNext = asDate(after.nextOccurrenceAt);
      if ((prevNext?.getTime() || 0) !== (showAt?.getTime() || 0)) {
        await change.after.ref.update({
          nextOccurrenceAt: showAt
            ? admin.firestore.Timestamp.fromDate(showAt)
            : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Rotation MVP: on create (no before) or if nextOccurrenceAt advanced from null -> value, assign next from rotationPool
      if (!before || (!asDate(before?.nextOccurrenceAt) && showAt)) {
        const pool = Array.isArray((after as any)?.rotationPool) ? (after as any).rotationPool as string[] : [];
        if (pool.length) {
          const idx = Number((after as any)?.rotationIndex ?? 0);
          const nextIdx = (idx + 1) % pool.length;
          const assignee = pool[idx];
          await change.after.ref.set({
            assigneeIds: [assignee],
            rotationIndex: nextIdx,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }

      // Activity: creation and completion
      if (!before) {
        // Creation
        await db.collection(`households/${hid}/activity`).add({
          actorId: (after as any).createdBy ?? null,
          action: "task.create",
          taskId,
          payload: { title: (after as any).title, type: (after as any).type },
          at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Push notification to household members (excluding creator), respecting user settings and quiet hours
        try {
          const createdBy: string | undefined = (after as any)?.createdBy;
          const membersSnap = await db.collection(`households/${hid}/members`).get();
          const memberIds = membersSnap.docs.map((d) => d.id).filter((id) => id && id !== createdBy);
          if (memberIds.length) {
            const usersSnap = await db.getAll(...memberIds.map((uid) => db.doc(`users/${uid}`)));
            const now = new Date();
            const title = String((after as any)?.title || taskId);
            const messages: { to: string[]; title: string; body: string; data?: Record<string, any>; categoryId?: string }[] = [];
            for (const u of usersSnap) {
              const data = u.data() as any;
              if (data?.notificationsEnabled === false) continue;
              const token: string | undefined = data?.pushToken;
              if (!token) continue;
              const quiet = data?.quietHours as { start: string; end: string; tz?: string } | undefined;
              if (isWithinQuietHours(now, quiet, await getHouseholdTimezone(hid))) {
                const scheduledAt = nextAllowedTime(now, quiet, await getHouseholdTimezone(hid));
                await enqueueExpoPush({
                  hid,
                  to: [token],
                  uids: [u.id],
                  title: "New task",
                  body: title,
                  data: { type: "task.create", hid, taskId },
                  categoryId: "task_actions",
                  scheduledAt,
                });
              } else {
                messages.push({
                  to: [token],
                  title: "New task",
                  body: title,
                  data: { type: "task.create", hid, taskId },
                  categoryId: "task_actions",
                });
              }
            }
            if (messages.length) await sendExpoPush(messages);
          }
        } catch (e) {
          console.warn("[tasks.onWrite] push on create failed", e);
        }
      } else {
        const beforeStatus = (before as any).status;
        const afterStatus = (after as any).status;
        if (beforeStatus !== "done" && afterStatus === "done") {
          await db.collection(`households/${hid}/activity`).add({
            actorId:
              (after as any).updatedBy ?? (after as any).createdBy ?? null,
            action: "task.complete",
            taskId,
            payload: { title: (after as any).title },
            at: admin.firestore.FieldValue.serverTimestamp(),
          });
          // Notify adults for approval if required
          if ((after as any)?.approvalRequired) {
            try {
              const membersSnap = await db.collection(`households/${hid}/members`).get();
              const adultIds = membersSnap.docs.filter((d) => {
                const role = (d.data() as any)?.role;
                return role === "adult" || role === "admin";
              }).map((d) => d.id);
              if (adultIds.length) {
                const usersSnap = await db.getAll(...adultIds.map((uid) => db.doc(`users/${uid}`)));
                const messages: { to: string[]; title: string; body: string; data?: Record<string, any>; categoryId?: string }[] = [];
                for (const u of usersSnap) {
                  const data = u.data() as any;
                  const token: string | undefined = data?.pushToken;
                  if (!token) continue;
                  messages.push({
                    to: [token],
                    title: "Needs verification",
                    body: String((after as any)?.title || taskId),
                    data: { type: "task.needs_verify", hid, taskId },
                    categoryId: "task_actions",
                  });
                }
                if (messages.length) await sendExpoPush(messages);
              }
            } catch {}
          }
        }
        // Adult verification notification back to assignees
        if (beforeStatus !== "verified" && afterStatus === "verified") {
          try {
            const assignees: string[] = Array.isArray((after as any)?.assigneeIds) ? (after as any).assigneeIds : [];
            if (assignees.length) {
              const usersSnap = await db.getAll(...assignees.map((uid) => db.doc(`users/${uid}`)));
              const messages: { to: string[]; title: string; body: string; data?: Record<string, any>; categoryId?: string }[] = [];
              for (const u of usersSnap) {
                const data = u.data() as any;
                const token: string | undefined = data?.pushToken;
                if (!token) continue;
                messages.push({
                  to: [token],
                  title: "Verified",
                  body: String((after as any)?.title || taskId),
                  data: { type: "task.verified", hid, taskId },
                  categoryId: "task_actions",
                });
              }
              if (messages.length) await sendExpoPush(messages);
            }
          } catch {}
        }
      }
    },
  );

function asDate(v: any): Date | null {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return null;
}

async function getHouseholdTimezone(hid: string): Promise<string> {
  try {
    const snap = await db.doc(`households/${hid}`).get();
    const tz = (snap.data() as any)?.timezone;
    // Basic validation: must contain a slash like Continent/City
    if (typeof tz === "string" && tz.includes("/")) return tz;
  } catch {}
  return "UTC";
}
