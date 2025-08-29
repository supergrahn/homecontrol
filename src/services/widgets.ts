import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { fetchTasksInRange } from "./tasks";
import { appEvents } from "../events";

const STORE_KEY = (hid: string) => `@hc:widget:nextup:${hid}`;

export type WidgetTask = {
  id: string;
  title: string;
  when: string; // ISO string for effective date
  priority?: number | null;
  status: string;
};

export type NextUpPayload = {
  updatedAt: string; // ISO
  tasks: WidgetTask[];
};

// Build the Next up list (top 3) and persist to storage so native widgets can read later.
export async function refreshNextUpWidget(hid: string) {
  const start = dayjs().startOf("day").toDate();
  const end = dayjs().add(7, "day").endOf("day").toDate();
  const tasks = await fetchTasksInRange(hid, start, end, {
    priorityOrder: "desc",
  });
  // Filter visible statuses and sort by earliest effective time, then priority desc (already sorted)
  const visible = tasks
    .filter((t: any) => ["open", "in_progress", "blocked"].includes(t.status))
    .slice(0, 3)
    .map((t: any) => ({
      id: t.id,
      title: String(t.title || "Untitled"),
      when: new Date(
        (t.nextOccurrenceAt as Date) || (t.dueAt as Date) || new Date()
      ).toISOString(),
      priority: typeof t.priority === "number" ? t.priority : null,
      status: String(t.status || "open"),
    }));
  const payload: NextUpPayload = {
    updatedAt: new Date().toISOString(),
    tasks: visible,
  };
  await AsyncStorage.setItem(STORE_KEY(hid), JSON.stringify(payload));
  // Emit an in-app event; native sides can also listen or poll storage.
  (appEvents as any).emit("widget:refresh", { hid });
  return payload;
}

export async function readNextUpWidget(
  hid: string
): Promise<NextUpPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY(hid));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
