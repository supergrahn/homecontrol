import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { navRef } from "../firebase/providers/NavigationProvider";
import { appEvents } from "../events";
import { refreshNextUpWidget } from "./widgets";

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Constants.isDevice) return null;
  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;
  const projId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projId) return null;
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: projId })
  ).data;
  return token ?? null;
}

export async function savePushToken(token: string | null) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await setDoc(ref, { pushToken: token ?? null }, { merge: true });
}

// Set up a listener to handle notification taps
export function registerNotificationResponseHandler() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data: any = response.notification.request.content.data || {};
      const action = (response as any).actionIdentifier as string | undefined;
      if (action && data?.hid && data?.taskId) {
        // Handle action buttons
        (async () => {
          const { acceptTask, completeTask, snoozeTask } = await import(
            "../services/tasks"
          );
          const { logActivity } = await import("./activity");
          if (action === "ACCEPT_TASK") {
            try {
              await acceptTask(String(data.hid), String(data.taskId));
              await logActivity({
                hid: String(data.hid),
                action: "task.accept",
                taskId: String(data.taskId),
              });
              appEvents.emit("toast", { key: "accepted" });
            } catch {}
          } else if (action === "COMPLETE_TASK") {
            try {
              await completeTask(String(data.hid), String(data.taskId));
              await logActivity({
                hid: String(data.hid),
                action: "task.complete",
                taskId: String(data.taskId),
              });
              appEvents.emit("toast", { key: "markComplete" });
            } catch {}
          } else if (action === "SNOOZE_15") {
            try {
              await snoozeTask(String(data.hid), String(data.taskId), 15);
              await logActivity({
                hid: String(data.hid),
                action: "task.snooze",
                taskId: String(data.taskId),
                payload: { minutes: 15 },
              });
              appEvents.emit("toast", { message: "Snoozed 15m" });
            } catch {}
          }
        })();
      }
      if (data?.type === "escalation" && data?.taskId) {
        if (navRef.isReady()) {
          navRef.navigate("TaskDetail", { id: String(data.taskId) });
        }
      }
    } catch (e) {
      console.warn("[push] response handler error", e);
    }
  });
}

export async function configureNotificationCategories() {
  try {
    // Create a low-importance Android channel for soft quiet-hours delivery
    await Notifications.setNotificationChannelAsync("silent", {
      name: "Silent",
      importance: Notifications.AndroidImportance.MIN,
      sound: undefined,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationCategoryAsync("task_actions", [
      {
        identifier: "ACCEPT_TASK",
        buttonTitle: "Accept",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "COMPLETE_TASK",
        buttonTitle: "Done",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "SNOOZE_15",
        buttonTitle: "Snooze 15m",
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (e) {
    console.warn("[push] set categories failed", e);
  }
}

// Refresh widget payload on push receipt (foreground)
export function registerNotificationReceivedHandler() {
  Notifications.addNotificationReceivedListener(async (notification) => {
    try {
      const data: any = notification.request?.content?.data || {};
      const hid = data?.hid as string | undefined;
      if (hid) {
        // best-effort refresh of Next up so widgets/preview stay current
        await refreshNextUpWidget(hid);
      }
    } catch (e) {
      console.warn("[push] received handler error", e);
    }
  });
}
