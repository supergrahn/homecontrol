import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import dayjs from 'dayjs';

const db = admin.firestore();

export const onHouseholdCreate = functions.firestore
  .document('households/{hid}')
  .onCreate(async (snap, ctx) => {
    const { createdBy } = snap.data() as any;
    if (!createdBy) return;
    await db.doc(`households/${ctx.params.hid}/members/${createdBy}`).set({
      userId: createdBy,
      role: 'admin',
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.doc(`users/${createdBy}`).set({
      householdIds: admin.firestore.FieldValue.arrayUnion(ctx.params.hid)
    }, { merge: true });
  });

/**
 * Recompute nextOccurrenceAt whenever a task is created/updated.
 * For MVP, a very simple heuristic:
 * - if rrule present & startAt present -> nextOccurrenceAt = startAt (or next future occurrence, TBA)
 * - else if dueAt present -> nextOccurrenceAt = dueAt
 * - else -> null
 * You can expand with full RRULE parsing (rrule package) in a later revision of this function.
 */
export const onTaskWrite = functions.firestore
  .document('households/{hid}/tasks/{taskId}')
  .onWrite(async (change, ctx) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return;

    const startAt = asDate(after.startAt);
    const dueAt = asDate(after.dueAt);
    let next: Date | null = null;

    if (after.rrule && startAt) {
      // naive: if start time is in the past, keep start as next; in production use RRULE lib
      next = startAt > new Date() ? startAt : startAt;
    } else if (dueAt) {
      next = dueAt;
    }

    // only write if changed, to avoid loops
    const prevNext = asDate(after.nextOccurrenceAt);
    if ((prevNext?.getTime() || 0) !== (next?.getTime() || 0)) {
      await change.after.ref.update({
        nextOccurrenceAt: next ? admin.firestore.Timestamp.fromDate(next) : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

function asDate(v: any): Date | null {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return null;
}
