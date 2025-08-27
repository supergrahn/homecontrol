import { computeNextOccurrence } from "../utils/rrule";

function d(s: string) { return new Date(s); }

describe("computeNextOccurrence BYDAY", () => {
  it("handles weekly BYDAY MO,WE,FR with prep window", async () => {
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      startAt: d("2025-03-10T08:00:00Z"), // Monday
      prepWindowHours: 1,
    }, d("2025-03-11T09:00:00Z")); // Tuesday after the Monday slot
    // Next should be Wednesday at 08:00Z
    expect(out.occurrenceAt?.toISOString()).toBe("2025-03-12T08:00:00.000Z");
    expect(out.nextOccurrenceAt?.toISOString()).toBe("2025-03-12T07:00:00.000Z");
  });

  it("handles BYDAY across DST boundary (Europe/Oslo)", async () => {
    // Europe/Oslo DST starts 2025-03-30; ensure computation selects the correct Sunday
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=WEEKLY;BYDAY=SU",
      startAt: d("2025-03-16T22:00:00Z"), // a prior Sunday 23:00 local (CET)
      prepWindowHours: 0,
    }, d("2025-03-29T23:30:00Z")); // the night before DST change
    // Next Sunday is 2025-03-30 at the same UTC hour pattern
    expect(out.occurrenceAt?.toISOString()).toBe("2025-03-30T22:00:00.000Z");
  });
});
