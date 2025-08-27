import { db } from '../firebase';
import {
  collection, doc, getDocs, addDoc, updateDoc, serverTimestamp,
  query, where, orderBy
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { Task } from '../models/task';

export async function fetchTodayTasks(hid: string): Promise<Task[]> {
  const start = dayjs().startOf('day').toDate();
  const end = dayjs().endOf('day').toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const q = query(
    ref,
    where('status', 'in', ['open','in_progress','blocked']),
    where('nextOccurrenceAt', '>=', start),
    where('nextOccurrenceAt', '<=', end),
    orderBy('nextOccurrenceAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...convert(d.data()) } as Task));
}

export async function createTask(hid: string, input: Partial<Task>) {
  const ref = collection(db, `households/${hid}/tasks`);
  const docRef = await addDoc(ref, {
    ...input,
    householdId: hid,
    status: input.status ?? 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateTask(hid: string, id: string, patch: Partial<Task>) {
  const ref = doc(db, `households/${hid}/tasks/${id}`);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

// Mark a task occurrence as complete; default to status 'done'
export async function completeTask(hid: string, id: string) {
  await updateTask(hid, id, { status: 'done' });
}

export async function fetchOverdueTasks(hid: string): Promise<Task[]> {
  const now = dayjs().toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const q = query(
    ref,
    where('status', 'in', ['open','in_progress','blocked']),
    where('dueAt', '<', now),
    orderBy('dueAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...convert(d.data()) } as Task));
}

export async function fetchUpcomingTasks(hid: string): Promise<Task[]> {
  const start = dayjs().add(1, 'day').startOf('day').toDate();
  const end = dayjs().add(7, 'day').endOf('day').toDate();
  const ref = collection(db, `households/${hid}/tasks`);
  const q = query(
    ref,
    where('status', 'in', ['open','in_progress','blocked']),
    where('nextOccurrenceAt', '>=', start),
    where('nextOccurrenceAt', '<=', end),
    orderBy('nextOccurrenceAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...convert(d.data()) } as Task));
}

function convert(raw: any): any {
  const toDate = (t: any) => (t && t.toDate) ? t.toDate() : t;
  return {
    ...raw,
    startAt: toDate(raw.startAt),
    dueAt: toDate(raw.dueAt),
    nextOccurrenceAt: toDate(raw.nextOccurrenceAt),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt)
  };
}
