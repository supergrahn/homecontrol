import * as functions from "firebase-functions";
import { admin, db } from "./admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { computeNextOccurrence } from "./utils/rrule";
import {
  isWithinQuietHours,
  nextAllowedTime,
  sendExpoPush,
  enqueueExpoPush,
} from "./notifications";

dayjs.extend(utc);
dayjs.extend(timezone);

export const onHouseholdCreate = functions.firestore
  .document("households/{hid}")
  .onCreate(
    async (
      snap: functions.firestore.DocumentSnapshot,
      ctx: functions.EventContext
    ) => {
      const { createdBy } = snap.data() as any;
      if (!createdBy) return;
      const fv: any = (admin.firestore as any)?.FieldValue ?? {};
      const joinedAt =
        typeof fv.serverTimestamp === "function"
          ? fv.serverTimestamp()
          : new Date();
      const unionHid =
        typeof fv.arrayUnion === "function"
          ? fv.arrayUnion(ctx.params.hid)
          : [ctx.params.hid];

      await db.doc(`households/${ctx.params.hid}/members/${createdBy}`).set(
        {
          userId: createdBy,
          role: "admin",
          joinedAt,
        },
        { merge: true }
      );

      await db.doc(`users/${createdBy}`).set(
        {
          householdIds: unionHid,
        },
        { merge: true }
      );
    }
  );

/**
 * Recompute nextOccurrenceAt whenever a task is created/updated.
 * For MVP, a very simple heuristic:
 * - if rrule present & startAt present -> nextOccurrenceAt = startAt (or next future occurrence, TBA)
 * - else if dueAt present -> nextOccurrenceAt = dueAt
 * - else -> null
 * You can expand with full RRULE parsing (rrule package) in a later revision of this function.
 */
