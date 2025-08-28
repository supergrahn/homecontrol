import * as Linking from "expo-linking";

export type ParsedInvite = { householdId: string; inviteId: string; token: string };

// Parse an invite from either a scheme deep link (homecontrol://invite?...)
// or a Firebase Dynamic Link wrapping the deep link (link= or d=).
export function parseInviteFromUrl(url: string): ParsedInvite | null {
  // If this is a dynamic link with link= or d= param, unwrap once
  try {
    const outer = new URL(url);
    const d = outer.searchParams.get("d");
    const link = outer.searchParams.get("link");
    if (d || link) {
      const inner = decodeURIComponent(d || link || "");
      const parsed = Linking.parse(inner);
      const hid = (parsed.queryParams?.hid as string) || (parsed.queryParams?.householdId as string);
      const inviteId = (parsed.queryParams?.inviteId as string) || (parsed.queryParams?.id as string);
      const token = parsed.queryParams?.token as string;
      if (hid && inviteId && token) return { householdId: hid, inviteId, token };
    }
  } catch {
    // not a URL or no wrapper, fall through
  }

  const parsed = Linking.parse(url);
  const isInvite = parsed.path?.startsWith("invite") || parsed.hostname === "invite";
  if (!isInvite) return null;
  const hid = (parsed.queryParams?.hid as string) || (parsed.queryParams?.householdId as string);
  const inviteId = (parsed.queryParams?.inviteId as string) || (parsed.queryParams?.id as string);
  const token = parsed.queryParams?.token as string;
  if (hid && inviteId && token) return { householdId: hid, inviteId, token };
  return null;
}
