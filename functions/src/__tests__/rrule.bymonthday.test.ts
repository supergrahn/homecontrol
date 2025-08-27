import { computeNextOccurrence } from "../utils/rrule";

function d(s: string) { return new Date(s); }

describe("computeNextOccurrence BYMONTHDAY", () => {
  it("handles monthly on the 15th with prep window", async () => {
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=MONTHLY;BYMONTHDAY=15",
      startAt: d("2025-03-15T08:00:00Z"),
      prepWindowHours: 2,
    }, d("2025-03-15T09:00:00Z"));
    expect(out.occurrenceAt?.toISOString()).toBe("2025-04-15T08:00:00.000Z");
    expect(out.nextOccurrenceAt?.toISOString()).toBe("2025-04-15T06:00:00.000Z");
  });
});
