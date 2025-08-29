import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { RRule, rrulestr } from "rrule";

dayjs.extend(utc);
dayjs.extend(timezone);

function randomToken(len = 48) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const createCalendarShare = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Sign in");
    const { householdId, filter } = data as {
      householdId: string;
      filter?: { type: "member" | "kid"; id: string } | null;
    };
    if (!householdId)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId is required"
      );
    const member = await db
      .doc(`households/${householdId}/members/${uid}`)
      .get();
    if (!member.exists)
      throw new functions.https.HttpsError("permission-denied", "Member only");
    // Optionally include a share filter (member/kid)
    let cleanFilter: { type: "member" | "kid"; id: string } | null = null;
    if (
      filter &&
      (filter.type === "member" || filter.type === "kid") &&
      typeof filter.id === "string" &&
      filter.id
    ) {
      cleanFilter = { type: filter.type, id: filter.id };
    }
    const token = randomToken();
    const ref = db.collection(`households/${householdId}/calendarShares`).doc();
    await ref.set({
      token,
      scope: "household",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      active: true,
      filter: cleanFilter,
    });
    const url = `${functions.config().app?.host || "https://example.com"}/ics/${householdId}/${token}`;
    return { ok: true, shareId: ref.id, url };
  }
);

export const revokeCalendarShare = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Sign in");
    const { householdId, shareId } = data as {
      householdId: string;
      shareId: string;
    };
    if (!householdId || !shareId)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId and shareId are required"
      );
    const member = await db
      .doc(`households/${householdId}/members/${uid}`)
      .get();
    if (!member.exists)
      throw new functions.https.HttpsError("permission-denied", "Member only");
    await db.doc(`households/${householdId}/calendarShares/${shareId}`).set(
      {
        active: false,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: uid,
      },
      { merge: true }
    );
    return { ok: true };
  }
);

// List calendar shares (active + revoked metadata, without tokens)
export const getCalendarShares = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Sign in");
    const { householdId } = data as { householdId: string };
    if (!householdId)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId is required"
      );
    const member = await db
      .doc(`households/${householdId}/members/${uid}`)
      .get();
    if (!member.exists)
      throw new functions.https.HttpsError("permission-denied", "Member only");
    const snap = await db
      .collection(`households/${householdId}/calendarShares`)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const items = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        active: !!x.active,
        createdAt: x.createdAt ?? null,
        createdBy: x.createdBy ?? null,
        revokedAt: x.revokedAt ?? null,
        revokedBy: x.revokedBy ?? null,
        filter: x.filter ?? null,
      };
    });
    return { ok: true, items };
  }
);

