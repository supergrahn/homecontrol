import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { Task } from "../models/task";
import { refreshNextUpWidget } from "./widgets";
import {
  startTaskLiveActivity,
  endTaskLiveActivity,
  cancelTaskLiveActivity,
} from "./liveActivity";

export async function fetchTodayTasks(
  hid: string,
  opts?: { priorityOrder?: "asc" | "desc" }
): Promise<Task[]> {
  const start = dayjs().startOf("day").toDate();
  const end = dayjs().endOf("day").toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const parts: any[] = [
    where("status", "in", ["open", "in_progress", "blocked"]),
    where("nextOccurrenceAt", ">=", start),
    where("nextOccurrenceAt", "<=", end),
    orderBy("nextOccurrenceAt", "asc"),
  ];
  if (opts?.priorityOrder) parts.push(orderBy("priority", opts.priorityOrder));
  const q = query(ref, ...parts);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...convert(d.data()) }) as Task);
}

export async function createTask(hid: string, input: Partial<Task>) {
  const ref = collection(db, `households/${hid}/tasks`);
  const docRef = await addDoc(ref, {
    ...input,
    householdId: hid,
    status: input.status ?? "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTask(
  hid: string,
  id: string,
  patch: Partial<Task>
) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

// Mark a task occurrence as complete; default to status 'done'
export async function completeTask(hid: string, id: string) {
  await updateTask(hid, id, { status: "done" });
  try {
    await Promise.all([refreshNextUpWidget(hid), endTaskLiveActivity(hid, id)]);
  } catch {}
}

export async function snoozeTask(hid: string, id: string, minutes: number) {
  const task = await getTask(hid, id);
  const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60 * 1000);
  let patch: any = {};
  if (task?.nextOccurrenceAt instanceof Date) {
    patch.nextOccurrenceAt = addMin(task.nextOccurrenceAt, minutes) as any;
  } else if (task?.dueAt instanceof Date) {
    patch.dueAt = addMin(task.dueAt, minutes) as any;
  } else {
    patch.dueAt = addMin(new Date(), minutes) as any;
  }
  await updateTask(hid, id, patch);
  try {
    await refreshNextUpWidget(hid);
  } catch {}
}

export async function acceptTask(hid: string, id: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const { arrayUnion } = await import("firebase/firestore");
  await updateDoc(ref, {
    acceptedBy: arrayUnion(uid) as any,
    updatedAt: serverTimestamp(),
  });
  try {
    // Best-effort fetch of title for Live Activity and include a start timestamp
    let title: string | undefined;
    try {
      const t = await getTask(hid, id);
      if (t?.title) title = String(t.title);
    } catch {}
    await Promise.all([
      refreshNextUpWidget(hid),
      startTaskLiveActivity({
        hid,
        taskId: id,
        title,
        startedAt: new Date().toISOString(),
      }),
    ]);
  } catch {}
}

export async function releaseTask(hid: string, id: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const { arrayRemove } = await import("firebase/firestore");
  await updateDoc(ref, {
    acceptedBy: arrayRemove(uid) as any,
    updatedAt: serverTimestamp(),
  });
  try {
    await Promise.all([
      refreshNextUpWidget(hid),
      cancelTaskLiveActivity(hid, id),
    ]);
  } catch {}
}

export async function fetchOverdueTasks(
  hid: string,
  opts?: { priorityOrder?: "asc" | "desc" }
): Promise<Task[]> {
  const now = dayjs().toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const parts: any[] = [
    where("status", "in", ["open", "in_progress", "blocked"]),
    where("dueAt", "<", now),
    orderBy("dueAt", "asc"),
  ];
  if (opts?.priorityOrder) parts.push(orderBy("priority", opts.priorityOrder));
  const q = query(ref, ...parts);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...convert(d.data()) }) as Task);
}

export async function fetchUpcomingTasks(
  hid: string,
  opts?: { priorityOrder?: "asc" | "desc" }
): Promise<Task[]> {
  const start = dayjs().add(1, "day").startOf("day").toDate();
  const end = dayjs().add(7, "day").endOf("day").toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const parts: any[] = [
    where("status", "in", ["open", "in_progress", "blocked"]),
    where("nextOccurrenceAt", ">=", start),
    where("nextOccurrenceAt", "<=", end),
    orderBy("nextOccurrenceAt", "asc"),
  ];
  if (opts?.priorityOrder) parts.push(orderBy("priority", opts.priorityOrder));
  const q = query(ref, ...parts);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...convert(d.data()) }) as Task);
}

export async function getTask(hid: string, id: string): Promise<Task | null> {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...convert(snap.data()) } as Task;
}

export async function deleteTask(hid: string, id: string): Promise<void> {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  await deleteDoc(ref);
}

