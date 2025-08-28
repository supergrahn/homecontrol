import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export type Child = {
  id: string;
  displayName: string;
  emoji?: string;
  color?: string;
};

export async function listChildren(hid: string): Promise<Child[]> {
  const snap = await getDocs(collection(db, `households/${hid}/children`));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addChild(hid: string, displayName: string, emoji?: string, color?: string): Promise<string> {
  const ref = await addDoc(collection(db, `households/${hid}/children`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
  });
  return ref.id;
}

export async function renameChild(hid: string, id: string, displayName: string, emoji?: string, color?: string) {
  await updateDoc(doc(db, `households/${hid}/children/${id}`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
  });
}

export async function deleteChild(hid: string, id: string) {
  await deleteDoc(doc(db, `households/${hid}/children/${id}`));
}
