import "react-native-gesture-handler";
import React from "react";
import { NativeModules, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "./firebase/providers/QueryProvider";
import { ThemeProvider } from "./design/theme";
import { AuthProvider } from "./firebase/providers/AuthProvider";
import NavigationProvider, {
  navRef,
} from "./firebase/providers/NavigationProvider";
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
import ErrorBoundary from "./components/ErrorBoundary";
// Event bus integration with proper typing

// Component-scoped interval handles to prevent memory leaks
type IntervalId = ReturnType<typeof setInterval>;

export default function App() {
  // Component-scoped interval handle for connectivity watcher to prevent memory leaks
  const outboxNetIntervalRef = React.useRef<IntervalId | undefined>();
  
  // In dev, sometimes the Dev Loading overlay ("Downloading 100%") sticks around.
  // Proactively hide it after mount so it doesn't block the bottom navigation.
  React.useEffect(() => {
    if (__DEV__) {
      try {
        const DevLoadingView = (NativeModules as { DevLoadingView?: { hide?: () => void } })?.DevLoadingView;
        DevLoadingView?.hide?.();
      } catch {}
      // Retry a few times in case the overlay reappears during initial bundles/HMR
      let tries = 0;
      const timer = setInterval(() => {
        try {
          const DevLoadingView = (NativeModules as { DevLoadingView?: { hide?: () => void } })?.DevLoadingView;
          DevLoadingView?.hide?.();
        } catch {}
        tries += 1;
        if (tries >= 8) clearInterval(timer);
      }, 250);
      return () => clearInterval(timer);
    }
  }, []);
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
        outboxNetIntervalRef.current = setInterval(async () => {
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
        interface NotificationData {
          type?: string;
          hid?: string;
          counts?: { overdue?: number };
        }
        const data = resp.notification.request.content.data as NotificationData;
        // Data example: { type: 'digest.daily', hid }
        try {
          if (navRef.isReady()) {
            // For now, just ensure we're on Home; Home can default to Today and offer an Overdue CTA
            navRef.navigate("MainTabs");
            if (data?.type === "digest.daily" && (data?.counts?.overdue ?? 0) > 0) {
              appEvents.emit("show-overdue");
            }
          }
        } catch {}
      }
    );
    return () => {
      sub.remove();
      try {
        if (outboxNetIntervalRef.current) {
          clearInterval(outboxNetIntervalRef.current);
          outboxNetIntervalRef.current = undefined;
        }
      } catch {}
    };
  }, []);
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      // Log critical app-level errors
      console.error("App-level error boundary triggered:", error, errorInfo);
    }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <ErrorBoundary>
              <QueryProvider>
                <ErrorBoundary>
                  <AuthProvider>
                    <ErrorBoundary>
                      <HouseholdProvider>
                        <ErrorBoundary>
                          <ToastProvider>
                            <ErrorBoundary>
                              <NavigationProvider />
                            </ErrorBoundary>
                            <ErrorBoundary>
                              <GlobalToasts />
                            </ErrorBoundary>
                            <ErrorBoundary>
                              <DeepLinkHandler />
                            </ErrorBoundary>
                            <ErrorBoundary>
                              <LiveActivityOverlay />
                            </ErrorBoundary>
                            <ErrorBoundary>
                              <HouseholdEffects />
                            </ErrorBoundary>
                          </ToastProvider>
                        </ErrorBoundary>
                      </HouseholdProvider>
                    </ErrorBoundary>
                  </AuthProvider>
                </ErrorBoundary>
              </QueryProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function GlobalToasts() {
  const toast = useToast();
  const { t } = useTranslation();
  React.useEffect(() => {
    interface ToastPayload {
      key?: string;
      message?: string;
      type?: string;
    }
    const sub = appEvents.addListener("toast", (payload: ToastPayload) => {
      try {
        const msg = payload?.key
          ? (t(payload.key) as string)
          : String(payload?.message || "");
        const type = (payload?.type as "success" | "error" | "info") || "success";
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
  const { householdId } = useHousehold();
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
