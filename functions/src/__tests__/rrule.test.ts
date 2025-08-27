import { computeNextOccurrence } from "../utils/rrule";

function d(s: string) {
  return new Date(s);
}

describe("computeNextOccurrence", () => {
  it("handles non-recurring with prep window", async () => {
    const out = await computeNextOccurrence("Europe/Oslo", {
      startAt: d("2025-03-15T18:00:00Z"),
      prepWindowHours: 2,
    }, d("2025-03-15T10:00:00Z"));
    expect(out.occurrenceAt?.toISOString()).toBe("2025-03-15T18:00:00.000Z");
    expect(out.nextOccurrenceAt?.toISOString()).toBe("2025-03-15T16:00:00.000Z");
  });

  it("handles RRULE COUNT with DTSTART and prep window", async () => {
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=DAILY;COUNT=3",
      startAt: d("2025-03-10T08:00:00Z"),
      prepWindowHours: 1,
    }, d("2025-03-11T07:00:00Z"));
    // Next occurrence should be 2025-03-11T08:00Z
    expect(out.occurrenceAt?.toISOString()).toBe("2025-03-11T08:00:00.000Z");
    expect(out.nextOccurrenceAt?.toISOString()).toBe("2025-03-11T07:00:00.000Z");
  });

  it("handles DST boundary (Europe/Oslo)", async () => {
    // Europe/Oslo DST starts 2025-03-30 01:00 UTC -> 02:00 local; we ensure computation doesn't crash
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=DAILY;COUNT=2",
      startAt: d("2025-03-29T22:00:00Z"), // 23:00 local pre-DST
      prepWindowHours: 0,
    }, d("2025-03-29T23:30:00Z"));
    expect(out.occurrenceAt).toBeTruthy();
  });
});
