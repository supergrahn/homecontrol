import * as functions from "firebase-functions";
import { db } from "./admin";
import dayjs from "dayjs";
import { Timestamp } from "firebase-admin/firestore";

type HeatmapResult = {
  days: string[];
  users: string[];
  cells: Record<string, number>;
};

async function computeWorkloadHeatmap(
  hid: string,
  rangeDays: number,
  types: string[]
): Promise<HeatmapResult> {
  // Map types -> statuses
  const wantBlocked = types
    .map((s) => String(s || "").toLowerCase())
    .includes("blocked");
  const wantUpcoming = types
    .map((s) => String(s || "").toLowerCase())
    .includes("upcoming");
  let statuses: ("open" | "in_progress" | "blocked")[] = [];
  if (wantUpcoming) statuses.push("open", "in_progress");
  if (wantBlocked) statuses.push("blocked");
  // If none selected, return empty
  if (statuses.length === 0) {
    return { days: [], users: [], cells: {} };
  }

  const start = dayjs().startOf("day").toDate();
  const end = dayjs()
    .add(rangeDays - 1, "day")
    .endOf("day")
    .toDate();

  const tasksRef = db.collection(`households/${hid}/tasks`);
  // Fetch by nextOccurrenceAt window and dueAt window
  const [byNext, byDue] = await Promise.all([
    tasksRef.where("status", "in", statuses) as any,
  ]).then(async ([statusQuery]) => {
    const q1 = await (statusQuery as any)
      .where("nextOccurrenceAt", ">=", start)
      .where("nextOccurrenceAt", "<=", end)
      .orderBy("nextOccurrenceAt", "asc")
      .get();
    const q2 = await (statusQuery as any)
      .where("dueAt", ">=", start)
      .where("dueAt", "<=", end)
      .orderBy("dueAt", "asc")
      .get();
    return [q1, q2];
  });

  type CellKey = string; // `${dateKey}|${uid}`
  const cells: Record<CellKey, number> = {};
  const dayKeys = new Set<string>();
  const userIds = new Set<string>();

  const seen = new Set<string>();
  const addDoc = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
    if (seen.has(d.id)) return; // avoid double-counting same doc across queries
    seen.add(d.id);
    const t = d.data() as any;
    const eff: Date | null =
      (t.nextOccurrenceAt?.toDate
        ? t.nextOccurrenceAt.toDate()
        : t.nextOccurrenceAt) ||
      (t.dueAt?.toDate ? t.dueAt.toDate() : t.dueAt) ||
      null;
    if (!eff) return;
    const effTime = eff.getTime();
    if (effTime < start.getTime() || effTime > end.getTime()) return;
    const ids: string[] = Array.isArray(t.assigneeIds) ? t.assigneeIds : [];
    if (ids.length === 0) return;
    const dateKey = dayjs(eff).format("YYYY-MM-DD");
    dayKeys.add(dateKey);
    ids.forEach((uid) => {
      userIds.add(uid);
      const key: CellKey = `${dateKey}|${uid}`;
      cells[key] = (cells[key] || 0) + 1;
    });
  };

  byNext.docs.forEach(addDoc);
  byDue.docs.forEach(addDoc);

  const sortedDays = Array.from(dayKeys.values()).sort();
  const sortedUsers = Array.from(userIds.values()).sort();

  return { days: sortedDays, users: sortedUsers, cells };
}

