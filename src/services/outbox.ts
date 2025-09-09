import AsyncStorage from "@react-native-async-storage/async-storage";
import { acceptTask, releaseTask, completeTask, snoozeTask, reassignTask } from "./tasks";
import { addComment } from "./comments";
import { createTask } from "./tasks";
import { appEvents } from "../events";

export type OutboxItem =
  | {
      id: string;
      type: "accept";
      hid: string;
      taskId: string;
      createdAt: number;
    }
  | {
      id: string;
      type: "release";
      hid: string;
      taskId: string;
      createdAt: number;
    }
  | {
      id: string;
      type: "complete";
      hid: string;
      taskId: string;
      createdAt: number;
    }
  | {
      id: string;
      type: "comment";
      hid: string;
      taskId: string;
      text: string;
      mentions: string[];
      createdAt: number;
    }
  | {
      id: string;
      type: "snooze";
      hid: string;
      taskId: string;
      minutes: number;
      snoozeType?: "30min" | "2hrs" | "tomorrow" | "next_week" | "custom";
      createdAt: number;
    }
  | {
      id: string;
      type: "reassign";
      hid: string;
      taskId: string;
      reassignTo: string;
      reassignFrom?: string;
      createdAt: number;
    }
  | {
      id: string;
      type: "quick_add";
      hid: string;
      relatedTaskId: string;
      taskData: {
        title: string;
        description?: string;
        priority?: number;
        assignedTo?: string[];
        childIds?: string[];
      };
      createdAt: number;
    };

const KEY = "outbox.v1";

async function load(): Promise<OutboxItem[]> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    if (!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? (arr as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function save(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  try {
    (appEvents as any).emit("outbox:count", { count: items.length });
  } catch {}
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function enqueueAccept(hid: string, taskId: string) {
  const items = await load();
  items.push({
    id: genId(),
    type: "accept",
    hid,
    taskId,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueRelease(hid: string, taskId: string) {
  const items = await load();
  items.push({
    id: genId(),
    type: "release",
    hid,
    taskId,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueComplete(hid: string, taskId: string) {
  const items = await load();
  items.push({
    id: genId(),
    type: "complete",
    hid,
    taskId,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueComment(
  hid: string,
  taskId: string,
  text: string,
  mentions: string[]
) {
  const items = await load();
  items.push({
    id: genId(),
    type: "comment",
    hid,
    taskId,
    text,
    mentions,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueSnooze(
  hid: string,
  taskId: string,
  minutes: number,
  snoozeType?: "30min" | "2hrs" | "tomorrow" | "next_week" | "custom"
) {
  const items = await load();
  items.push({
    id: genId(),
    type: "snooze",
    hid,
    taskId,
    minutes,
    snoozeType,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueReassign(
  hid: string,
  taskId: string,
  reassignTo: string,
  reassignFrom?: string
) {
  const items = await load();
  items.push({
    id: genId(),
    type: "reassign",
    hid,
    taskId,
    reassignTo,
    reassignFrom,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function enqueueQuickAdd(
  hid: string,
  relatedTaskId: string,
  taskData: {
    title: string;
    description?: string;
    priority?: number;
    assignedTo?: string[];
    childIds?: string[];
  }
) {
  const items = await load();
  items.push({
    id: genId(),
    type: "quick_add",
    hid,
    relatedTaskId,
    taskData,
    createdAt: Date.now(),
  });
  await save(items);
}

export async function flushOutbox(): Promise<{ ok: number; fail: number }> {
  const items = await load();
  if (items.length === 0) return { ok: 0, fail: 0 };
  const remaining: OutboxItem[] = [];
  let ok = 0;
  let fail = 0;
  for (const it of items) {
    try {
      if (it.type === "accept") {
        await acceptTask(it.hid, it.taskId);
      } else if (it.type === "release") {
        await releaseTask(it.hid, it.taskId);
      } else if (it.type === "complete") {
        await completeTask(it.hid, it.taskId);
      } else if (it.type === "comment") {
        await addComment(it.hid, it.taskId, it.text, it.mentions);
      } else if (it.type === "snooze") {
        await snoozeTask(it.hid, it.taskId, it.minutes);
      } else if (it.type === "reassign") {
        // For reassign, we'd need to implement reassignTask function
        // For now, this is a placeholder
        console.log("Reassign task offline action not fully implemented yet");
        // await reassignTask(it.hid, it.taskId, it.reassignTo);
      } else if (it.type === "quick_add") {
        await createTask(it.hid, {
          ...it.taskData,
          // Mark as related to original task
          notes: `Related to task: ${it.relatedTaskId}`,
        });
      }
      ok++;
    } catch (e) {
      fail++;
      // Keep failed items to retry later
      remaining.push(it);
    }
  }
  await save(remaining);
  return { ok, fail };
}

export async function getOutboxCount(): Promise<number> {
  const items = await load();
  return items.length;
}
