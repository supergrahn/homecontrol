import { db, auth } from "../firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export async function createHousehold(name: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  // Create household with creator as admin; member linkage via Cloud Functions is recommended,
  // but for now we create the doc and let rules enforce membership.
  const ref = collection(db, "households");
  const docRef = await addDoc(ref, {
    name,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  const hid = docRef.id;
  // Add member record for creator as admin
  await setDoc(
    doc(db, `households/${hid}/members/${user.uid}`),
    {
      userId: user.uid,
      role: "admin",
      displayName: user.displayName ?? null,
      joinedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Upsert users/{uid}.householdIds
  await setDoc(
    doc(db, `users/${user.uid}`),
    {
      householdIds: arrayUnion(hid),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return hid;
}

export async function updateHouseholdSettings(
  hid: string,
  patch: { timezone?: string; digestHour?: number; escalationEnabled?: boolean },
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  // Assume rules enforce admin-only write for these fields
  await updateDoc(doc(db, "households", hid), patch as any);
}
