// Norwegian Notification Management Service
// Handles intelligent push notification scheduling with Norwegian cultural context

import * as Notifications from "expo-notifications";
import { norwegianCulture, NorwegianCulturalPreferences } from "./norwegianCulture";
import { Task } from "../models/task";
import { Child } from "./children";

export type NorwegianNotificationContext = {
  taskType: "chore" | "homework" | "reminder" | "event" | "family";
  priority: "low" | "medium" | "high";
  targetAudience: "parent" | "child" | "family";
  culturalContext?: "school" | "friluftsliv" | "hygge" | "family_time";
  seasonalContext?: "vinter" | "vår" | "sommer" | "høst";
};

export type NorwegianNotificationSchedule = {
  immediate: boolean;
  delay?: number; // milliseconds
  channel: string;
  actions: string[]; // Action identifiers
  culturalMessage?: string;
};

export class NorwegianNotificationService {
  private preferences: NorwegianCulturalPreferences | null = null;

  async init(): Promise<void> {
    this.preferences = await norwegianCulture.getCulturalPreferences();
  }

  // Schedule a culturally appropriate notification
  async scheduleNorwegianNotification(
    task: Task,
    context: NorwegianNotificationContext,
    child?: Child
  ): Promise<NorwegianNotificationSchedule> {
    if (!this.preferences) await this.init();

    const schedule = this.calculateNorwegianSchedule(context);
    const actions = this.getNorwegianActions(task, context, child);
    const message = this.getNorwegianMessage(task, context, child);

    return {
      ...schedule,
      actions,
      culturalMessage: message
    };
  }

  // Calculate when to deliver notification based on Norwegian cultural context
  private calculateNorwegianSchedule(context: NorwegianNotificationContext): {
    immediate: boolean;
    delay?: number;
    channel: string;
  } {
    if (!this.preferences) {
      return { immediate: true, channel: "default" };
    }

    // Respect Norwegian quiet hours (20:00-07:00)
    if (this.preferences.respectQuietHours && norwegianCulture.isWithinQuietHours()) {
      const delay = norwegianCulture.getNotificationDelay();
      return {
        immediate: false,
        delay,
        channel: "silent"
      };
    }

    // Handle friluftsliv context - Norwegian outdoor family time
    if (this.preferences.includeFriluftsliv && norwegianCulture.isWithinFriluftsliv()) {
      // For high priority tasks during friluftsliv time, use gentle notifications
      if (context.priority === "high") {
        return {
          immediate: true,
          channel: "friluftsliv"
        };
      }
      
      // For non-urgent tasks, delay until after outdoor time
      const delay = 30 * 60 * 1000; // 30 minutes
      return {
        immediate: false,
        delay,
        channel: "default"
      };
    }

    // Standard delivery during normal hours
    return {
      immediate: true,
      channel: norwegianCulture.getNotificationChannel()
    };
  }

  // Get appropriate rich actions based on Norwegian context
  private getNorwegianActions(
    task: Task, 
    context: NorwegianNotificationContext, 
    child?: Child
  ): string[] {
    const isNorwegian = this.preferences?.preferNorwegianLanguage ?? true;
    
    // Base actions for all notifications
    const baseActions = ["norwegian_task_actions"];

    // Add context-specific actions
    if (context.taskType === "homework" || context.culturalContext === "school") {
      // School-related tasks: Complete, Snooze until after school, Tomorrow
      return ["norwegian_task_actions"];
    }

    if (context.taskType === "chore" && context.targetAudience === "family") {
      // Family chores: Accept, Complete, Reassign to another family member
      return ["norwegian_family_actions"];
    }

    if (context.priority === "low") {
      // Low priority: Extended snooze options
      return ["norwegian_extended_actions"];
    }

    return baseActions;
  }

