import "react-native-gesture-handler";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "./firebase/providers/QueryProvider";
import NavigationProvider, {
  navRef,
} from "./firebase/providers/NavigationProvider";
import DevToolbar from "./components/DevToolbar";
import { HouseholdProvider } from "./firebase/providers/HouseholdProvider";
import { ToastProvider, useToast } from "./components/ToastProvider";
import DeepLinkHandler from "./components/DeepLinkHandler";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  registerNotificationResponseHandler,
  configureNotificationCategories,
} from "./services/push";
import * as Notifications from "expo-notifications";
import { EventEmitter } from "expo-modules-core";
import { useTranslation } from "react-i18next";
// Minimal event bus; type as any to avoid strict typing for quick integration
export const appEvents: any = new EventEmitter();

export default function App() {
  React.useEffect(() => {
    (async () => {
      try {
  await configureNotificationCategories();
        const token = await registerForPushNotificationsAsync();
        if (token) await savePushToken(token);
      } catch {}
    })();
  // Handle escalation tap navigation
  registerNotificationResponseHandler();
    const sub = Notifications.addNotificationResponseReceivedListener(
      (resp) => {
        const data = resp.notification.request.content.data as any;
        // Data example: { type: 'digest.daily', hid }
        try {
          if (navRef.isReady()) {
            // For now, just ensure we're on Home; Home can default to Today and offer an Overdue CTA
            navRef.navigate("MainTabs");
            if (data?.type === "digest.daily" && data?.counts?.overdue > 0) {
              appEvents.emit("show-overdue");
            }
          }
        } catch {}
      },
    );
    return () => {
      sub.remove();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <HouseholdProvider>
          <ToastProvider>
            <NavigationProvider />
            <GlobalToasts />
            <DeepLinkHandler />
            {__DEV__ ? <DevToolbar /> : null}
          </ToastProvider>
        </HouseholdProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

function GlobalToasts() {
  const toast = useToast();
  const { t } = useTranslation();
  React.useEffect(() => {
    const sub = appEvents.addListener("toast", (payload: any) => {
      try {
        const msg = payload?.key ? (t(payload.key) as string) : String(payload?.message || "");
        const type = (payload?.type as any) || "success";
        if (msg) toast.show(msg, { type });
      } catch {}
    });
    return () => {
      sub.remove();
    };
  }, [toast, t]);
  return null;
}
