import { db, auth } from "../firebase";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, getDoc, doc } from "firebase/firestore";

export type Comment = {
  id: string;
  authorId: string;
  authorDisplayName?: string | null;
  text: string;
  mentions?: string[]; // uids
  createdAt?: Date | null;
};

export async function listComments(hid: string, taskId: string): Promise<Comment[]> {
  const ref = collection(db, `households/${hid}/tasks/${taskId}/comments`);
  const q = query(ref, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data: any = d.data();
    const toDate = (v: any) => (v && v.toDate ? v.toDate() : (v ?? null));
    return {
      id: d.id,
      authorId: data.authorId,
      authorDisplayName: data.authorDisplayName ?? null,
      text: data.text,
      mentions: Array.isArray(data.mentions) ? data.mentions : [],
      createdAt: toDate(data.createdAt),
    } as Comment;
  });
}

export async function addComment(hid: string, taskId: string, text: string, mentions: string[] = []) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  let authorDisplayName: string | null = auth.currentUser?.displayName || null;
  try {
    const u = await getDoc(doc(db, `users/${uid}`));
    if (u.exists()) {
      const data: any = u.data();
      if (typeof data?.displayName === "string" && data.displayName.trim()) {
        authorDisplayName = data.displayName.trim();
      }
    }
  } catch {}
  const ref = collection(db, `households/${hid}/tasks/${taskId}/comments`);
  await addDoc(ref, {
    authorId: uid,
    authorDisplayName,
    text,
    mentions,
    createdAt: serverTimestamp(),
  });
}
