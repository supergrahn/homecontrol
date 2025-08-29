import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../firebase";

export async function createCalendarShare(
  hid: string,
  filter?: { type: "member" | "kid"; id: string } | null
): Promise<{ shareId: string; url: string }> {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "createCalendarShare");
  const res: any = await fn({ householdId: hid, filter: filter ?? null });
  return { shareId: String(res.data.shareId), url: String(res.data.url) };
}

export async function revokeCalendarShare(
  hid: string,
  shareId: string
): Promise<void> {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "revokeCalendarShare");
  await fn({ householdId: hid, shareId });
}

export type CalendarShare = {
  id: string;
  active: boolean;
  createdAt?: any;
  createdBy?: string | null;
  revokedAt?: any;
  revokedBy?: string | null;
  filter?: { type: "member" | "kid"; id: string } | null;
};

export async function listCalendarShares(
  hid: string
): Promise<CalendarShare[]> {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, "getCalendarShares");
  const res: any = await fn({ householdId: hid });
  return Array.isArray(res?.data?.items)
    ? (res.data.items as CalendarShare[])
    : [];
}
