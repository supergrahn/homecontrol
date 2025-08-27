import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  assigneeId?: string | null;
}

export async function listChecklist(
  hid: string,
  taskId: string,
): Promise<ChecklistItem[]> {
  const ref = collection(db, `households/${hid}/tasks/${taskId}/checklist`);
  const q = query(ref, orderBy("label"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addChecklistItem(
  hid: string,
  taskId: string,
  label: string,
) {
  const ref = collection(db, `households/${hid}/tasks/${taskId}/checklist`);
  const docRef = await addDoc(ref, { label, done: false });
  return docRef.id;
}

export async function toggleChecklistItem(
  hid: string,
  taskId: string,
  itemId: string,
  done: boolean,
) {
  const ref = doc(db, `households/${hid}/tasks/${taskId}/checklist/${itemId}`);
  await updateDoc(ref, { done });
}

export async function renameChecklistItem(
  hid: string,
  taskId: string,
  itemId: string,
  label: string,
) {
  const ref = doc(db, `households/${hid}/tasks/${taskId}/checklist/${itemId}`);
  await updateDoc(ref, { label });
}

export async function removeChecklistItem(
  hid: string,
  taskId: string,
  itemId: string,
) {
  const ref = doc(db, `households/${hid}/tasks/${taskId}/checklist/${itemId}`);
  await deleteDoc(ref);
}