// Fetch tasks in a time range by nextOccurrenceAt OR dueAt, merge, and sort by effective date
export async function fetchTasksInRange(
  hid: string,
  start: Date,
  end: Date,
  opts?: { priorityOrder?: "asc" | "desc" }
): Promise<Task[]> {
  const ref = collection(db, `households/${hid}/tasks`);
  const statusFilter = where("status", "in", [
    "open",
    "in_progress",
    "blocked",
  ]);
  const q1Parts: any[] = [
    statusFilter,
    where("nextOccurrenceAt", ">=", start),
    where("nextOccurrenceAt", "<=", end),
    orderBy("nextOccurrenceAt", "asc"),
  ];
  const q2Parts: any[] = [
    statusFilter,
    where("dueAt", ">=", start),
    where("dueAt", "<=", end),
    orderBy("dueAt", "asc"),
  ];
  if (opts?.priorityOrder) {
    q1Parts.push(orderBy("priority", opts.priorityOrder));
    q2Parts.push(orderBy("priority", opts.priorityOrder));
  }
  const [snap1, snap2] = await Promise.all([
    getDocs(query(ref, ...q1Parts)),
    getDocs(query(ref, ...q2Parts)),
  ]);
  const map = new Map<string, Task & { __eff?: Date | null }>();
  const add = (d: any) => {
    const id = d.id;
    const data = convert(d.data());
    const eff: Date | null =
      (data as any).nextOccurrenceAt || (data as any).dueAt || null;
    const existing = map.get(id);
    if (!existing) {
      map.set(id, { id, ...(data as any), __eff: eff });
    } else {
      // prefer earlier effective date
      const prev = existing.__eff?.getTime() ?? Infinity;
      const now = eff?.getTime() ?? Infinity;
      if (now < prev) map.set(id, { id, ...(data as any), __eff: eff });
    }
  };
  snap1.docs.forEach(add);
  snap2.docs.forEach(add);
  const items = Array.from(map.values());
  items.sort((a, b) => {
    const ea = a.__eff?.getTime() ?? 0;
    const eb = b.__eff?.getTime() ?? 0;
    if (ea !== eb) return ea - eb;
    const pa =
      typeof (a as any).priority === "number" ? (a as any).priority : 0;
    const pb =
      typeof (b as any).priority === "number" ? (b as any).priority : 0;
    return opts?.priorityOrder === "desc"
      ? pb - pa
      : opts?.priorityOrder === "asc"
        ? pa - pb
        : 0;
  });
  return items.map(({ __eff, ...rest }) => rest as Task);
}

function convert(raw: any): any {
  const toDate = (t: any) => (t && t.toDate ? t.toDate() : t);
  return {
    ...raw,
    startAt: toDate(raw.startAt),
    dueAt: toDate(raw.dueAt),
    nextOccurrenceAt: toDate(raw.nextOccurrenceAt),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    acceptedBy: Array.isArray(raw.acceptedBy) ? raw.acceptedBy : [],
    pausedUntil: toDate(raw.pausedUntil) ?? null,
    skipDates: Array.isArray(raw.skipDates) ? raw.skipDates : [],
    exceptionShifts:
      typeof raw.exceptionShifts === "object" && raw.exceptionShifts
        ? raw.exceptionShifts
        : {},
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
    lastAutoShiftedAt: toDate(raw.lastAutoShiftedAt) ?? null,
    lastAutoShiftedFrom: toDate(raw.lastAutoShiftedFrom) ?? null,
    lastAutoShiftedTo: toDate(raw.lastAutoShiftedTo) ?? null,
    lastAutoShiftReason: raw.lastAutoShiftReason ?? null,
  };
}

// Exceptions helpers (client-side minimal support)
export async function addTaskSkipDate(
  hid: string,
  id: string,
  dateKey: string
) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const { arrayUnion } = await import("firebase/firestore");
  await updateDoc(ref, {
    skipDates: arrayUnion(dateKey) as any,
    updatedAt: serverTimestamp(),
  });
}

export async function setTaskPausedUntil(
  hid: string,
  id: string,
  until: Date | null
) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  await updateDoc(ref, {
    pausedUntil: until as any,
    updatedAt: serverTimestamp(),
  });
}

// Set a per-instance shift in minutes for the occurrence on a given day key (YYYY-MM-DD in household tz)
export async function addTaskShiftDate(
  hid: string,
  id: string,
  dateKey: string,
  minutes: number
) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const fieldPath = `exceptionShifts.${dateKey}` as any;
  await updateDoc(ref, { [fieldPath]: minutes } as any);
}

// Dependencies helpers
export async function addDependency(hid: string, id: string, depId: string) {
  if (id === depId) throw new Error("A task cannot depend on itself");
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const { arrayUnion } = await import("firebase/firestore");
  await updateDoc(ref, {
    dependsOn: arrayUnion(depId) as any,
    updatedAt: serverTimestamp(),
  });
}

export async function removeDependency(hid: string, id: string, depId: string) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  const { arrayRemove } = await import("firebase/firestore");
  await updateDoc(ref, {
    dependsOn: arrayRemove(depId) as any,
    updatedAt: serverTimestamp(),
  });
}

export async function setDependencies(hid: string, id: string, deps: string[]) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  await updateDoc(ref, {
    dependsOn: deps as any,
    updatedAt: serverTimestamp(),
  });
}
