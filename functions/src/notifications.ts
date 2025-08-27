import * as admin from 'firebase-admin';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Expo } from 'expo-server-sdk';

dayjs.extend(utc);
dayjs.extend(timezone);

const expo = new Expo();

export type QuietHours = { start: string; end: string; tz?: string } | undefined;

export function isWithinQuietHours(now: Date, quiet: QuietHours, tzFallback: string): boolean {
  if (!quiet) return false;
  const tz = quiet.tz || tzFallback || 'UTC';
  const nowTz = dayjs(now).tz(tz);
  const [sH, sM] = quiet.start.split(':').map(Number);
  const [eH, eM] = quiet.end.split(':').map(Number);
  const start = nowTz.hour(sH).minute(sM).second(0).millisecond(0);
  const endSameDay = nowTz.hour(eH).minute(eM).second(0).millisecond(0);
  // overnight window if start >= end
  if (sH > eH || (sH === eH && sM >= eM)) {
    // Quiet from start today -> end tomorrow
    const startWindow = start;
    const endWindow = endSameDay.add(1, 'day');
    return nowTz.isAfter(startWindow) || nowTz.isBefore(endSameDay);
  } else {
    // Same-day window
    return nowTz.isAfter(start) && nowTz.isBefore(endSameDay);
  }
}

export function nextAllowedTime(now: Date, quiet: QuietHours, tzFallback: string): Date {
  if (!quiet) return now;
  const tz = quiet.tz || tzFallback || 'UTC';
  const nowTz = dayjs(now).tz(tz);
  const [sH, sM] = quiet.start.split(':').map(Number);
  const [eH, eM] = quiet.end.split(':').map(Number);
  const start = nowTz.hour(sH).minute(sM).second(0).millisecond(0);
  const endSameDay = nowTz.hour(eH).minute(eM).second(0).millisecond(0);
  const overnight = sH > eH || (sH === eH && sM >= eM);
  if (overnight) {
    // Quiet from start -> end next day
    if (nowTz.isBefore(endSameDay)) {
      // Still in the early-morning quiet segment; allow at endSameDay today
      return endSameDay.toDate();
    }
    if (nowTz.isAfter(start)) {
      // In evening quiet segment; allow at endSameDay tomorrow
      return endSameDay.add(1, 'day').toDate();
    }
    // Outside quiet; allow now
    return now;
  } else {
    // Same-day window
    if (nowTz.isBefore(start) || nowTz.isAfter(endSameDay)) return now;
    return endSameDay.toDate();
  }
}

type PushMessage = {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
};

export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  const chunks: any[] = [];
  for (const msg of messages) {
    const valids = msg.to.filter(Expo.isExpoPushToken);
    if (valids.length === 0) continue;
    const payloads = valids.map((token) => ({ to: token, title: msg.title, body: msg.body, data: msg.data }));
    chunks.push(...expo.chunkPushNotifications(payloads));
  }
  for (const chunk of chunks) {
    try { await expo.sendPushNotificationsAsync(chunk as any); }
    catch (e) { console.warn('[push] send chunk failed', e); }
  }
}

export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}
