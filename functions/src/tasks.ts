import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { computeNextOccurrence } from "./utils/rrule";

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
      await db.doc(`households/${ctx.params.hid}/members/${createdBy}`).set(
        {
          userId: createdBy,
          role: "admin",
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await db.doc(`users/${createdBy}`).set(
        {
          householdIds: admin.firestore.FieldValue.arrayUnion(ctx.params.hid),
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