export const onTaskWrite = functions.firestore
  .document("households/{hid}/tasks/{taskId}")
  .onWrite(async (change, ctx) => {
    const after = change.after.exists ? (change.after.data() as any) : null;
    const before = change.before.exists ? (change.before.data() as any) : null;
    const hid = ctx.params.hid as string;
    const taskId = ctx.params.taskId as string;
    if (!after) return;

    const startAt = asDate(after.startAt);
    const dueAt = asDate(after.dueAt);
    const prepHours = Number(after?.prepWindowHours ?? 0);

    const tz = await getHouseholdTimezone(hid);
    const { occurrenceAt, nextOccurrenceAt } = await computeNextOccurrence(tz, {
      rrule: after?.rrule ?? null,
      startAt,
      dueAt,
      prepWindowHours: prepHours,
      pausedUntil: asDate(after?.pausedUntil) ?? null,
      skipDates: Array.isArray(after?.skipDates) ? after.skipDates : [],
      exceptionShifts: after?.exceptionShifts ?? {},
    });

    // Dependencies: block if any unresolved
    try {
      const deps: string[] = Array.isArray(after?.dependsOn)
        ? after.dependsOn
        : [];
      if (deps.length) {
        // Prevent self-dependency and normalize
        const filtered = deps.filter((d) => d && d !== taskId);
        if (filtered.length !== deps.length) {
          await change.after.ref.update({ dependsOn: filtered });
        }
        const toCheck = filtered;
        if (!toCheck.length) return;
        const depRefs = toCheck.map((id) =>
          db.doc(`households/${hid}/tasks/${id}`)
        );
        const depSnaps = await db.getAll(...depRefs);
        const unresolved = depSnaps.some((s: any) => {
          const st: string = (s.data() as any)?.status || "open";
          return st !== "done" && st !== "verified";
        });
        // Simple 2-node cycle detect: if any dependency depends back on this task, ignore block
        const cycle = depSnaps.some((s: any) => {
          const data = s.data() as any;
          const arr: string[] = Array.isArray(data?.dependsOn)
            ? data.dependsOn
            : [];
          return arr.includes(taskId);
        });
        const currentStatus: string = after?.status || "open";
        if (unresolved && !cycle) {
          const prevNext = asDate(after?.nextOccurrenceAt);
          const needsNextClear = !!prevNext;
          if (currentStatus !== "blocked" || needsNextClear) {
            await change.after.ref.update({
              status: "blocked",
              nextOccurrenceAt: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          return; // stop further processing while blocked
        } else if (currentStatus === "blocked") {
          await change.after.ref.update({
            status: "open",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (e) {
      console.warn("[tasks.onWrite] dependency check failed", e);
    }

    // Update nextOccurrenceAt if changed
    let showAt = nextOccurrenceAt;
    const prevNext = asDate(after.nextOccurrenceAt);
    if ((prevNext?.getTime() || 0) !== (showAt?.getTime() || 0)) {
      await change.after.ref.update({
        nextOccurrenceAt: showAt
          ? admin.firestore.Timestamp.fromDate(showAt)
          : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Auto-reschedule policy: if task is open, has no RRULE, and dueAt is in the past,
    // shift to the next future slot (today at the original time if still ahead, otherwise tomorrow) in household TZ.
    try {
      const now = new Date();
      const statusNow: string = (after?.status as string) || "open";
      const hasRule = !!after?.rrule;
      const wasBlocked = before?.status === "blocked" && statusNow === "open";
      const disabled = !!after?.autoRescheduleDisabled;
      if (statusNow === "open" && !hasRule && !disabled) {
        const due = asDate(after?.dueAt);
        if (due && due.getTime() < now.getTime()) {
          // Compute next future slot at same local time in household TZ
          const tzNow = dayjs(now).tz(tz);
          const orig = dayjs(due).tz(tz);
          const todayAtOrig = tzNow
            .hour(orig.hour())
            .minute(orig.minute())
            .second(orig.second())
            .millisecond(0);
          const shiftedLocal = todayAtOrig.isAfter(tzNow)
            ? todayAtOrig
            : todayAtOrig.add(1, "day");
          const shiftedDue = shiftedLocal.toDate();
          const shiftedNext =
            prepHours && prepHours > 0
              ? new Date(shiftedDue.getTime() - prepHours * 3600 * 1000)
              : shiftedDue;
          await change.after.ref.update({
            dueAt: admin.firestore.Timestamp.fromDate(shiftedDue),
            nextOccurrenceAt: admin.firestore.Timestamp.fromDate(shiftedNext),
            lastAutoShiftedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastAutoShiftedFrom: admin.firestore.Timestamp.fromDate(due),
            lastAutoShiftedTo: admin.firestore.Timestamp.fromDate(shiftedDue),
            lastAutoShiftReason: wasBlocked ? "unblocked_past" : "past_due",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          showAt = shiftedNext;
        }
      }
    } catch (e) {
      console.warn("[tasks.onWrite] auto-reschedule failed", e);
    }

    // Rotation assignment on create/advance
    {
      const prevShow = before ? asDate(before?.nextOccurrenceAt) : null;
      const isInitial = !before || (!prevShow && !!showAt);
      const didAdvance = !!(
        prevShow &&
        showAt &&
        showAt.getTime() !== prevShow.getTime()
      );
      const pool = Array.isArray(after?.rotationPool)
        ? (after.rotationPool as string[])
        : [];
      if ((isInitial || didAdvance) && pool.length) {
        const weights = after?.rotationWeights ?? {};
        const expanded: string[] = [];
        for (const uid of pool) {
          const w = Math.max(1, Number((weights as any)?.[uid] ?? 1));
          for (let i = 0; i < w; i++) expanded.push(uid);
        }
        const expLen = expanded.length;
        if (expLen > 0) {
          const idxRaw = Number(after?.rotationIndex ?? 0);
          const idx = ((idxRaw % expLen) + expLen) % expLen;
          const assignee = expanded[idx];
          const nextIdx = (idx + 1) % expLen;
          await change.after.ref.set(
            {
              assigneeIds: [assignee],
              rotationIndex: nextIdx,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    }

    // Activity and notifications
    if (!before) {
      await db.collection(`households/${hid}/activity`).add({
        actorId: after.createdBy ?? null,
        action: "task.create",
        taskId,
        payload: { title: after.title, type: after.type },
        at: admin.firestore.FieldValue.serverTimestamp(),
      });

      try {
        const createdBy: string | undefined = after?.createdBy;
        const membersSnap = await db
          .collection(`households/${hid}/members`)
          .get();
        const memberIds = membersSnap.docs
          .map((d) => d.id)
          .filter((id) => id && id !== createdBy);
        if (memberIds.length) {
          const usersSnap = await db.getAll(
            ...memberIds.map((uid) => db.doc(`users/${uid}`))
          );
          const now = new Date();
          const title = String(after?.title || taskId);
          const messages: {
            to: string[];
            title: string;
            body: string;
            data?: Record<string, any>;
            categoryId?: string;
          }[] = [];
          for (const u of usersSnap) {
            const data = u.data() as any;
            if (data?.notificationsEnabled === false) continue;
            const token: string | undefined = data?.pushToken;
            if (!token) continue;
            const quiet = data?.quietHours as
              | { start: string; end: string; tz?: string }
              | undefined;
            if (
              isWithinQuietHours(now, quiet, await getHouseholdTimezone(hid))
            ) {
              const scheduledAt = nextAllowedTime(
                now,
                quiet,
                await getHouseholdTimezone(hid)
              );
              await enqueueExpoPush({
                hid,
                to: [token],
                uids: [u.id],
                title: "New task",
                body: title,
                data: { type: "task.create", hid, taskId },
                categoryId: "task_actions",
                scheduledAt,
              });
            } else {
              messages.push({
                to: [token],
                title: "New task",
                body: title,
                data: { type: "task.create", hid, taskId },
                categoryId: "task_actions",
              });
            }
          }
          if (messages.length) await sendExpoPush(messages);
        }
      } catch (e) {
        console.warn("[tasks.onWrite] push on create failed", e);
      }
    } else {
      const beforeStatus = before.status;
      const afterStatus = after.status;
      if (beforeStatus !== "done" && afterStatus === "done") {
        await db.collection(`households/${hid}/activity`).add({
          actorId: after.updatedBy ?? after.createdBy ?? null,
          action: "task.complete",
          taskId,
          payload: { title: after.title },
          at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Nudge dependents to re-evaluate blocked status
        try {
          const dependentsSnap = await db
            .collection(`households/${hid}/tasks`)
            .where("dependsOn", "array-contains", taskId)
            .get();
          if (!dependentsSnap.empty) {
            const batch = db.batch();
            for (const d of dependentsSnap.docs) {
              batch.update(d.ref, {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            await batch.commit();
          }
        } catch (e) {
          console.warn("[tasks.onWrite] nudge dependents failed", e);
        }
        // Notify adults for approval if required
        if (after?.approvalRequired) {
          try {
            const membersSnap = await db
              .collection(`households/${hid}/members`)
              .get();
            const adultIds = membersSnap.docs
              .filter((d) => {
                const role = (d.data() as any)?.role;
                return role === "adult" || role === "admin";
              })
              .map((d) => d.id);
            if (adultIds.length) {
              const usersSnap = await db.getAll(
                ...adultIds.map((uid) => db.doc(`users/${uid}`))
              );
              const messages: {
                to: string[];
                title: string;
                body: string;
                data?: Record<string, any>;
                categoryId?: string;
              }[] = [];
              for (const u of usersSnap) {
                const data = u.data() as any;
                const token: string | undefined = data?.pushToken;
                if (!token) continue;
                messages.push({
                  to: [token],
                  title: "Needs verification",
                  body: String(after?.title || taskId),
                  data: { type: "task.needs_verify", hid, taskId },
                  categoryId: "task_actions",
                });
              }
              if (messages.length) await sendExpoPush(messages);
            }
          } catch {}
        }
      }
      // Adult verification notification back to assignees
      if (beforeStatus !== "verified" && afterStatus === "verified") {
        try {
          const assignees: string[] = Array.isArray(after?.assigneeIds)
            ? after.assigneeIds
            : [];
          if (assignees.length) {
            const usersSnap = await db.getAll(
              ...assignees.map((uid) => db.doc(`users/${uid}`))
            );
            const messages: {
              to: string[];
              title: string;
              body: string;
              data?: Record<string, any>;
              categoryId?: string;
            }[] = [];
            for (const u of usersSnap) {
              const data = u.data() as any;
              const token: string | undefined = data?.pushToken;
              if (!token) continue;
              messages.push({
                to: [token],
                title: "Verified",
                body: String(after?.title || taskId),
                data: { type: "task.verified", hid, taskId },
                categoryId: "task_actions",
              });
            }
            if (messages.length) await sendExpoPush(messages);
          }
        } catch {}
      }
    }
  });

function asDate(v: any): Date | null {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return null;
}

async function getHouseholdTimezone(hid: string): Promise<string> {
  try {
    const snap = await db.doc(`households/${hid}`).get();
    const tz = (snap.data() as any)?.timezone;
    // Basic validation: must contain a slash like Continent/City
    if (typeof tz === "string" && tz.includes("/")) return tz;
  } catch {}
  return "UTC";
}
