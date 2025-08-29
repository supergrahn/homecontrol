import { EventEmitter } from "expo-modules-core";

// Global, lightweight event bus for cross-surface signals (widgets, toasts, etc.)
// Type as any to avoid strict event name typing until native bridges are in place.
export const appEvents: any = new EventEmitter() as any;

export type AppEventMap =
  | { type: "widget:refresh"; hid: string }
  | { type: "task:accepted"; hid: string; taskId: string }
  | { type: "task:released"; hid: string; taskId: string }
  | { type: "task:completed"; hid: string; taskId: string };
