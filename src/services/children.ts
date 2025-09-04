import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export type Child = {
  id: string;
  displayName: string;
  emoji?: string;
  color?: string;
  school?: any | null;
  schoolGradeLabel?: string | null;
  schoolGradesRange?: { min?: number | null; max?: number | null } | null;
};

export async function listChildren(hid: string): Promise<Child[]> {
  const snap = await getDocs(collection(db, `households/${hid}/children`));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function addChild(
  hid: string,
  displayName: string,
  emoji?: string,
  color?: string,
  school?: any | null
): Promise<string> {
  // Pull structured grade details if AddEditChildModal provided it
  let gradeLabel: string | null = null;
  let gradeRange: { min?: number | null; max?: number | null } | null = null;
  if (school && typeof school === "object") {
    const label = (school as any).__selectedGrade;
    const range = (school as any).__grades;
    if (typeof label === "string" && label.trim()) gradeLabel = label.trim();
    if (range && (range.min != null || range.max != null)) {
      gradeRange = { min: range.min ?? null, max: range.max ?? null };
    }
    // Don't persist temp helper fields inside school blob
    delete (school as any).__selectedGrade;
    delete (school as any).__grades;
  }
  const ref = await addDoc(collection(db, `households/${hid}/children`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
    school: school || null,
    schoolGradeLabel: gradeLabel,
    schoolGradesRange: gradeRange,
  });
  return ref.id;
}

export async function renameChild(
  hid: string,
  id: string,
  displayName: string,
  emoji?: string,
  color?: string
) {
  await updateDoc(doc(db, `households/${hid}/children/${id}`), {
    displayName,
    emoji: emoji || null,
    color: color || null,
  });
}

export async function deleteChild(hid: string, id: string) {
  await deleteDoc(doc(db, `households/${hid}/children/${id}`));
}
