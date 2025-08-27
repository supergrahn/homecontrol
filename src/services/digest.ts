import {
  collection,
  getDocs,
  orderBy,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export type DailyDigest = {
  id: string;
  date: string;
  tz: string;
  counts: { today: number; overdue: number };
  at?: Date | null;
};

export async function fetchLatestDigest(
  hid: string,
): Promise<DailyDigest | null> {
  const ref = collection(db, `households/${hid}/activity`);
  const q = query(
    ref,
    where("action", "==", "digest.daily"),
    orderBy("at", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data: any = d.data();
  const toDate = (v: any) => (v && v.toDate ? v.toDate() : (v ?? null));
  return {
    id: d.id,
    date: data?.payload?.date ?? "",
    tz: data?.payload?.tz ?? "UTC",
    counts: {
      today: Number(data?.payload?.counts?.today ?? 0),
      overdue: Number(data?.payload?.counts?.overdue ?? 0),
    },
    at: toDate(data.at),
  };
}
