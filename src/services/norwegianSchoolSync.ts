// Real-time Norwegian School Sync Service
import { fetchNextDaySummary, SchoolEvent, SchoolSummary } from "./schoolSummary";
import { Child, listChildren } from "./children";
import { norwegianCalendar, SchoolCalendarData } from "./norwegianCalendar";
import { conflictDetector } from "./scheduleConflicts";
import { listTasks } from "./tasks";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export type NorwegianSchoolSyncResult = {
  childId: string;
  childName: string;
  status: SyncStatus;
  lastSyncAt: Date;
  nextSyncAt: Date;
  changesDetected: boolean;
  newEvents: SchoolEvent[];
  modifiedEvents: SchoolEvent[];
  cancelledEvents: SchoolEvent[];
  conflictsDetected: number;
  error?: string;
};

export type SyncPreferences = {
  enableBackgroundSync: boolean;
  syncFrequencyMinutes: number; // How often to check for changes
  quietHoursStart: string; // "22:00" format
  quietHoursEnd: string; // "07:00" format
  notificationPreferences: {
    scheduleChanges: boolean;
    newEvents: boolean; 
    cancellations: boolean;
    conflicts: boolean;
    holidayReminders: boolean;
  };
  norwegianSpecific: {
    respectNorwegianHolidays: boolean;
    includeSFOActivities: boolean;
    includeAKSActivities: boolean;
    preferNorwegianLanguage: boolean;
  };
};

export class NorwegianSchoolSyncService {
  private syncIntervalId?: NodeJS.Timeout;
  private isSyncing = false;
  private syncPreferences: SyncPreferences = {
    enableBackgroundSync: true,
    syncFrequencyMinutes: 30,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00", 
    notificationPreferences: {
      scheduleChanges: true,
      newEvents: true,
      cancellations: true,
      conflicts: true,
      holidayReminders: true,
    },
    norwegianSpecific: {
      respectNorwegianHolidays: true,
      includeSFOActivities: true,
      includeAKSActivities: true,
      preferNorwegianLanguage: true,
    }
  };

  // Start background sync for all children in household
  async startBackgroundSync(householdId: string): Promise<void> {
    await this.loadSyncPreferences();
    
    if (!this.syncPreferences.enableBackgroundSync) {
      return;
    }

    // Clear any existing sync
    this.stopBackgroundSync();

    // Start periodic sync
    this.syncIntervalId = setInterval(async () => {
      if (this.isInQuietHours()) {
        console.log("Skipping sync during Norwegian quiet hours");
        return;
      }

      await this.syncHouseholdSchoolData(householdId);
    }, this.syncPreferences.syncFrequencyMinutes * 60 * 1000);

    // Do initial sync
    await this.syncHouseholdSchoolData(householdId);
  }

