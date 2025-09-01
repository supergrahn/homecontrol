import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

/**
 * Updates the current user's display name in Firebase Auth and mirrors it in users/{uid}.
 */
export async function setUserDisplayName(name: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const trimmed = name.trim();
  if (!trimmed) return;

  // Update Firebase Auth profile
  await updateProfile(user, { displayName: trimmed });

  // Mirror to users collection
  await setDoc(
    doc(db, `users/${user.uid}`),
    { displayName: trimmed, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
