import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export type Activity = {
  id: string;
  actorId: string | null;
  action: string;
  taskId: string | null;
  payload?: any;
  at?: Date | null;
};

export async function fetchRecentActivity(hid: string): Promise<Activity[]> {
  const ref = collection(db, `households/${hid}/activity`);
  const q = query(ref, orderBy("at", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data: any = d.data();
    const toDate = (v: any) => (v && v.toDate ? v.toDate() : (v ?? null));
    return {
      id: d.id,
      actorId: data.actorId ?? null,
      action: data.action,
      taskId: data.taskId ?? null,
      payload: data.payload,
      at: toDate(data.at),
    } as Activity;
  });
}
