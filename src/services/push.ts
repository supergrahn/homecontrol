import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { navRef } from "../firebase/providers/NavigationProvider";

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
