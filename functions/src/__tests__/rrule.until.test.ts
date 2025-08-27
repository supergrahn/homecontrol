import { computeNextOccurrence } from "../utils/rrule";

function d(s: string) { return new Date(s); }

describe("computeNextOccurrence UNTIL", () => {
  it("stops at UNTIL", async () => {
    const out1 = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=DAILY;UNTIL=20250312T080000Z",
      startAt: d("2025-03-10T08:00:00Z"),
      prepWindowHours: 0,
    }, d("2025-03-11T07:00:00Z"));
    expect(out1.occurrenceAt?.toISOString()).toBe("2025-03-11T08:00:00.000Z");

    const out2 = await computeNextOccurrence("Europe/Oslo", {
      rrule: "FREQ=DAILY;UNTIL=20250312T080000Z",
      startAt: d("2025-03-10T08:00:00Z"),
      prepWindowHours: 0,
    }, d("2025-03-12T08:00:01Z"));
    // after UNTIL, no future occurrences
    expect(out2.occurrenceAt).toBeNull();
  });
});
