import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export type ChecklistTemplate = {
  id: string;
  name: string;
  items: string[];
  createdAt?: Date | null;
  createdBy?: string | null;
  lastUsedAt?: Date | null;
  usageCount?: number | null;
};

const col = (hid: string) => collection(db, `households/${hid}/checklistTemplates`);

export async function listTemplates(hid: string): Promise<ChecklistTemplate[]> {
  const q = query(col(hid), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: data.name || "",
      items: Array.isArray(data.items) ? data.items : [],
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ?? null,
      createdBy: data.createdBy ?? null,
  lastUsedAt: data.lastUsedAt?.toDate ? data.lastUsedAt.toDate() : data.lastUsedAt ?? null,
  usageCount: typeof data.usageCount === "number" ? data.usageCount : 0,
    } as ChecklistTemplate;
  });
}

export async function createTemplate(
  hid: string,
  name: string,
  items: string[],
  createdBy?: string | null,
) {
  const ref = await addDoc(col(hid), {
    name,
    items,
    createdAt: (await import("firebase/firestore")).serverTimestamp(),
    createdBy: createdBy ?? null,
  usageCount: 0,
  });
  return ref.id;
}

export async function renameTemplate(hid: string, id: string, name: string) {
  await updateDoc(doc(db, `households/${hid}/checklistTemplates/${id}`), { name });
}

export async function deleteTemplate(hid: string, id: string) {
  await deleteDoc(doc(db, `households/${hid}/checklistTemplates/${id}`));
}

export async function touchTemplateLastUsed(hid: string, id: string) {
  const { serverTimestamp, increment } = await import("firebase/firestore");
  await updateDoc(doc(db, `households/${hid}/checklistTemplates/${id}`), {
    lastUsedAt: serverTimestamp(),
    usageCount: increment(1) as any,
  });
}
