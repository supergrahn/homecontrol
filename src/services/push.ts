import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { navRef } from "../firebase/providers/NavigationProvider";
import { appEvents } from "../events";
import { refreshNextUpWidget } from "./widgets";
import { norwegianCulture } from "./norwegianCulture";
import { 
  enqueueAccept, 
  enqueueComplete, 
  enqueueRelease, 
  enqueueSnooze,
  enqueueReassign,
  enqueueQuickAdd 
} from "./outbox";

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

// Set up a listener to handle notification taps with Norwegian cultural context
export function registerNotificationResponseHandler() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data: any = response.notification.request.content.data || {};
      const action = (response as any).actionIdentifier as string | undefined;
      if (action && data?.hid && data?.taskId) {
        // Handle Norwegian-enhanced action buttons
        (async () => {
          const { acceptTask, completeTask, snoozeTask, reassignTask } = await import(
            "../services/tasks"
          );
          const { logActivity } = await import("./activity");
          const { flushOutbox } = await import("./outbox");
          
          // Use enhanced error handling for all Norwegian rich actions
          await handleActionWithFallback(action, String(data.hid), String(data.taskId), data);
          
          // Try to flush outbox after any action (best effort)
          setTimeout(() => {
            scheduleIntelligentRetry().catch(() => {
              console.log("[push] Background sync scheduled");
            });
          }, 100);
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
    const preferences = await norwegianCulture.getCulturalPreferences();
    const isNorwegian = preferences.preferNorwegianLanguage;

    // Create notification channels for Norwegian quiet hours
    await Notifications.setNotificationChannelAsync("silent", {
      name: isNorwegian ? "Stille varsler" : "Silent",
      importance: Notifications.AndroidImportance.MIN,
      sound: undefined,
      vibrationPattern: [0],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync("friluftsliv", {
      name: isNorwegian ? "Friluftslivsvarsler" : "Outdoor Activities",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined, // Respect outdoor quiet time
      vibrationPattern: [200, 100, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Norwegian rich actions category
    await Notifications.setNotificationCategoryAsync("norwegian_task_actions", [
      {
        identifier: "COMPLETE_TASK",
        buttonTitle: isNorwegian ? "✅ Ferdig" : "✅ Complete",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SNOOZE_30MIN",
        buttonTitle: isNorwegian ? "⏰ 30 min" : "⏰ 30min",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SNOOZE_2TIMER",
        buttonTitle: isNorwegian ? "⏰ 2 timer" : "⏰ 2hrs",
        options: { opensAppToForeground: false },
      },
    ]);

    // Extended Norwegian actions category
    await Notifications.setNotificationCategoryAsync("norwegian_extended_actions", [
      {
        identifier: "ACCEPT_TASK",
        buttonTitle: isNorwegian ? "👥 Jeg tar den" : "👥 I'll take it",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SNOOZE_IMORGEN",
        buttonTitle: isNorwegian ? "📅 I morgen" : "📅 Tomorrow",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SNOOZE_NESTEUKE",
        buttonTitle: isNorwegian ? "📅 Neste uke" : "📅 Next week",
        options: { opensAppToForeground: false },
      },
    ]);

    // Family context actions category
    await Notifications.setNotificationCategoryAsync("norwegian_family_actions", [
      {
        identifier: "REASSIGN_TASK",
        buttonTitle: isNorwegian ? "🔄 Gi til annen" : "🔄 Reassign",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "QUICK_ADD_RELATED",
        buttonTitle: isNorwegian ? "➕ Legg til lignende" : "➕ Add similar",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "COMPLETE_TASK",
        buttonTitle: isNorwegian ? "✅ Ferdig" : "✅ Complete",
        options: { opensAppToForeground: false },
      },
    ]);

    // Legacy category for backward compatibility
    await Notifications.setNotificationCategoryAsync("task_actions", [
      {
        identifier: "ACCEPT_TASK",
        buttonTitle: isNorwegian ? "Godta" : "Accept",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "COMPLETE_TASK",
        buttonTitle: isNorwegian ? "Ferdig" : "Done",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "SNOOZE_15",
        buttonTitle: isNorwegian ? "15 min senere" : "Snooze 15m",
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

// Norwegian Rich Action Handlers

async function handleAcceptAction(hid: string, taskId: string): Promise<void> {
  const { acceptTask } = await import("../services/tasks");
  const { logActivity } = await import("./activity");
  
  await acceptTask(hid, taskId);
  await logActivity({
    hid,
    action: "task.accept",
    taskId,
    payload: { source: "norwegian_push_action" },
  });
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? "Oppgave akseptert!" 
    : "Task accepted!";
  appEvents.emit("toast", { message });
}

async function handleCompleteAction(hid: string, taskId: string): Promise<void> {
  const { completeTask } = await import("../services/tasks");
  const { logActivity } = await import("./activity");
  
  await completeTask(hid, taskId);
  await logActivity({
    hid,
    action: "task.complete",
    taskId,
    payload: { source: "norwegian_push_action" },
  });
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? norwegianCulture.getNorwegianGreeting("motivational") 
    : "Great job!";
  appEvents.emit("toast", { message });
}

async function handleSnoozeAction(hid: string, taskId: string, minutes: number): Promise<void> {
  const { snoozeTask } = await import("../services/tasks");
  const { logActivity } = await import("./activity");
  
  await snoozeTask(hid, taskId, minutes);
  await logActivity({
    hid,
    action: "task.snooze",
    taskId,
    payload: { minutes, source: "norwegian_push_action" },
  });
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? `Utsatt ${minutes} minutter`
    : `Snoozed ${minutes}m`;
  appEvents.emit("toast", { message });
}

async function handleSnoozeTomorrowAction(hid: string, taskId: string): Promise<void> {
  const { snoozeTask } = await import("../services/tasks");
  const { logActivity } = await import("./activity");
  
  // Calculate minutes until tomorrow morning (08:00)
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const minutesUntilTomorrow = Math.max(1, Math.round((tomorrow.getTime() - now.getTime()) / 60000));
  
  await snoozeTask(hid, taskId, minutesUntilTomorrow);
  await logActivity({
    hid,
    action: "task.snooze",
    taskId,
    payload: { 
      minutes: minutesUntilTomorrow, 
      snoozeType: "tomorrow",
      source: "norwegian_push_action" 
    },
  });
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? "Utsatt til i morgen kl 08:00" 
    : "Snoozed until tomorrow 08:00";
  appEvents.emit("toast", { message });
}

async function handleSnoozeNextWeekAction(hid: string, taskId: string): Promise<void> {
  const { snoozeTask } = await import("../services/tasks");
  const { logActivity } = await import("./activity");
  
  // Calculate minutes until next Monday morning (08:00)
  const now = new Date();
  const nextMonday = new Date();
  const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7; // Next Monday
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(8, 0, 0, 0);
  const minutesUntilNextWeek = Math.max(1, Math.round((nextMonday.getTime() - now.getTime()) / 60000));
  
  await snoozeTask(hid, taskId, minutesUntilNextWeek);
  await logActivity({
    hid,
    action: "task.snooze",
    taskId,
    payload: { 
      minutes: minutesUntilNextWeek, 
      snoozeType: "next_week",
      source: "norwegian_push_action" 
    },
  });
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? "Utsatt til neste mandag kl 08:00" 
    : "Snoozed until next Monday 08:00";
  appEvents.emit("toast", { message });
}

async function handleReassignAction(hid: string, taskId: string, reassignTo?: string): Promise<void> {
  // For now, just navigate to task detail for manual reassignment
  // In a full implementation, this could use household member data
  if (navRef.isReady()) {
    navRef.navigate("TaskDetail", { id: taskId, action: "reassign" });
  }
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? "Åpner oppgave for omfordeling..." 
    : "Opening task for reassignment...";
  appEvents.emit("toast", { message });
}

async function handleQuickAddRelatedAction(hid: string, taskId: string, relatedTaskTitle?: string): Promise<void> {
  // Navigate to add task with context
  if (navRef.isReady()) {
    navRef.navigate("NewTask", { hid, relatedTaskId: taskId, suggestedTitle: relatedTaskTitle });
  }
  
  const preferences = await norwegianCulture.getCulturalPreferences();
  const message = preferences.preferNorwegianLanguage 
    ? "Åpner ny oppgave..." 
    : "Opening new task...";
  appEvents.emit("toast", { message });
}

// Offline action queueing for Norwegian network conditions
async function handleActionOffline(action: string, hid: string, taskId: string, data: any): Promise<void> {
  const preferences = await norwegianCulture.getCulturalPreferences();
  
  try {
    // Queue the action for later when network is available
    if (action === "ACCEPT_TASK") {
      await enqueueAccept(hid, taskId);
    } else if (action === "COMPLETE_TASK") {
      await enqueueComplete(hid, taskId);
    } else if (action.startsWith("SNOOZE_")) {
      const minutes = action === "SNOOZE_30MIN" ? 30 : 
                    action === "SNOOZE_2TIMER" ? 120 : 
                    action === "SNOOZE_IMORGEN" ? 480 : // 8 hours as fallback
                    action === "SNOOZE_NESTEUKE" ? 10080 : // 1 week
                    15; // default
      await enqueueSnooze(hid, taskId, minutes);
    }
    
    const message = preferences.preferNorwegianLanguage 
      ? "Handlingen er lagret - vil synkroniseres når tilkoblingen er gjenopprettet"
      : "Action queued - will sync when connection is restored";
    appEvents.emit("toast", { message, duration: 4000 });
    
  } catch (error) {
    console.warn("[push] Failed to queue offline action:", error);
    const message = preferences.preferNorwegianLanguage 
      ? "Kunne ikke lagre handlingen. Prøv igjen når du er tilkoblet."
      : "Couldn't save action. Please try again when connected.";
    appEvents.emit("toast", { message, type: "error" });
  }
}

// Norwegian cultural context notification scheduling
export async function shouldDeliverNotificationNow(): Promise<{
  shouldDeliver: boolean;
  reason?: string;
  alternativeChannel?: string;
}> {
  try {
    const preferences = await norwegianCulture.getCulturalPreferences();
    
    // Respect Norwegian quiet hours (20:00-07:00 / 8PM-7AM)
    if (preferences.respectQuietHours && norwegianCulture.isWithinQuietHours()) {
      return {
        shouldDeliver: true,
        reason: "quiet_hours",
        alternativeChannel: "silent"
      };
    }
    
    // Check for friluftsliv context (outdoor family time)
    // This could be enhanced with location services or calendar integration
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const isDaytime = now.getHours() >= 10 && now.getHours() <= 16;
    
    if (preferences.includeFriluftsliv && isWeekend && isDaytime) {
      // During typical Norwegian outdoor family time, use gentler notifications
      return {
        shouldDeliver: true,
        reason: "friluftsliv_time",
        alternativeChannel: "friluftsliv"
      };
    }
    
    return { shouldDeliver: true };
  } catch (error) {
    console.warn("[push] Error checking Norwegian delivery context:", error);
    return { shouldDeliver: true };
  }
}

// Enhanced Error Handling and Retry Logic for Norwegian Rich Actions

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2
};

export async function executeActionWithRetry<T>(
  actionFn: () => Promise<T>,
  actionName: string,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await actionFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[push] ${actionName} attempt ${attempt + 1} failed:`, error);
      
      if (attempt === config.maxRetries) {
        // Final attempt failed, don't retry further
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      console.log(`[push] Retrying ${actionName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed, throw the last error
  throw new Error(`Failed to execute ${actionName} after ${config.maxRetries + 1} attempts: ${lastError.message}`);
}

// Enhanced action handlers with robust error handling
export async function handleActionWithFallback(
  action: string, 
  hid: string, 
  taskId: string, 
  data: any
): Promise<void> {
  const preferences = await norwegianCulture.getCulturalPreferences();
  const isNorwegian = preferences.preferNorwegianLanguage;
  
  try {
    // Primary attempt with retry logic
    await executeActionWithRetry(async () => {
      await executeAction(action, hid, taskId, data);
    }, `Norwegian action: ${action}`);
    
    // Success - show confirmation
    const successMessage = getActionSuccessMessage(action, isNorwegian);
    appEvents.emit("toast", { message: successMessage, type: "success" });
    
  } catch (error) {
    console.warn(`[push] Action ${action} failed completely, falling back to offline queue:`, error);
    
    try {
      // Fallback to offline queue
      await handleActionOffline(action, hid, taskId, data);
      
      const queueMessage = isNorwegian 
        ? "Handlingen er lagret og vil synkroniseres senere"
        : "Action saved and will sync later";
      appEvents.emit("toast", { 
        message: queueMessage, 
        type: "info",
        duration: 4000 
      });
      
    } catch (offlineError) {
      console.error(`[push] Failed to queue action offline:`, offlineError);
      
      const errorMessage = isNorwegian 
        ? "Handlingen mislyktes. Sjekk nettverksforbindelsen."
        : "Action failed. Please check your network connection.";
      appEvents.emit("toast", { 
        message: errorMessage, 
        type: "error",
        duration: 6000 
      });
      
      // Report error to analytics if available
      reportActionError(action, error, offlineError);
    }
  }
}

async function executeAction(action: string, hid: string, taskId: string, data: any): Promise<void> {
  switch (action) {
    case "ACCEPT_TASK":
      return await handleAcceptAction(hid, taskId);
    case "COMPLETE_TASK":
      return await handleCompleteAction(hid, taskId);
    case "SNOOZE_30MIN":
      return await handleSnoozeAction(hid, taskId, 30);
    case "SNOOZE_2TIMER":
      return await handleSnoozeAction(hid, taskId, 120);
    case "SNOOZE_IMORGEN":
      return await handleSnoozeTomorrowAction(hid, taskId);
    case "SNOOZE_NESTEUKE":
      return await handleSnoozeNextWeekAction(hid, taskId);
    case "REASSIGN_TASK":
      return await handleReassignAction(hid, taskId, data.reassignTo);
    case "QUICK_ADD_RELATED":
      return await handleQuickAddRelatedAction(hid, taskId, data.relatedTaskTitle);
    case "SNOOZE_15": // Legacy support
      return await handleSnoozeAction(hid, taskId, 15);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function getActionSuccessMessage(action: string, isNorwegian: boolean): string {
  const messages: Record<string, { no: string; en: string }> = {
    "ACCEPT_TASK": { no: "Oppgave akseptert!", en: "Task accepted!" },
    "COMPLETE_TASK": { no: "Flott jobbet!", en: "Great job!" },
    "SNOOZE_30MIN": { no: "Utsatt 30 minutter", en: "Snoozed 30 minutes" },
    "SNOOZE_2TIMER": { no: "Utsatt 2 timer", en: "Snoozed 2 hours" },
    "SNOOZE_IMORGEN": { no: "Utsatt til i morgen", en: "Snoozed until tomorrow" },
    "SNOOZE_NESTEUKE": { no: "Utsatt til neste uke", en: "Snoozed until next week" },
    "REASSIGN_TASK": { no: "Åpner omfordeling...", en: "Opening reassignment..." },
    "QUICK_ADD_RELATED": { no: "Åpner ny oppgave...", en: "Opening new task..." }
  };
  
  const message = messages[action];
  return message ? (isNorwegian ? message.no : message.en) : 
    (isNorwegian ? "Handling fullført" : "Action completed");
}

function reportActionError(action: string, primaryError: Error, fallbackError?: Error): void {
  // This would integrate with analytics/monitoring service
  console.group(`[push] Action Error Report: ${action}`);
  console.error("Primary error:", primaryError);
  if (fallbackError) {
    console.error("Fallback error:", fallbackError);
  }
  console.groupEnd();
  
  // In a production app, this would send to monitoring service like Sentry
  // Example:
  // Sentry.captureException(primaryError, {
  //   tags: { action, stage: "primary" },
  //   extra: { fallbackError: fallbackError?.message }
  // });
}

// Network connectivity helper
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Simple network check - in production this could use NetInfo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://firestore.googleapis.com/', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Intelligent retry scheduler for offline actions
export async function scheduleIntelligentRetry(): Promise<void> {
  const { flushOutbox, getOutboxCount } = await import("./outbox");
  
  try {
    const hasItems = (await getOutboxCount()) > 0;
    if (!hasItems) return;
    
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      console.log("[push] Network not available, scheduling retry...");
      setTimeout(scheduleIntelligentRetry, 30000); // Retry in 30 seconds
      return;
    }
    
    console.log("[push] Network available, attempting to flush outbox...");
    const result = await flushOutbox();
    
    const preferences = await norwegianCulture.getCulturalPreferences();
    const isNorwegian = preferences.preferNorwegianLanguage;
    
    if (result.ok > 0) {
      const message = isNorwegian 
        ? `${result.ok} handlinger synkronisert!`
        : `${result.ok} actions synced!`;
      appEvents.emit("toast", { message, type: "success" });
    }
    
    if (result.fail > 0) {
      const message = isNorwegian 
        ? `${result.fail} handlinger venter fortsatt`
        : `${result.fail} actions still pending`;
      appEvents.emit("toast", { message, type: "warning" });
      
      // Schedule another retry if there are still failures
      setTimeout(scheduleIntelligentRetry, 60000); // Retry in 1 minute
    }
    
  } catch (error) {
    console.warn("[push] Retry scheduling failed:", error);
    setTimeout(scheduleIntelligentRetry, 60000); // Retry in 1 minute
  }
}