  // Generate Norwegian cultural message for notification
  private getNorwegianMessage(
    task: Task,
    context: NorwegianNotificationContext,
    child?: Child
  ): string {
    if (!this.preferences?.preferNorwegianLanguage) {
      return ""; // Use default English messages
    }

    const timeOfDay = this.getTimeOfDay();
    let message = "";

    // Add appropriate greeting
    if (context.targetAudience === "child" && child) {
      const greeting = norwegianCulture.getNorwegianGreeting(timeOfDay);
      message += `${greeting} `;
    }

    // Add cultural context
    if (context.culturalContext === "school") {
      message += "Husk på skoleoppgavene dine. ";
    } else if (context.culturalContext === "friluftsliv") {
      message += "Når dere er ferdige med utendørsaktivitetene: ";
    } else if (context.culturalContext === "family_time") {
      message += "Familietid er viktig, men ikke glem: ";
    }

    // Add seasonal context
    if (context.seasonalContext) {
      const season = context.seasonalContext;
      const seasonalMessages = {
        vinter: "I vintermørket er det ekstra viktig å holde rutinene. ",
        vår: "Våren kommer, tid for å komme i gang med: ",
        sommer: "Sommertid er avslappet, men husk på: ",
        høst: "Høsten er tid for forberedelser - "
      };
      message += seasonalMessages[season] || "";
    }

    // Add motivational element
    if (context.priority === "high") {
      message += "Du klarer dette! ";
    }

    return message.trim();
  }

  // Get Norwegian time-based category configuration
  getNorwegianCategoryConfig(taskType?: string): {
    categoryId: string;
    actions: Array<{
      identifier: string;
      buttonTitle: string;
      options?: { opensAppToForeground?: boolean };
    }>;
  } {
    const isNorwegian = this.preferences?.preferNorwegianLanguage ?? true;

    if (taskType === "homework" || taskType === "school") {
      return {
        categoryId: "norwegian_school_actions",
        actions: [
          {
            identifier: "COMPLETE_TASK",
            buttonTitle: isNorwegian ? "✅ Ferdig med lekser" : "✅ Complete homework",
            options: { opensAppToForeground: false }
          },
          {
            identifier: "SNOOZE_IMORGEN",
            buttonTitle: isNorwegian ? "📅 I morgen" : "📅 Tomorrow",
            options: { opensAppToForeground: false }
          },
          {
            identifier: "ACCEPT_TASK",
            buttonTitle: isNorwegian ? "📚 Start nå" : "📚 Start now",
            options: { opensAppToForeground: true }
          }
        ]
      };
    }

    // Default Norwegian actions
    return {
      categoryId: "norwegian_task_actions",
      actions: [
        {
          identifier: "COMPLETE_TASK",
          buttonTitle: isNorwegian ? "✅ Ferdig" : "✅ Complete",
          options: { opensAppToForeground: false }
        },
        {
          identifier: "SNOOZE_30MIN",
          buttonTitle: isNorwegian ? "⏰ 30 min" : "⏰ 30min",
          options: { opensAppToForeground: false }
        },
        {
          identifier: "SNOOZE_2TIMER",
          buttonTitle: isNorwegian ? "⏰ 2 timer" : "⏰ 2hrs",
          options: { opensAppToForeground: false }
        }
      ]
    };
  }

  // Helper to get time of day for greetings
  private getTimeOfDay(): "morning" | "afternoon" | "evening" | "motivational" {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    
    return "motivational"; // Default for other times
  }

