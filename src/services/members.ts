import { db, auth } from "../firebase";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export type Member = {
  userId: string;
  role: "admin" | "adult" | null;
  displayName?: string | null;
  photoURL?: string | null;
  joinedAt?: unknown;
};

export async function listMembers(hid: string): Promise<Member[]> {
  const q = query(
    collection(db, `households/${hid}/members`),
    orderBy("role"),
  );
  const snap = await getDocs(q);
  const base = snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));
  const withNames = await Promise.all(
    base.map(async ({ id, data }) => {
      let displayName: string | null | undefined = data?.displayName;
      let photoURL: string | null | undefined = data?.photoURL;
      if (!displayName) {
        try {
          const { getDoc } = await import("firebase/firestore");
          const userSnap = await getDoc(doc(db, `users/${id}`));
          if (userSnap.exists()) {
            const u = userSnap.data() as any;
            displayName = u?.displayName;
            photoURL = u?.photoURL ?? u?.photoUrl ?? null;
          }
        } catch {}
      }
      return {
        userId: id,
        role: (data?.role as any) ?? null,
        displayName: displayName ?? null,
        photoURL: photoURL ?? null,
        joinedAt: data?.joinedAt,
      } as Member;
    }),
  );
  return withNames;
}

export async function setMemberRole(
  hid: string,
  memberUid: string,
  role: "admin" | "adult",
) {
  await setDoc(
    doc(db, `households/${hid}/members/${memberUid}`),
    { role },
    { merge: true },
  );
}

export async function removeMember(hid: string, memberUid: string) {
  await deleteDoc(doc(db, `households/${hid}/members/${memberUid}`));
}

export async function leaveHousehold(hid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  await deleteDoc(doc(db, `households/${hid}/members/${user.uid}`));
  await setDoc(
    doc(db, `users/${user.uid}`),
    {
      householdIds: arrayRemove(hid),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteHousehold(hid: string) {
  // NOTE: This only deletes the household root doc; subcollections would remain.
  // In production, perform recursive delete via Cloud Functions.
  await deleteDoc(doc(db, `households/${hid}`));
}
