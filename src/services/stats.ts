import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../firebase";

export type FairnessUser = {
  userId: string;
  displayName?: string | null;
  role?: string | null;
  completed: number;
  assigned: number;
  expected: number;
  delta: number;
};

export type FairnessStats = {
  range: { start: any; end: any };
  totals: { completed: number; assigned: number };
  users: FairnessUser[];
};

export async function getFairnessStats(hid: string): Promise<FairnessStats> {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "getFairnessStats");
  const res = await fn({ householdId: hid });
  return res.data as FairnessStats;
}
