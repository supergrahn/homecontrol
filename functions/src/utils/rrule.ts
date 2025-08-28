import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { RRule, rrulestr } from "rrule";

dayjs.extend(utc);
dayjs.extend(timezone);

export type RecurrenceInput = {
  rrule?: string | null;
  startAt?: Date | null;
  dueAt?: Date | null;
  prepWindowHours?: number | null;
  pausedUntil?: Date | null;
  skipDates?: string[];
  exceptionShifts?: Record<string, number>; // key YYYY-MM-DD in household tz -> minutes to shift occurrence
};

export type RecurrenceOutput = {
  occurrenceAt: Date | null; // actual event time (UTC)
  nextOccurrenceAt: Date | null; // display/notify time after prep window (UTC)
};

export async function computeNextOccurrence(
  householdTz: string,
  input: RecurrenceInput,
  now: Date = new Date(),
): Promise<RecurrenceOutput> {
  const tz = householdTz || "UTC";
  const startAt = input.startAt ?? null;
  const dueAt = input.dueAt ?? null;
  const prepHours = Number(input.prepWindowHours ?? 0);
  const pausedUntil = input.pausedUntil ?? null;
  const skipDates = Array.isArray(input.skipDates) ? input.skipDates : [];
  const shifts = (input.exceptionShifts ?? {}) as Record<string, number>;
  // Helper to compute the next candidate occurrence >= cursor
  const nextCandidate = (cursor: Date): Date | null => {
    if (input.rrule) {
      try {
        const base = startAt ?? dueAt ?? now;
        const hasSetSyntax = /(^|\n)EXDATE:|(^|\n)RDATE:|(^|\n)RRULE:/i.test(
          input.rrule as string,
        );
        if (hasSetSyntax) {
          const set = rrulestr(input.rrule as string, { dtstart: base, forceset: true });
          const occ = (set as any).after?.(cursor, true);
          return occ ? new Date(occ) : null;
        } else {
          const opts = RRule.parseString(input.rrule as string);
          if (!opts.dtstart) opts.dtstart = base;
          const rule = new RRule(opts);
          const occ = rule.after(cursor, true);
          return occ ? occ : null;
        }
      } catch {
        // fall back to single date semantics on parse error
        const single = startAt ?? dueAt ?? null;
        if (!single) return null;
        return single >= cursor ? single : null;
      }
    } else {
      const single = startAt ?? dueAt ?? null;
      if (!single) return null;
      return single >= cursor ? single : null;
    }
  };

  let cursor = now;
  let occurrence: Date | null = null;
  for (let i = 0; i < 50; i++) {
    const cand = nextCandidate(cursor);
    if (!cand) {
      occurrence = null;
      break;
    }
    const dayKey = dayjs(cand).tz(tz).format("YYYY-MM-DD");
    // If pausedUntil is set and this candidate falls before the pause ends, advance cursor
    if (pausedUntil) {
      const pauseEndDay = dayjs(pausedUntil).tz(tz);
      if (dayjs(cand).tz(tz).isBefore(pauseEndDay, "day")) {
        cursor = pauseEndDay.endOf("day").add(1, "minute").toDate();
        continue;
      }
    }
    // Skip specific day keys
    if (skipDates.includes(dayKey)) {
      cursor = dayjs(cand).tz(tz).endOf("day").add(1, "minute").toDate();
      continue;
    }
    // Found usable occurrence
    occurrence = cand;
    // Apply per-instance shift if present
    const shiftMin = shifts[dayKey];
    if (typeof shiftMin === "number" && !isNaN(shiftMin) && shiftMin !== 0) {
      occurrence = new Date(occurrence.getTime() + shiftMin * 60 * 1000);
    }
    break;
  }

  const next = (() => {
    if (!occurrence) return null;
    if (!prepHours || isNaN(prepHours) || prepHours <= 0) return occurrence;
    return new Date(occurrence.getTime() - prepHours * 3600 * 1000);
  })();
  return { occurrenceAt: occurrence, nextOccurrenceAt: next };
}