  // Check if notification should be delivered now
  async shouldDeliverNow(context: NorwegianNotificationContext): Promise<{
    deliver: boolean;
    reason?: string;
    alternativeTime?: Date;
  }> {
    if (!this.preferences) await this.init();

    // Always deliver high priority notifications
    if (context.priority === "high") {
      return { deliver: true, reason: "high_priority" };
    }

    // Check Norwegian quiet hours
    if (this.preferences?.respectQuietHours && norwegianCulture.isWithinQuietHours()) {
      const nextMorning = new Date();
      if (nextMorning.getHours() >= 20) {
        nextMorning.setDate(nextMorning.getDate() + 1);
      }
      nextMorning.setHours(7, 0, 0, 0);
      
      return {
        deliver: false,
        reason: "quiet_hours",
        alternativeTime: nextMorning
      };
    }

    // Check friluftsliv context
    if (this.preferences?.includeFriluftsliv && norwegianCulture.isWithinFriluftsliv()) {
      // For non-family tasks, delay during outdoor time
      if (context.targetAudience !== "family" && context.taskType !== "family") {
        const laterTime = new Date();
        laterTime.setMinutes(laterTime.getMinutes() + 30);
        
        return {
          deliver: false,
          reason: "friluftsliv_time",
          alternativeTime: laterTime
        };
      }
    }

    return { deliver: true };
  }

  // Get Norwegian notification summary for analytics
  getNotificationAnalytics(): {
    quietHoursRespected: number;
    friluftsliv Considerations: number;
    culturalAdaptations: number;
  } {
    // This would track how often Norwegian cultural considerations affected notifications
    // Implementation would require persistent storage of metrics
    return {
      quietHoursRespected: 0,
      friluftsliv Considerations: 0,
      culturalAdaptations: 0
    };
  }
}

// Export singleton instance
export const norwegianNotifications = new NorwegianNotificationService();

// Utility functions for Norwegian notification management
export async function scheduleNorwegianTaskNotification(
  task: Task,
  context: NorwegianNotificationContext,
  child?: Child
): Promise<string | null> {
  try {
    const schedule = await norwegianNotifications.scheduleNorwegianNotification(task, context, child);
    
    const notificationContent: Notifications.NotificationContentInput = {
      title: task.title,
      body: schedule.culturalMessage || `Task: ${task.title}`,
      data: {
        hid: task.householdId,
        taskId: task.id,
        type: "task",
        culturalContext: context.culturalContext,
        targetAudience: context.targetAudience
      },
      categoryIdentifier: schedule.actions[0], // Use first action category
      sound: schedule.channel === "silent" ? undefined : "default"
    };

    const trigger: Notifications.NotificationTriggerInput = schedule.immediate 
      ? null 
      : { seconds: Math.floor((schedule.delay || 0) / 1000) };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger
    });

    return notificationId;
  } catch (error) {
    console.warn("[norwegianNotifications] Failed to schedule notification:", error);
    return null;
  }
}

export function isNorwegianWorkingHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Norwegian working hours: Monday-Friday, 08:00-16:00
  return day >= 1 && day <= 5 && hour >= 8 && hour <= 16;
}

export function getNorwegianTaskContext(task: Task, child?: Child): NorwegianNotificationContext {
  // Intelligent context detection based on task properties
  
  let taskType: NorwegianNotificationContext["taskType"] = "chore";
  let culturalContext: NorwegianNotificationContext["culturalContext"] = undefined;
  let targetAudience: NorwegianNotificationContext["targetAudience"] = "parent";

  // Detect task type from title or tags
  const title = task.title?.toLowerCase() || "";
  const tags = (task.tags as string[]) || [];
  
  if (title.includes("lekser") || title.includes("homework") || tags.includes("school")) {
    taskType = "homework";
    culturalContext = "school";
  }
  
  if (child) {
    targetAudience = "child";
  }

  // Determine priority
  let priority: NorwegianNotificationContext["priority"] = "medium";
  if (task.priority === "high") priority = "high";
  if (task.priority === "low") priority = "low";

  // Add seasonal context
  const month = new Date().getMonth() + 1;
  let seasonalContext: NorwegianNotificationContext["seasonalContext"];
  
  if (month >= 12 || month <= 2) seasonalContext = "vinter";
  else if (month >= 3 && month <= 5) seasonalContext = "vår";
  else if (month >= 6 && month <= 8) seasonalContext = "sommer";
  else seasonalContext = "høst";

  return {
    taskType,
    priority,
    targetAudience,
    culturalContext,
    seasonalContext
  };
}