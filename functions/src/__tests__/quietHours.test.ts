import { isWithinQuietHours, nextAllowedTime } from "../notifications";

function d(s: string) {
  return new Date(s);
}

describe("quiet hours helpers", () => {
  it("handles overnight window (22:00-07:00)", () => {
    const quiet = { start: "22:00", end: "07:00", tz: "Europe/Oslo" } as const;
    // 23:30 local on 2025-03-10 -> UTC 22:30 (CET +01)
    const now = d("2025-03-10T22:30:00Z");
    expect(isWithinQuietHours(now, quiet, "UTC")).toBe(true);
    const next = nextAllowedTime(now, quiet, "UTC");
    // Should be 07:00 local on 2025-03-11 -> 06:00Z (CET +01 before DST starts on 30th)
    expect(next.toISOString()).toBe("2025-03-11T06:00:00.000Z");
  });

  it("handles early morning still in overnight quiet", () => {
    const quiet = { start: "22:00", end: "07:00", tz: "Europe/Oslo" } as const;
    // 06:30 local -> 05:30Z (CET)
    const now = d("2025-03-11T05:30:00Z");
    expect(isWithinQuietHours(now, quiet, "UTC")).toBe(true);
    const next = nextAllowedTime(now, quiet, "UTC");
    expect(next.toISOString()).toBe("2025-03-11T06:00:00.000Z");
  });

  it("handles same-day window (09:00-17:00)", () => {
    const quiet = { start: "09:00", end: "17:00", tz: "Europe/Oslo" } as const;
    // 10:00 local -> 09:00Z (CET)
    const now = d("2025-03-10T09:00:00Z");
    expect(isWithinQuietHours(now, quiet, "UTC")).toBe(true);
    const next = nextAllowedTime(now, quiet, "UTC");
    // End 17:00 local -> 16:00Z
    expect(next.toISOString()).toBe("2025-03-10T16:00:00.000Z");
  });

  it("returns now when outside quiet hours", () => {
    const quiet = { start: "22:00", end: "07:00", tz: "Europe/Oslo" } as const;
    // 12:00 local -> 11:00Z
    const now = d("2025-03-10T11:00:00Z");
    expect(isWithinQuietHours(now, quiet, "UTC")).toBe(false);
    const next = nextAllowedTime(now, quiet, "UTC");
    expect(next.toISOString()).toBe(now.toISOString());
  });
});
