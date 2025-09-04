import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export type KidDayInfo = {
  date: string; // YYYY-MM-DD
  data: any;
};

export type KidWeekInfo = {
  weekStart: string; // YYYY-MM-DD (start of week)
  data: any;
};

const dayKey = (hid: string, kidId: string) =>
  `@hc:kidinfo:${hid}:${kidId}:day`;
const weekKey = (hid: string, kidId: string) =>
  `@hc:kidinfo:${hid}:${kidId}:week`;

function isFreshDay(info: KidDayInfo | null): boolean {
  if (!info || !info.date) return false;
  return info.date === dayjs().format("YYYY-MM-DD");
}

function isFreshWeek(info: KidWeekInfo | null): boolean {
  if (!info || !info.weekStart) return false;
  const start = dayjs().startOf("week").format("YYYY-MM-DD");
  return info.weekStart === start;
}

export async function getLocalKidDayWeek(
  hid: string,
  kidId: string
): Promise<{ day: KidDayInfo | null; week: KidWeekInfo | null }> {
  try {
    const [dRaw, wRaw] = await Promise.all([
      AsyncStorage.getItem(dayKey(hid, kidId)),
      AsyncStorage.getItem(weekKey(hid, kidId)),
    ]);
    const day = dRaw ? (JSON.parse(dRaw) as KidDayInfo) : null;
    const week = wRaw ? (JSON.parse(wRaw) as KidWeekInfo) : null;
    return {
      day: day && isFreshDay(day) ? day : null,
      week: week && isFreshWeek(week) ? week : null,
    };
  } catch {
    return { day: null, week: null };
  }
}

export async function getFirestoreKidDayWeek(
  hid: string,
  kidId: string
): Promise<{ day: KidDayInfo | null; week: KidWeekInfo | null }> {
  try {
    // Expect a single document with day/week blobs
    const ref = doc(
      db,
      `households/${hid}/children/${kidId}/schoolInfo/current`
    );
    const snap = await getDoc(ref);
    if (!snap.exists()) return { day: null, week: null };
    const data = snap.data() as any;
    const day: KidDayInfo | null = data?.day || null;
    const week: KidWeekInfo | null = data?.week || null;
    return {
      day: day && isFreshDay(day) ? day : null,
      week: week && isFreshWeek(week) ? week : null,
    };
  } catch {
    return { day: null, week: null };
  }
}

export async function loadKidDayWeek(
  hid: string,
  kidId: string
): Promise<{ day: KidDayInfo | null; week: KidWeekInfo | null }> {
  const local = await getLocalKidDayWeek(hid, kidId);
  const needDay = !local.day;
  const needWeek = !local.week;
  if (!needDay && !needWeek) return local;
  const remote = await getFirestoreKidDayWeek(hid, kidId);
  return {
    day: local.day || remote.day,
    week: local.week || remote.week,
  };
}

export async function saveKidDayWeekLocal(
  hid: string,
  kidId: string,
  day?: KidDayInfo | null,
  week?: KidWeekInfo | null
): Promise<void> {
  const ops: Array<Promise<void>> = [];
  if (day && day.date) {
    ops.push(AsyncStorage.setItem(dayKey(hid, kidId), JSON.stringify(day)));
  }
  if (week && week.weekStart) {
    ops.push(AsyncStorage.setItem(weekKey(hid, kidId), JSON.stringify(week)));
  }
  await Promise.all(ops);
}
