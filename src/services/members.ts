import { db, auth } from '../firebase';
import { arrayRemove, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

export async function leaveHousehold(hid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  await deleteDoc(doc(db, `households/${hid}/members/${user.uid}`));
  await setDoc(doc(db, `users/${user.uid}`), {
    householdIds: arrayRemove(hid),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteHousehold(hid: string) {
  // NOTE: This only deletes the household root doc; subcollections would remain.
  // In production, perform recursive delete via Cloud Functions.
  await deleteDoc(doc(db, `households/${hid}`));
}
