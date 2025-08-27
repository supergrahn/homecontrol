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

  let occurrence: Date | null = null;
  if (input.rrule) {
    try {
  const base = startAt ?? dueAt ?? now;
  // Prefer constructing a concrete RRule to ensure dtstart is honored
  const opts = RRule.parseString(input.rrule);
  // Only set dtstart if not already specified in the string
  if (!opts.dtstart) opts.dtstart = base;
  const rule = new RRule(opts);
  const occ = rule.after(now, true);
  occurrence = occ ? occ : null;
    } catch {
      occurrence = dueAt ?? startAt ?? null;
    }
  } else {
    occurrence = startAt ?? dueAt ?? null;
  }

  const next = (() => {
    if (!occurrence) return null;
    if (!prepHours || isNaN(prepHours) || prepHours <= 0) return occurrence;
    return new Date(occurrence.getTime() - prepHours * 3600 * 1000);
  })();
  return { occurrenceAt: occurrence, nextOccurrenceAt: next };
}