// HTTP endpoint placeholder for ICS feed
export const icsFeed = functions.https.onRequest(async (req, res) => {
  try {
    const { 0: hid, 1: token } = (req.path || "").replace(/^\//, "").split("/");
    if (!hid || !token) {
      res.status(400).send("Bad request");
      return;
    }
    const shares = await db
      .collection(`households/${hid}/calendarShares`)
      .where("token", "==", token)
      .where("active", "==", true)
      .limit(1)
      .get();
    if (shares.empty) {
      res.status(404).send("Not found");
      return;
    }
    const shareDoc = shares.docs[0];
    const share = shareDoc.data() as any;
    const filter = (share?.filter || null) as {
      type: "member" | "kid";
      id: string;
    } | null;
    const h = await db.doc(`households/${hid}`).get();
    const hName = (h.data() as any)?.name || `Household ${hid}`;
    const tz = (h.data() as any)?.timezone || "UTC";

    // Window: past 14 days to next 6 months
    const now = dayjs();
    const windowStart = now.subtract(14, "day").toDate();
    const windowEnd = now.add(6, "month").toDate();

    // Fetch tasks with potential dates or rules
    const tasksRef = db.collection(`households/${hid}/tasks`);
    const statusIn = [
      "open",
      "in_progress",
      "blocked",
      "done",
      "verified",
    ] as const;
    const snap = await tasksRef.where("status", "in", statusIn as any).get();

    type Ev = {
      uid: string;
      title: string;
      start: Date;
      end?: Date | null;
      allDay?: boolean;
      url?: string;
      location?: string;
      description?: string;
    };
    const events: Ev[] = [];

    const fold = (s: string) => {
      const lines = s.split("\r\n").flatMap((x) => x.split("\n"));
      const out: string[] = [];
      for (const line of lines) {
        const bytes = Buffer.from(line, "utf8");
        if (bytes.length <= 75) {
          out.push(line);
          continue;
        }
        // fold to <=75 bytes per line, subsequent lines start with space
        let i = 0;
        while (i < bytes.length) {
          const chunk = bytes.slice(i, i + 75);
          out.push(chunk.toString("utf8"));
          i += 75;
          if (i < bytes.length)
            out[out.length - 1] = out[out.length - 1] + "\r\n ";
        }
      }
      return out.join("");
    };
    const escText = (s: string) =>
      String(s || "")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");

    const fmtLocal = (d: Date) => dayjs(d).tz(tz).format("YYYYMMDDTHHmmss");
    const fmtUtc = (d: Date) => dayjs(d).utc().format("YYYYMMDDTHHmmss[Z]");

    const expandTask = (id: string, t: any) => {
      const title = String(t.title || id);
      const startAt: Date | null = t.startAt?.toDate
        ? t.startAt.toDate()
        : t.startAt || null;
      const dueAt: Date | null = t.dueAt?.toDate
        ? t.dueAt.toDate()
        : t.dueAt || null;
      const durationMin = Math.max(0, Number(t.durationMinutes || 0));
      const baseStart = startAt || dueAt;
      const baseEnd = (() => {
        if (!baseStart) return null;
        if (durationMin > 0)
          return new Date((baseStart as Date).getTime() + durationMin * 60000);
        if (dueAt && startAt && dueAt > startAt) return dueAt;
        return null;
      })();
      const rruleStr: string | null = t.rrule || null;
      const skipDates: string[] = Array.isArray(t.skipDates) ? t.skipDates : [];
      const shifts: Record<string, number> = (t.exceptionShifts || {}) as any;
      const visibleStatus = [
        "open",
        "in_progress",
        "blocked",
        "done",
        "verified",
      ];
      if (!visibleStatus.includes(t.status)) return;
      // Filter by member/kid if requested
      if (filter) {
        if (filter.type === "member") {
          const assignees: string[] = Array.isArray(t.assigneeIds)
            ? t.assigneeIds
            : [];
          if (!assignees.includes(filter.id)) return;
        } else if (filter.type === "kid") {
          const kids: string[] = Array.isArray(t.childIds) ? t.childIds : [];
          if (!kids.includes(filter.id)) return;
        }
      }
      // If no rrule, single instance only if within window
      if (!rruleStr) {
        if (!baseStart) return;
        const occurs = baseStart >= windowStart && baseStart <= windowEnd;
        if (!occurs) return;
        events.push({
          uid: `${hid}-${id}`,
          title,
          start: baseStart,
          end: baseEnd,
        });
        return;
      }
      // Expand rrule within window. Accept both RRULE:… syntax and plain FREQ=…
      try {
        const dtstart = baseStart || windowStart;
        const hasSetSyntax = /(^|\n)EXDATE:|(^|\n)RDATE:|(^|\n)RRULE:/i.test(
          rruleStr
        );
        let iter: any;
        if (hasSetSyntax) {
          iter = rrulestr(rruleStr, { dtstart, forceset: true }) as any;
          const list: Date[] = iter.between(windowStart, windowEnd, true) || [];
          for (const occ of list) {
            const dayKey = dayjs(occ).tz(tz).format("YYYY-MM-DD");
            if (skipDates.includes(dayKey)) continue;
            const shift = shifts?.[dayKey];
            const start = shift ? new Date(occ.getTime() + shift * 60000) : occ;
            const end = baseEnd
              ? new Date(
                  (start as Date).getTime() +
                    (baseEnd.getTime() - (baseStart as Date).getTime())
                )
              : null;
            events.push({ uid: `${hid}-${id}-${dayKey}`, title, start, end });
            if (events.length > 500) break;
          }
        } else {
          const opts = RRule.parseString(rruleStr);
          if (!opts.dtstart) opts.dtstart = dtstart;
          const rule = new RRule(opts);
          const list = rule.between(windowStart, windowEnd, true) || [];
          for (const occ of list) {
            const dayKey = dayjs(occ).tz(tz).format("YYYY-MM-DD");
            if (skipDates.includes(dayKey)) continue;
            const shift = shifts?.[dayKey];
            const start = shift ? new Date(occ.getTime() + shift * 60000) : occ;
            const end = baseEnd
              ? new Date(
                  (start as Date).getTime() +
                    (baseEnd.getTime() - (baseStart as Date).getTime())
                )
              : null;
            events.push({ uid: `${hid}-${id}-${dayKey}`, title, start, end });
            if (events.length > 500) break;
          }
        }
      } catch {
        // Fallback: single instance if baseStart in window
        if (baseStart && baseStart >= windowStart && baseStart <= windowEnd) {
          events.push({
            uid: `${hid}-${id}`,
            title,
            start: baseStart,
            end: baseEnd,
          });
        }
      }
    };

    for (const d of snap.docs) {
      expandTask(d.id, d.data());
      if (events.length > 1000) break; // hard cap
    }

    // Build ICS text with caching
    const gen = dayjs().toISOString();
    const lines: string[] = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//HomeControl//Calendar//EN");
    lines.push(`X-WR-TIMEZONE:${tz}`);
    const calName = filter
      ? filter.type === "member"
        ? `${hName} — Member`
        : `${hName} — Kid`
      : hName;
    lines.push(`X-WR-CALNAME:${calName}`);
    lines.push(`X-Generated:${gen}`);
    for (const ev of events) {
      const dtstamp = fmtUtc(new Date());
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.uid}@homecontrol`);
      lines.push(`DTSTAMP:${dtstamp}`);
      // Use local time with TZID to avoid UTC shifting in subscribers
      lines.push(`DTSTART;TZID=${tz}:${fmtLocal(ev.start)}`);
      if (ev.end) lines.push(`DTEND;TZID=${tz}:${fmtLocal(ev.end)}`);
      lines.push(fold(`SUMMARY:${escText(ev.title)}`));
      if (ev.location) lines.push(fold(`LOCATION:${escText(ev.location)}`));
      if (ev.description)
        lines.push(fold(`DESCRIPTION:${escText(ev.description)}`));
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");

    const body = lines.join("\r\n");
    // ETag / If-None-Match
    const crypto = await import("node:crypto");
    const etag =
      'W/"' + crypto.createHash("sha1").update(body).digest("hex") + '"';
    const inm = req.header("if-none-match");
    if (inm && inm === etag) {
      res.status(304);
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    res.setHeader("ETag", etag);
    res.status(200).send(body);
  } catch (e) {
    res.status(500).send("Server error");
  }
});
