import { appEvents } from "../events";

// Thin cross-platform stub for iOS ActivityKit & Android live widget equivalents.
// Native platforms can hook into these events or read shared storage.

type StartParams = {
  hid: string;
  taskId: string;
  title?: string;
  startedAt?: string; // ISO
  expectedEndAt?: string; // ISO
};

export async function startTaskLiveActivity(params: StartParams) {
  (appEvents as any).emit("task:accepted", params);
}

export async function endTaskLiveActivity(hid: string, taskId: string) {
  (appEvents as any).emit("task:completed", { hid, taskId });
}

export async function cancelTaskLiveActivity(hid: string, taskId: string) {
  (appEvents as any).emit("task:released", { hid, taskId });
}
