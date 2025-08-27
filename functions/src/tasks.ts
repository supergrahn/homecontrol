import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { rrulestr, RRule } from "rrule";

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
      let next: Date | null = null;

      if (after.rrule) {
        try {
          // Resolve household timezone (default to UTC)
          const hid = ctx.params.hid as string;
          const tz = await getHouseholdTimezone(hid);

          // Base DTSTART: prefer startAt, then dueAt, else now in TZ
          const base = startAt ?? dueAt ?? new Date();
          const baseTz = dayjs(base).tz(tz, true).toDate();

          // Parse rule; ensure DTSTART applied if missing
          const rule: RRule = rrulestr(after.rrule, {
            dtstart: baseTz,
            forceset: false,
          }) as RRule;

          // Compute from "now" in the same TZ to respect local day boundaries
          const nowTz = dayjs().tz(tz).toDate();
          const occurrence = rule.after(nowTz, true);
          next = occurrence ? dayjs(occurrence).tz("UTC").toDate() : null;
        } catch (e) {
          console.warn("RRULE parse failed, falling back to dueAt", e);
          next = dueAt ?? null;
        }
      } else if (dueAt) {
        next = dueAt;
      }

      // only write if changed, to avoid loops
      const prevNext = asDate(after.nextOccurrenceAt);
      if ((prevNext?.getTime() || 0) !== (next?.getTime() || 0)) {
        await change.after.ref.update({
          nextOccurrenceAt: next
            ? admin.firestore.Timestamp.fromDate(next)
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
