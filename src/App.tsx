import "react-native-gesture-handler";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "./firebase/providers/QueryProvider";
import NavigationProvider, {
  navRef,
} from "./firebase/providers/NavigationProvider";
import DevToolbar from "./components/DevToolbar";
import LiveActivityOverlay from "./components/LiveActivityOverlay";
import {
  HouseholdProvider,
  useHousehold,
} from "./firebase/providers/HouseholdProvider";
import { ToastProvider, useToast } from "./components/ToastProvider";
import DeepLinkHandler from "./components/DeepLinkHandler";
import {
  registerForPushNotificationsAsync,
  savePushToken,
  registerNotificationResponseHandler,
  configureNotificationCategories,
} from "./services/push";
import * as Notifications from "expo-notifications";
import { appEvents } from "./events";
import { useTranslation } from "react-i18next";
import { maybeShowMorningBrief } from "./services/morningBrief";
import { flushOutbox } from "./services/outbox";
import { refreshNextUpWidget } from "./services/widgets";
// Minimal event bus; type as any to avoid strict typing for quick integration
// appEvents is provided by src/events

// module-scoped interval handle for connectivity watcher
let outboxNetInterval: any | undefined;

export default function App() {
  React.useEffect(() => {
    (async () => {
      try {
        await configureNotificationCategories();
        const token = await registerForPushNotificationsAsync();
        if (token) await savePushToken(token);
        // refresh widget payload when push arrives while app is in foreground
        const { registerNotificationReceivedHandler } = await import(
          "./services/push"
        );
        registerNotificationReceivedHandler();
        // attempt to flush any queued offline actions shortly after launch
        setTimeout(() => {
          flushOutbox().catch(() => {});
        }, 1000);
        // simple connectivity watcher: ping and flush when back online
        let lastOnline = true;
        outboxNetInterval = setInterval(async () => {
          try {
            // HEAD to a lightweight endpoint; fall back to navigator.onLine
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 2000);
            await fetch("https://www.google.com/generate_204", {
              method: "GET",
              signal: ctrl.signal,
            });
            clearTimeout(t);
            if (!lastOnline) {
              lastOnline = true;
              flushOutbox().catch(() => {});
            }
          } catch {
            lastOnline = false;
          }
        }, 5000);
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
      }
    );
    return () => {
      sub.remove();
      try {
        if (outboxNetInterval) {
          clearInterval(outboxNetInterval);
          outboxNetInterval = undefined;
        }
      } catch {}
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
            <LiveActivityOverlay />
            <HouseholdEffects />
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
        const msg = payload?.key
          ? (t(payload.key) as string)
          : String(payload?.message || "");
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

function HouseholdEffects() {
  const { householdId } = useHousehold() as any;
  React.useEffect(() => {
    (async () => {
      try {
        if (householdId) await maybeShowMorningBrief(householdId);
        // also try flushing outbox when household context is ready
        await flushOutbox();
        // seed/refresh Next up widget payload
        if (householdId) {
          try {
            await refreshNextUpWidget(householdId);
          } catch {}
        }
      } catch {}
    })();
  }, [householdId]);
  return null;
}