  // Stop background sync
  stopBackgroundSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  // Sync school data for all children in household
  async syncHouseholdSchoolData(householdId: string): Promise<NorwegianSchoolSyncResult[]> {
    if (this.isSyncing) {
      console.log("Sync already in progress, skipping");
      return [];
    }

    this.isSyncing = true;
    const results: NorwegianSchoolSyncResult[] = [];

    try {
      const children = await listChildren(householdId);
      const schoolChildren = children.filter(child => 
        child.school && child.school.syncEnabled
      );

      console.log(`Starting Norwegian school sync for ${schoolChildren.length} children`);

      // Sync each child's school data
      for (const child of schoolChildren) {
        const result = await this.syncChildSchoolData(child);
        results.push(result);

        // Send notifications if changes detected
        if (result.changesDetected && result.status === "success") {
          await this.sendChangeNotifications(child, result);
        }
      }

      // Check for conflicts after all data is synced
      await this.checkForNewConflicts(householdId, schoolChildren);

    } catch (error) {
      console.error("Failed to sync Norwegian school data:", error);
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  // Sync school data for individual child
  private async syncChildSchoolData(child: Child): Promise<NorwegianSchoolSyncResult> {
    const result: NorwegianSchoolSyncResult = {
      childId: child.id,
      childName: child.displayName,
      status: "syncing",
      lastSyncAt: new Date(),
      nextSyncAt: this.calculateNextSyncTime(),
      changesDetected: false,
      newEvents: [],
      modifiedEvents: [],
      cancelledEvents: [],
      conflictsDetected: 0
    };

    try {
      if (!child.school?.website) {
        throw new Error("No school website configured");
      }

      // Get current calendar data
      const previousData = await this.getCachedSchoolData(child.id);
      
      // Fetch latest data from School Crawler Platform
      const currentData = await norwegianCalendar.getChildCalendarData(child);
      
      if (!currentData) {
        throw new Error("Failed to fetch school data");
      }

      // Compare and detect changes
      const changes = this.detectChanges(previousData, currentData);
      result.newEvents = changes.newEvents;
      result.modifiedEvents = changes.modifiedEvents;
      result.cancelledEvents = changes.cancelledEvents;
      result.changesDetected = changes.hasChanges;

      // Cache the new data
      await this.cacheSchoolData(child.id, currentData);
      
      // Update sync status
      result.status = "success";
      
    } catch (error) {
      result.status = "error";
      result.error = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to sync ${child.displayName}'s school data:`, error);
    }

    return result;
  }

  // Detect changes between old and new school data
  private detectChanges(
    previousData: SchoolCalendarData | null, 
    currentData: SchoolCalendarData
  ): {
    hasChanges: boolean;
    newEvents: SchoolEvent[];
    modifiedEvents: SchoolEvent[];
    cancelledEvents: SchoolEvent[];
  } {
    if (!previousData) {
      return {
        hasChanges: currentData.events.length > 0,
        newEvents: currentData.events,
        modifiedEvents: [],
        cancelledEvents: []
      };
    }

    const newEvents: SchoolEvent[] = [];
    const modifiedEvents: SchoolEvent[] = [];
    const cancelledEvents: SchoolEvent[] = [];

    // Find new and modified events
    for (const currentEvent of currentData.events) {
      const previousEvent = previousData.events.find(e => e.id === currentEvent.id);
      
      if (!previousEvent) {
        newEvents.push(currentEvent);
      } else if (this.hasEventChanged(previousEvent, currentEvent)) {
        modifiedEvents.push(currentEvent);
      }
    }

    // Find cancelled events
    for (const previousEvent of previousData.events) {
      const currentEvent = currentData.events.find(e => e.id === previousEvent.id);
      if (!currentEvent) {
        cancelledEvents.push(previousEvent);
      }
    }

    return {
      hasChanges: newEvents.length > 0 || modifiedEvents.length > 0 || cancelledEvents.length > 0,
      newEvents,
      modifiedEvents,
      cancelledEvents
    };
  }

  // Check if event has changed
  private hasEventChanged(oldEvent: SchoolEvent, newEvent: SchoolEvent): boolean {
    return oldEvent.start_time !== newEvent.start_time ||
           oldEvent.end_time !== newEvent.end_time ||
           oldEvent.title !== newEvent.title ||
           oldEvent.location !== newEvent.location;
  }

  // Send notifications for school changes
  private async sendChangeNotifications(child: Child, result: NorwegianSchoolSyncResult): Promise<void> {
    if (!this.syncPreferences.notificationPreferences.scheduleChanges) {
      return;
    }

    const { newEvents, modifiedEvents, cancelledEvents } = result;
    const totalChanges = newEvents.length + modifiedEvents.length + cancelledEvents.length;

    if (totalChanges === 0) return;

    let title: string;
    let body: string;

    if (this.syncPreferences.norwegianSpecific.preferNorwegianLanguage) {
      title = `Endringer i ${child.displayName}s skoleplan`;
      body = `${totalChanges} endring${totalChanges > 1 ? 'er' : ''} oppdaget i skoletimeplanen.`;
    } else {
      title = `Changes in ${child.displayName}'s school schedule`;
      body = `${totalChanges} change${totalChanges > 1 ? 's' : ''} detected in the school schedule.`;
    }

    // Add specific details
    if (newEvents.length > 0) {
      body += ` Nye: ${newEvents.length}.`;
    }
    if (modifiedEvents.length > 0) {
      body += ` Endret: ${modifiedEvents.length}.`;
    }
    if (cancelledEvents.length > 0) {
      body += ` Avlyst: ${cancelledEvents.length}.`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "norwegian_school_change",
          childId: child.id,
          childName: child.displayName,
          changes: { newEvents, modifiedEvents, cancelledEvents }
        },
      },
      trigger: null, // Send immediately
    });
  }

  // Check for new conflicts after sync
  private async checkForNewConflicts(householdId: string, children: Child[]): Promise<void> {
    if (!this.syncPreferences.notificationPreferences.conflicts) {
      return;
    }

    try {
      const tasks = await listTasks(householdId);
      const conflicts = await conflictDetector.detectConflicts(
        tasks,
        children,
        {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      );

      const highPriorityConflicts = conflicts.filter(c => 
        c.severity === "high" || c.severity === "critical"
      );

      if (highPriorityConflicts.length > 0) {
        const title = this.syncPreferences.norwegianSpecific.preferNorwegianLanguage
          ? "Ny plankonflikt oppdaget"
          : "New schedule conflict detected";
        
        const body = this.syncPreferences.norwegianSpecific.preferNorwegianLanguage
          ? `${highPriorityConflicts.length} viktig${highPriorityConflicts.length > 1 ? 'e' : ''} konflikt${highPriorityConflicts.length > 1 ? 'er' : ''} i familiens timeplan.`
          : `${highPriorityConflicts.length} important conflict${highPriorityConflicts.length > 1 ? 's' : ''} in family schedule.`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: "norwegian_schedule_conflict",
              conflicts: highPriorityConflicts.map(c => c.id)
            },
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error("Failed to check for conflicts:", error);
    }
  }

  // Helper functions
  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    
    const quietStart = this.syncPreferences.quietHoursStart;
    const quietEnd = this.syncPreferences.quietHoursEnd;
    
    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
    
    return currentTime >= quietStart && currentTime <= quietEnd;
  }

  private calculateNextSyncTime(): Date {
    const next = new Date();
    next.setMinutes(next.getMinutes() + this.syncPreferences.syncFrequencyMinutes);
    return next;
  }

  // Cache management
  private async cacheSchoolData(childId: string, data: SchoolCalendarData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `norwegian_school_sync_${childId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn("Failed to cache Norwegian school sync data:", error);
    }
  }

  private async getCachedSchoolData(childId: string): Promise<SchoolCalendarData | null> {
    try {
      const cached = await AsyncStorage.getItem(`norwegian_school_sync_${childId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn("Failed to get cached Norwegian school sync data:", error);
      return null;
    }
  }

  // Preferences management
  async updateSyncPreferences(preferences: Partial<SyncPreferences>): Promise<void> {
    this.syncPreferences = { ...this.syncPreferences, ...preferences };
    await AsyncStorage.setItem(
      "norwegian_school_sync_preferences",
      JSON.stringify(this.syncPreferences)
    );
  }

  private async loadSyncPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("norwegian_school_sync_preferences");
      if (stored) {
        this.syncPreferences = { ...this.syncPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn("Failed to load Norwegian school sync preferences:", error);
    }
  }

  // Manual sync trigger
  async syncNow(householdId: string): Promise<NorwegianSchoolSyncResult[]> {
    console.log("Manual Norwegian school sync triggered");
    return await this.syncHouseholdSchoolData(householdId);
  }

  // Get sync status
  getSyncStatus(): { isActive: boolean; isSyncing: boolean; preferences: SyncPreferences } {
    return {
      isActive: !!this.syncIntervalId,
      isSyncing: this.isSyncing,
      preferences: this.syncPreferences
    };
  }
}

// Export singleton instance
export const norwegianSchoolSync = new NorwegianSchoolSyncService();

// Utility functions for Norwegian school sync
export function formatNorwegianSyncTime(date: Date): string {
  return date.toLocaleString('nb-NO', {
    day: 'numeric',
    month: 'short', 
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isNorwegianSchoolTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Norwegian school hours are typically 8:00-15:00, Monday-Friday
  return day >= 1 && day <= 5 && hour >= 8 && hour <= 15;
}