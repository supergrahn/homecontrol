import dayjs from "dayjs";
import { db } from "../admin";
import { __test__ } from "../workload";
import { Timestamp } from "firebase-admin/firestore";

// Runs only when connected to Firestore emulator
const onEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

(onEmulator ? describe : describe.skip)(
  "workload heatmap parity (emulator)",
  () => {
    jest.setTimeout(30000);

    const hid = `test-hid-${Date.now()}`;
    const u1 = "userA";
    const u2 = "userB";

    beforeAll(async () => {
      // Seed members
      await Promise.all([
        db.doc(`households/${hid}/members/${u1}`).set({ role: "adult" }),
        db.doc(`households/${hid}/members/${u2}`).set({ role: "adult" }),
      ]);

      const tasks = db.collection(`households/${hid}/tasks`);
      const today = dayjs().startOf("day");

      const mkDate = (offsetDays: number, hour = 9) =>
        today.add(offsetDays, "day").hour(hour).minute(0).second(0).toDate();

      const docs: any[] = [
        // Only nextOccurrenceAt in range for u1
        {
          title: "Task 1",
          status: "open",
          assigneeIds: [u1],
          nextOccurrenceAt: mkDate(0),
        },
        // Only dueAt in range for u1
        {
          title: "Task 2",
          status: "in_progress",
          assigneeIds: [u1],
          dueAt: mkDate(1, 18),
        },
        // Both nextOccurrenceAt and dueAt same day for u2 (should count once)
        {
          title: "Task 3",
          status: "open",
          assigneeIds: [u2],
          nextOccurrenceAt: mkDate(2, 10),
          dueAt: mkDate(2, 20),
        },
        // Blocked task u1 (only appears when types includes blocked)
        {
          title: "Task 4",
          status: "blocked",
          assigneeIds: [u1],
          nextOccurrenceAt: mkDate(3, 8),
        },
        // Multi-assignee counts on both users
        {
          title: "Task 5",
          status: "open",
          assigneeIds: [u1, u2],
          dueAt: mkDate(4, 12),
        },
        // Outside of range (30+ days)
        {
          title: "Task 6",
          status: "open",
          assigneeIds: [u2],
          nextOccurrenceAt: mkDate(35, 9),
        },
      ];

      await Promise.all(
        docs.map((d) =>
          tasks.add({
            title: d.title,
            status: d.status,
            assigneeIds: d.assigneeIds,
            nextOccurrenceAt: d.nextOccurrenceAt
              ? Timestamp.fromDate(d.nextOccurrenceAt)
              : null,
            dueAt: d.dueAt ? Timestamp.fromDate(d.dueAt) : null,
            createdAt: Timestamp.fromDate(new Date()),
          })
        )
      );
    });

    afterAll(async () => {
      // Clean up (best effort)
      const tasksSnap = await db.collection(`households/${hid}/tasks`).get();
      await Promise.all(tasksSnap.docs.map((d) => d.ref.delete()));
      const membersSnap = await db
        .collection(`households/${hid}/members`)
        .get();
      await Promise.all(membersSnap.docs.map((d) => d.ref.delete()));
    });

    const combos: Array<[number, string[]]> = [
      [7, ["upcoming"]],
      [7, ["blocked"]],
      [7, ["upcoming", "blocked"]],
      [14, ["upcoming", "blocked"]],
      [30, ["upcoming"]],
    ];

    it.each(combos)(
      "parity for range %s and types %j",
      async (rangeDays, types) => {
        const base = await __test__.computeWorkloadHeatmap(
          hid,
          rangeDays,
          types
        );
        const agg = await __test__.computeWorkloadAgg(hid, rangeDays, types);
        expect(agg.days).toEqual(base.days);
        // Strict equality on cells
        expect(agg.cells).toEqual(base.cells);
      }
    );
  }
);
