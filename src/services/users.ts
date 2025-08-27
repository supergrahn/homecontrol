import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export type QuietHours = { start: string; end: string; tz?: string };

export type UserSettings = {
  quietHours?: QuietHours;
  notificationsEnabled?: boolean;
};

export async function getUserSettings(): Promise<UserSettings> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return (snap.exists() ? (snap.data() as any) : {}) as UserSettings;
}

export async function updateUserSettings(patch: UserSettings): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ref = doc(db, "users", uid);
  await setDoc(ref, patch, { merge: true });
}
