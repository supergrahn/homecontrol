import { getFunctions, httpsCallable } from "firebase/functions";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  orderBy,
  where,
  query,
  getDoc,
  doc,
} from "firebase/firestore";

dayjs.extend(utc);
dayjs.extend(timezone);

type Sections = { overdue?: boolean; upcoming?: boolean; wins?: boolean };

function toDate(v: any): Date | null {
  return v?.toDate ? v.toDate() : (v ?? null);
}

export async function maybeShowMorningBrief(hid: string): Promise<void> {
  const todayKey = dayjs().format("YYYY-MM-DD");
  const shownKey = `@hc:morningBrief:${hid}:${todayKey}`;
  const already = await AsyncStorage.getItem(shownKey);
  if (already) return;
  // Load household timezone
  const hSnap = await getDoc(doc(db, `households/${hid}`));
  const hTz = (hSnap.data() as any)?.timezone || "UTC";
  // Load user digest prefs
  let sections: Sections = { overdue: true, upcoming: true, wins: false };
  let sched: any = null;
  try {
    const fn = httpsCallable(getFunctions(), "getDigestPreferences");
    const res: any = await fn({ householdId: hid });
    const p = res?.data?.prefs || {};
    if (p.sections) sections = { ...sections, ...p.sections };
    if (p.schedule) sched = p.schedule;
  } catch {}
  // Check schedule window: same hour match and day-of-week, else default morning window 06:00-10:59
  const nowTz = dayjs().tz(hTz);
  let allowed = false;
  if (sched?.time) {
    const hhmm = String(sched.time);
    const [h, m] = hhmm.split(":").map((n: string) => parseInt(n, 10));
    const days: number[] = Array.isArray(sched?.daysOfWeek)
      ? sched.daysOfWeek
      : [1, 2, 3, 4, 5, 6, 7];
    const dow1to7 = ((nowTz.day() + 6) % 7) + 1; // 1=Mon..7=Sun
    if (days.includes(dow1to7) && nowTz.hour() === h) allowed = true;
  } else {
    const hour = nowTz.hour();
    if (hour >= 6 && hour <= 10) allowed = true;
  }
  if (!allowed) return;

  // Compute counts similar to backend digest
  const start = nowTz.startOf("day").toDate();
  const end = nowTz.endOf("day").toDate();
  const now = nowTz.toDate();
  const tasksRef = collection(db, `households/${hid}/tasks`);
  const statusIn = ["open", "in_progress", "blocked"] as const;
  const q1 = query(
    tasksRef,
    where("status", "in", statusIn as any),
    where("nextOccurrenceAt", ">=", start),
    where("nextOccurrenceAt", "<=", end),
    orderBy("nextOccurrenceAt", "asc")
  );
  const q2 = query(
    tasksRef,
    where("status", "in", statusIn as any),
    where("dueAt", ">=", start),
    where("dueAt", "<=", end),
    orderBy("dueAt", "asc")
  );
  const q3 = query(
    tasksRef,
    where("status", "in", statusIn as any),
    where("dueAt", "<", now),
    orderBy("dueAt", "asc")
  );
  const [s1, s2, s3] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
    getDocs(q3),
  ]);
  const dedup: Record<string, any> = {};
  s1.docs.forEach((d) => (dedup[d.id] = d));
  s2.docs.forEach((d) => (dedup[d.id] = d));
  const todayTasks = Object.values(dedup);
  const overdueTasks = s3.docs.filter(
    (d) => !todayTasks.find((t: any) => t.id === d.id)
  );
  const counts = {
    today: sections.upcoming === false ? 0 : todayTasks.length,
    overdue: sections.overdue === false ? 0 : overdueTasks.length,
  };

  // Don’t show if nothing to report
  if ((counts.today || 0) + (counts.overdue || 0) <= 0) {
    await AsyncStorage.setItem(shownKey, "1");
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Morning brief",
        body: `Today ${counts.today} · Overdue ${counts.overdue}`,
        data: { type: "digest.morning", hid, counts },
      },
      trigger: null,
    });
    await AsyncStorage.setItem(shownKey, "1");
  } catch {
    // ignore
  }
}
