import * as functions from "firebase-functions";
import { admin, db } from "./admin";

type Range = {
  start?: string | number | Date;
  end?: string | number | Date;
};

export const getFairnessStats = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth)
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Sign in required"
      );
    const hid: string = data?.householdId;
    if (!hid)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId is required"
      );

    // Optional: limit timeframe
    const range: Range = data?.range ?? {};
    const start = range.start ? new Date(range.start) : null;
    const end = range.end ? new Date(range.end) : null;

    // Access control: any household member can view
    const memberRef = db.doc(`households/${hid}/members/${context.auth.uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only members can view stats"
      );
    }

    // Aggregate completions and assignments
    const tasksRef = db.collection(`households/${hid}/tasks`);
    // Fetch in batches; for simplicity, limit to last 90 days unless explicit
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const lower = start ?? ninetyDaysAgo;
    const upper = end ?? new Date();

    // We don't have an index on completedAt; fall back to scanning limited docs by updatedAt desc and status done
    const snap = await tasksRef
      .where("status", "==", "done")
      .orderBy("updatedAt", "desc")
      .limit(1000)
      .get();

    const perUser: Record<string, { completed: number; assigned: number }> = {};
    const assignTally: Record<string, number> = {};
    const doneTally: Record<string, number> = {};
    for (const d of snap.docs) {
      const t = d.data() as any;
      const updatedAt = t.updatedAt?.toDate
        ? t.updatedAt.toDate()
        : t.updatedAt;
      if (updatedAt && (updatedAt < lower || updatedAt > upper)) continue;
      const assignees: string[] = Array.isArray(t.assigneeIds)
        ? t.assigneeIds
        : [];
      for (const uid of assignees)
        assignTally[uid] = (assignTally[uid] || 0) + 1;
      const acceptedBy: string[] = Array.isArray(t.acceptedBy)
        ? t.acceptedBy
        : [];
      const completer =
        (t.updatedBy as string) ||
        acceptedBy[0] ||
        (Array.isArray(t.assigneeIds) ? t.assigneeIds[0] : undefined);
      if (completer) doneTally[completer] = (doneTally[completer] || 0) + 1;
    }

    const membersSnap = await db.collection(`households/${hid}/members`).get();
    for (const m of membersSnap.docs) {
      const uid = m.id;
      perUser[uid] = {
        completed: doneTally[uid] || 0,
        assigned: assignTally[uid] || 0,
      };
    }

    // Compute basic fairness: completion share vs equal share
    const totals = Object.values(perUser).reduce(
      (acc, v) => {
        acc.completed += v.completed;
        acc.assigned += v.assigned;
        return acc;
      },
      { completed: 0, assigned: 0 }
    );
    const memberCount = Math.max(1, membersSnap.size);

    const users = membersSnap.docs.map((d) => {
      const uid = d.id;
      const base = perUser[uid] || { completed: 0, assigned: 0 };
      const expected = totals.completed / memberCount;
      const delta = base.completed - expected;
      return {
        userId: uid,
        displayName: (d.data() as any)?.displayName || null,
        role: (d.data() as any)?.role || null,
        completed: base.completed,
        assigned: base.assigned,
        expected: Math.round(expected * 100) / 100,
        delta: Math.round(delta * 100) / 100,
      };
    });

    return {
      range: { start: lower, end: upper },
      totals,
      users,
    };
  }
);