async function computeWorkloadAgg(
  hid: string,
  rangeDays: number,
  types: string[]
): Promise<HeatmapResult> {
  const wantBlocked = types
    .map((s) => String(s || "").toLowerCase())
    .includes("blocked");
  const wantUpcoming = types
    .map((s) => String(s || "").toLowerCase())
    .includes("upcoming");
  let statuses: ("open" | "in_progress" | "blocked")[] = [];
  if (wantUpcoming) statuses.push("open", "in_progress");
  if (wantBlocked) statuses.push("blocked");
  if (statuses.length === 0) {
    return { days: [], users: [], cells: {} };
  }
  const start = dayjs().startOf("day");
  const tasksCol = db.collection(`households/${hid}/tasks`);
  const membersSnap = await db.collection(`households/${hid}/members`).get();
  const userIds = membersSnap.docs.map((d) => d.id);
  const cellsAgg: Record<string, number> = {};
  const allDays: string[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const dayStart = start.add(i, "day");
    const dayEnd = dayStart.endOf("day");
    const dateKey = dayStart.format("YYYY-MM-DD");
    allDays.push(dateKey);
    const startTs = Timestamp.fromDate(dayStart.toDate());
    const endTs = Timestamp.fromDate(dayEnd.toDate());
    for (const uid of userIds) {
      // nextOccurrenceAt window (preferred effective date)
      const qNext = tasksCol
        .where("status", "in", statuses)
        .where("assigneeIds", "array-contains", uid)
        .where("nextOccurrenceAt", ">=", startTs)
        .where("nextOccurrenceAt", "<=", endTs)
        .count();
      // dueAt window, but only for tasks with nextOccurrenceAt == null
      const qDueOnly = tasksCol
        .where("status", "in", statuses)
        .where("assigneeIds", "array-contains", uid)
        .where("nextOccurrenceAt", "==", null)
        .where("dueAt", ">=", startTs)
        .where("dueAt", "<=", endTs)
        .count();
      const [cNext, cDueOnly] = await Promise.all([
        qNext.get(),
        qDueOnly.get(),
      ]);
      const key = `${dateKey}|${uid}`;
      const val = cNext.data().count + cDueOnly.data().count;
      if (val > 0) cellsAgg[key] = val;
    }
  }
  const usersWithCounts = new Set<string>();
  const dayKeys = new Set<string>();
  Object.keys(cellsAgg).forEach((k) => {
    const [dateKey, uid] = k.split("|");
    dayKeys.add(dateKey);
    usersWithCounts.add(uid);
  });
  return {
    days: Array.from(dayKeys.values()).sort(),
    users: Array.from(usersWithCounts.values()).sort(),
    cells: cellsAgg,
  };
}

export const getWorkloadHeatmap = functions.https.onCall(
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

    // Access control: any household member can view
    const memberRef = db.doc(`households/${hid}/members/${context.auth.uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only members can view heatmap"
      );
    }

    // Inputs: rangeDays (7|14|30), types ["blocked","upcoming"]
    const rangeDaysRaw = Number(data?.rangeDays);
    const allowedRanges = [7, 14, 30];
    const rangeDays = allowedRanges.includes(rangeDaysRaw) ? rangeDaysRaw : 7;
    const types = Array.isArray(data?.types)
      ? (data.types as string[])
      : ["blocked", "upcoming"];
    const result = await computeWorkloadHeatmap(hid, rangeDays, types);
    return result;
  }
);

// Admin-only parity checker using Firestore aggregate queries (count) per day/user
export const checkHeatmapParity = functions.https.onCall(
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

    // Access: admin only
    const memberRef = db.doc(`households/${hid}/members/${context.auth.uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists || (memberSnap.data() as any)?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Admins only");
    }

    const rangeDaysRaw = Number(data?.rangeDays);
    const allowedRanges = [7, 14, 30];
    const rangeDays = allowedRanges.includes(rangeDaysRaw) ? rangeDaysRaw : 7;
    const types = Array.isArray(data?.types)
      ? (data.types as string[])
      : ["blocked", "upcoming"];
    const wantBlocked = types
      .map((s) => String(s || "").toLowerCase())
      .includes("blocked");
    const wantUpcoming = types
      .map((s) => String(s || "").toLowerCase())
      .includes("upcoming");
    let statuses: ("open" | "in_progress" | "blocked")[] = [];
    if (wantUpcoming) statuses.push("open", "in_progress");
    if (wantBlocked) statuses.push("blocked");
    if (statuses.length === 0) return { ok: true, diff: {}, meta: {} };

    // Compute baseline and aggregate versions
    const [base, agg] = await Promise.all([
      computeWorkloadHeatmap(hid, rangeDays, types),
      computeWorkloadAgg(hid, rangeDays, types),
    ]);
    const baseCells = base.cells;
    const cellsAgg = agg.cells;
    const allDays = agg.days;
    const userIds = agg.users;
    const diff: Record<string, { base?: number; agg?: number }> = {};
    const keys = new Set([...Object.keys(baseCells), ...Object.keys(cellsAgg)]);
    keys.forEach((k) => {
      const b = baseCells[k] || 0;
      const a = cellsAgg[k] || 0;
      if (b !== a) diff[k] = { base: b, agg: a };
    });
    return {
      ok: Object.keys(diff).length === 0,
      diff,
      meta: { days: allDays, users: userIds, statuses },
    };
  }
);

// Test-only exports
export const __test__ = { computeWorkloadHeatmap, computeWorkloadAgg };
