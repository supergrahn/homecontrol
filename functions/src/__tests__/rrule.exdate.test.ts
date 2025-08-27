import { computeNextOccurrence } from "../utils/rrule";

function d(s: string) { return new Date(s); }

describe("computeNextOccurrence EXDATE", () => {
  it("skips excluded date", async () => {
    const rule = [
      "DTSTART:20250310T080000Z",
      "RRULE:FREQ=DAILY;COUNT=3",
      "EXDATE:20250311T080000Z",
    ].join("\n");
    const out = await computeNextOccurrence("Europe/Oslo", {
      rrule: rule,
      startAt: d("2025-03-10T08:00:00Z"),
      prepWindowHours: 0,
    }, d("2025-03-10T09:00:00Z"));
    // Next should skip 11th and pick 12th
    expect(out.occurrenceAt?.toISOString()).toBe("2025-03-12T08:00:00.000Z");
  });
});
