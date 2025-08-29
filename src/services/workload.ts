import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../firebase";

export type Heatmap = {
  days: string[]; // YYYY-MM-DD
  users: string[]; // userIds
  cells: Record<string, number>; // key `${day}|${uid}` -> count
};

export type HeatmapOptions = {
  rangeDays?: 7 | 14 | 30;
  types?: ("blocked" | "upcoming")[];
};

export async function getWorkloadHeatmap(
  hid: string,
  opts?: HeatmapOptions
): Promise<Heatmap> {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "getWorkloadHeatmap");
  const res = await fn({
    householdId: hid,
    rangeDays: opts?.rangeDays,
    types: opts?.types,
  });
  return res.data as Heatmap;
}
