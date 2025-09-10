// Norwegian Family Day Summary Service
// Aggregates daily intelligence for Norwegian families from multiple sources

import dayjs from "dayjs";
import { Task } from "../models/task";
import { Child } from "./children";
import { fetchTasksInRange, fetchTodayTasks } from "./tasks";
import { fetchNextDaySummary, SchoolSummary } from "./schoolSummary";
import { norwegianHolidayIntelligence } from "./norwegianHolidayIntelligence";
import { fetchUserGroups } from "./groups";
import { fetchUserEvents } from "./events";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CriticalAlert = {
  id: string;
  type: "school_emergency" | "schedule_conflict" | "missing_info" | "system_alert";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  createdAt: Date;
};

export type SchoolAnomaly = {
  childId: string;
  childName: string;
  type: "schedule_change" | "no_data" | "unusual_event" | "early_dismissal";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  timeAffected?: string;
  requiresAction: boolean;
};

export type FamilyScheduleItem = {
  id: string;
  type: "task" | "event" | "school" | "cultural";
  title: string;
  time: string;
  duration?: number;
  assignedTo?: string[];
  priority: "high" | "medium" | "low";
  status?: "pending" | "in_progress" | "completed";
  conflictsWith?: string[];
  norwegianContext?: string;
};

export type CulturalContext = {
  id: string;
  type: "holiday" | "seasonal" | "tradition" | "weather";
  title: string;
  description: string;
  activities: string[];
  timeframe: "morning" | "afternoon" | "evening" | "all_day";
  weatherDependent: boolean;
  familyFriendly: boolean;
  localRelevance: number; // 0-1 score
};

export type CommunityConnection = {
  id: string;
  type: "local_event" | "group_activity" | "neighborhood" | "school_community";
  title: string;
  description: string;
  time?: string;
  location?: string;
  ageAppropriate: number[]; // grades
  signupRequired: boolean;
  cost: "free" | "low" | "medium" | "high";
  deadline?: string;
};

export type FamilyDaySummaryData = {
  generatedAt: Date;
  date: string; // YYYY-MM-DD
  greeting: string;
  criticalAlerts: CriticalAlert[];
  schoolUpdates: {
    childId: string;
    childName: string;
    schoolName?: string;
    todaysSchedule?: SchoolSummary;
    anomalies: SchoolAnomaly[];
    lastSyncAt?: Date;
  }[];
  familySchedule: FamilyScheduleItem[];
  culturalContext: CulturalContext[];
  communityConnections: CommunityConnection[];
  weatherSummary?: {
    temperature: number;
    conditions: string;
    outdoorRecommendation: string;
    clothingAdvice: string;
  };
  cacheExpiresAt: Date;
};

class FamilyDaySummaryService {
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_KEY_PREFIX = "family_day_summary_";

  /**
   * Get comprehensive family day summary for Norwegian families
   */
  async getDaySummary(
    householdId: string,
    children: Child[],
    userId: string,
    date?: Date
  ): Promise<FamilyDaySummaryData> {
    const targetDate = date || new Date();
    const dateKey = dayjs(targetDate).format("YYYY-MM-DD");
    const cacheKey = `${this.CACHE_KEY_PREFIX}${householdId}_${dateKey}`;

    // Try cached data first
    const cached = await this.getCachedSummary(cacheKey);
    if (cached && cached.cacheExpiresAt > new Date()) {
      return cached;
    }

    // Generate fresh summary
    const summary = await this.generateFreshSummary(
      householdId,
      children,
      userId,
      targetDate
    );

    // Cache the result
    await this.cacheSummary(cacheKey, summary);
    
    return summary;
  }

  /**
   * Generate a fresh daily summary from all data sources
   */
  private async generateFreshSummary(
    householdId: string,
    children: Child[],
    userId: string,
    date: Date
  ): Promise<FamilyDaySummaryData> {
    const dateKey = dayjs(date).format("YYYY-MM-DD");
    
    // Run parallel data fetching for better performance
    const [
      todayTasks,
      schoolData,
      holidayIntelligence,
      userGroups,
      userEvents
    ] = await Promise.allSettled([
      this.fetchTodayTasks(householdId, date),
      this.fetchSchoolData(children),
      this.fetchHolidayIntelligence(householdId, children),
      this.fetchCommunityData(userId),
      this.fetchTodayEvents(userId, date)
    ]);

    // Process results with error handling
    const tasks = todayTasks.status === "fulfilled" ? todayTasks.value : [];
    const schools = schoolData.status === "fulfilled" ? schoolData.value : [];
    const holidays = holidayIntelligence.status === "fulfilled" ? holidayIntelligence.value : [];
    const groups = userGroups.status === "fulfilled" ? userGroups.value : [];
    const events = userEvents.status === "fulfilled" ? userEvents.value : [];

    return {
      generatedAt: new Date(),
      date: dateKey,
      greeting: this.generateNorwegianGreeting(),
      criticalAlerts: await this.analyzeCriticalAlerts(tasks, schools, events),
      schoolUpdates: await this.analyzeSchoolUpdates(schools, children),
      familySchedule: await this.compileFamilySchedule(tasks, events, schools),
      culturalContext: await this.generateCulturalContext(holidays, date),
      communityConnections: await this.analyzeCommunityConnections(groups, events, children),
      weatherSummary: await this.getWeatherSummary(),
      cacheExpiresAt: new Date(Date.now() + this.CACHE_DURATION),
    };
  }

  /**
   * Fetch today's family tasks
   */
  private async fetchTodayTasks(householdId: string, date: Date): Promise<Task[]> {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    
    try {
      return await fetchTasksInRange(householdId, start, end, { priorityOrder: "desc" });
    } catch (error) {
      console.warn("Failed to fetch tasks for family day summary:", error);
      return [];
    }
  }

  /**
   * Fetch school data for all children
   */
  private async fetchSchoolData(children: Child[]): Promise<Array<{
    child: Child;
    schoolSummary: SchoolSummary | null;
    anomalies: SchoolAnomaly[];
  }>> {
    const results = await Promise.allSettled(
      children
        .filter(child => child.school?.crawlerGradeId || child.school?.website)
        .map(async (child) => {
          const schoolId = child.school?.crawlerGradeId || child.school?.website;
          if (!schoolId) return { child, schoolSummary: null, anomalies: [] };

          try {
            const schoolSummary = await fetchNextDaySummary(schoolId);
            const anomalies = this.detectSchoolAnomalies(child, schoolSummary);
            
            return { child, schoolSummary, anomalies };
          } catch (error) {
            console.warn(`Failed to fetch school data for ${child.displayName}:`, error);
            return {
              child,
              schoolSummary: null,
              anomalies: [{
                childId: child.id,
                childName: child.displayName,
                type: "no_data" as const,
                title: "Kunne ikke hente skoledata",
                description: "Kan ikke koble til barnets skole akkurat nå. Sjekk manuelt hvis nødvendig.",
                severity: "low" as const,
                requiresAction: false
              }]
            };
          }
        })
    );

    return results
      .filter(result => result.status === "fulfilled")
      .map(result => (result as PromiseFulfilledResult<any>).value);
  }

  /**
   * Fetch Norwegian holiday intelligence
   */
  private async fetchHolidayIntelligence(householdId: string, children: Child[]) {
    try {
      return await norwegianHolidayIntelligence.getHolidayIntelligence(householdId, children, 7);
    } catch (error) {
      console.warn("Failed to fetch holiday intelligence:", error);
      return [];
    }
  }

  /**
   * Fetch user's community groups
   */
  private async fetchCommunityData(userId: string) {
    try {
      return await fetchUserGroups(userId);
    } catch (error) {
      console.warn("Failed to fetch user groups:", error);
      return [];
    }
  }

  /**
   * Fetch today's events
   */
  private async fetchTodayEvents(userId: string, date: Date) {
    try {
      const start = dayjs(date).startOf("day").toDate();
      const end = dayjs(date).endOf("day").toDate();
      return await fetchUserEvents(userId, { start, end });
    } catch (error) {
      console.warn("Failed to fetch today's events:", error);
      return [];
    }
  }

  /**
   * Generate Norwegian morning greeting
   */
  private generateNorwegianGreeting(): string {
    const hour = new Date().getHours();
    const greetings = [
      "God morgen, Familie",
      "Ha en strålende dag",
      "Velkommen til en ny dag",
      "God morgen og ha det fint"
    ];
    
    if (hour < 10) return greetings[0];
    if (hour < 12) return greetings[Math.floor(Math.random() * greetings.length)];
    return "God dag, Familie";
  }

  /**
   * Analyze critical alerts that need immediate attention
   */
  private async analyzeCriticalAlerts(
    tasks: Task[],
    schoolData: any[],
    events: any[]
  ): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = [];

    // Check for overdue high-priority tasks
    const overdueTasks = tasks.filter(task => 
      task.dueAt && dayjs(task.dueAt).isBefore(dayjs()) && 
      task.priority && task.priority >= 8
    );

    if (overdueTasks.length > 0) {
      alerts.push({
        id: "overdue_high_priority",
        type: "schedule_conflict",
        severity: "high",
        title: `${overdueTasks.length} viktige oppgaver er forsinket`,
        description: "Du har viktige oppgaver som trenger oppmerksomhet i dag.",
        actionable: true,
        actionText: "Se oppgaver",
        dismissible: true,
        createdAt: new Date()
      });
    }

    // Check for school data issues
    const schoolIssues = schoolData.filter(data => data.anomalies.some(a => a.severity === "high"));
    if (schoolIssues.length > 0) {
      alerts.push({
        id: "school_issues",
        type: "school_emergency",
        severity: "high",
        title: "Viktige skoleoppdateringer",
        description: "Det er endringer i barnas skoledag som krever din oppmerksomhet.",
        actionable: true,
        actionText: "Se detaljer",
        dismissible: false,
        createdAt: new Date()
      });
    }

    // Check for schedule conflicts
    const conflicts = this.detectScheduleConflicts(tasks, events);
    if (conflicts.length > 0) {
      alerts.push({
        id: "schedule_conflicts",
        type: "schedule_conflict",
        severity: "medium",
        title: `${conflicts.length} tidskonflikt${conflicts.length > 1 ? 'er' : ''}`,
        description: "Du har overlappende aktiviteter som må løses.",
        actionable: true,
        actionText: "Løs konflikter",
        dismissible: true,
        createdAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Analyze school updates and anomalies
   */
  private async analyzeSchoolUpdates(schoolData: any[], children: Child[]) {
    return schoolData.map(data => ({
      childId: data.child.id,
      childName: data.child.displayName,
      schoolName: data.child.school?.name,
      todaysSchedule: data.schoolSummary,
      anomalies: data.anomalies,
      lastSyncAt: data.schoolSummary?.last_updated ? new Date(data.schoolSummary.last_updated) : undefined
    }));
  }

  /**
   * Compile family schedule with priorities and conflicts
   */
  private async compileFamilySchedule(
    tasks: Task[],
    events: any[],
    schoolData: any[]
  ): Promise<FamilyScheduleItem[]> {
    const schedule: FamilyScheduleItem[] = [];

    // Add high-priority tasks
    tasks
      .filter(task => task.priority && task.priority >= 6)
      .forEach(task => {
        schedule.push({
          id: task.id,
          type: "task",
          title: task.title,
          time: task.nextOccurrenceAt ? dayjs(task.nextOccurrenceAt).format("HH:mm") : "Hele dagen",
          assignedTo: task.assigneeIds,
          priority: task.priority >= 9 ? "high" : task.priority >= 7 ? "medium" : "low",
          status: task.status === "done" ? "completed" : task.status === "in_progress" ? "in_progress" : "pending"
        });
      });

    // Add events
    events.forEach(event => {
      schedule.push({
        id: event.id,
        type: "event",
        title: event.title,
        time: dayjs(event.startTime).format("HH:mm"),
        duration: event.endTime ? dayjs(event.endTime).diff(dayjs(event.startTime), "minutes") : undefined,
        priority: "medium"
      });
    });

    // Add school events
    schoolData.forEach(data => {
      if (data.schoolSummary?.events) {
        data.schoolSummary.events
          .filter((event: any) => event.type !== "lesson" || event.subject)
          .forEach((event: any) => {
            schedule.push({
              id: `school_${data.child.id}_${event.id}`,
              type: "school",
              title: `${data.child.displayName}: ${event.title}`,
              time: dayjs(event.start_time).format("HH:mm"),
              priority: event.type === "assembly" ? "high" : "medium",
              norwegianContext: `Skoleaktivitet for ${data.child.displayName}`
            });
          });
      }
    });

    // Sort by time and priority
    return schedule.sort((a, b) => {
      if (a.time === "Hele dagen" && b.time !== "Hele dagen") return 1;
      if (b.time === "Hele dagen" && a.time !== "Hele dagen") return -1;
      if (a.time === b.time) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.time.localeCompare(b.time);
    });
  }

  /**
   * Generate cultural context based on Norwegian traditions and season
   */
  private async generateCulturalContext(
    holidayIntelligence: any[],
    date: Date
  ): Promise<CulturalContext[]> {
    const context: CulturalContext[] = [];
    const season = this.getCurrentSeason();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Add holiday contexts
    holidayIntelligence.forEach(intel => {
      if (intel.traditionalCelebrations?.length > 0) {
        context.push({
          id: `holiday_${intel.holiday.name}`,
          type: "holiday",
          title: intel.holiday.name,
          description: intel.holiday.description || `Tradisjonell norsk helligdag`,
          activities: intel.traditionalCelebrations,
          timeframe: "all_day",
          weatherDependent: false,
          familyFriendly: true,
          localRelevance: 0.9
        });
      }
    });

    // Add seasonal context
    const seasonalActivities = this.getSeasonalActivities(season, month, day);
    if (seasonalActivities.length > 0) {
      context.push({
        id: `seasonal_${season}`,
        type: "seasonal",
        title: `Typiske ${season}aktiviteter`,
        description: `Aktiviteter som passer godt for årstiden`,
        activities: seasonalActivities,
        timeframe: "all_day",
        weatherDependent: true,
        familyFriendly: true,
        localRelevance: 0.7
      });
    }

    return context;
  }

  /**
   * Analyze community connections and opportunities
   */
  private async analyzeCommunityConnections(
    groups: any[],
    events: any[],
    children: Child[]
  ): Promise<CommunityConnection[]> {
    const connections: CommunityConnection[] = [];

    // Add group activities
    groups.forEach(group => {
      if (group.upcomingEvents) {
        group.upcomingEvents.forEach((event: any) => {
          connections.push({
            id: `group_${group.id}_${event.id}`,
            type: "group_activity",
            title: event.title,
            description: `${group.name}: ${event.description || "Gruppearrangement"}`,
            time: event.startTime ? dayjs(event.startTime).format("HH:mm") : undefined,
            location: event.location?.name,
            ageAppropriate: children.map(c => c.currentGrade).filter(Boolean) as number[],
            signupRequired: event.requiresSignup || false,
            cost: event.cost || "free"
          });
        });
      }
    });

    // Add local events
    events
      .filter(event => event.type === "local_event" || event.location)
      .forEach(event => {
        connections.push({
          id: `local_${event.id}`,
          type: "local_event",
          title: event.title,
          description: event.description || "Lokalt arrangement",
          time: dayjs(event.startTime).format("HH:mm"),
          location: event.location?.name,
          ageAppropriate: [1,2,3,4,5,6,7,8,9,10], // Default to all ages
          signupRequired: false,
          cost: "free"
        });
      });

    return connections.slice(0, 5); // Limit to 5 connections
  }

  /**
   * Get weather summary with Norwegian outdoor recommendations
   */
  private async getWeatherSummary() {
    // This would integrate with a Norwegian weather API
    // For now, return a placeholder
    return {
      temperature: 12,
      conditions: "Delvis skyet",
      outdoorRecommendation: "Godt vær for utendørsaktiviteter",
      clothingAdvice: "Lag på lag - ta med jakke"
    };
  }

  /**
   * Helper methods
   */

  private detectSchoolAnomalies(child: Child, schoolSummary: SchoolSummary | null): SchoolAnomaly[] {
    const anomalies: SchoolAnomaly[] = [];

    if (!schoolSummary) {
      return [{
        childId: child.id,
        childName: child.displayName,
        type: "no_data",
        title: "Ingen skoledata tilgjengelig",
        description: "Kunne ikke hente dagens skoleplan.",
        severity: "medium",
        requiresAction: false
      }];
    }

    // Check for unusual schedule
    if (schoolSummary.events.length < 3) {
      anomalies.push({
        childId: child.id,
        childName: child.displayName,
        type: "schedule_change",
        title: "Kort skoledag",
        description: "Færre timer enn vanlig i dag. Sjekk om det er tidlig slutt.",
        severity: "medium",
        requiresAction: true
      });
    }

    // Check for special events
    const specialEvents = schoolSummary.events.filter(event => 
      event.type === "assembly" || event.title.toLowerCase().includes("arrangement")
    );
    
    if (specialEvents.length > 0) {
      anomalies.push({
        childId: child.id,
        childName: child.displayName,
        type: "unusual_event",
        title: "Spesielt arrangement",
        description: `${specialEvents[0].title} - kan påvirke normal skoledag`,
        severity: "low",
        requiresAction: false
      });
    }

    return anomalies;
  }

  private detectScheduleConflicts(tasks: Task[], events: any[]): any[] {
    // Simple conflict detection - would be more sophisticated in production
    const conflicts: any[] = [];
    const allItems = [
      ...tasks.map(t => ({ id: t.id, time: t.nextOccurrenceAt, type: "task", title: t.title })),
      ...events.map(e => ({ id: e.id, time: e.startTime, type: "event", title: e.title }))
    ].filter(item => item.time);

    // Sort by time and look for overlaps
    allItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    for (let i = 0; i < allItems.length - 1; i++) {
      const current = allItems[i];
      const next = allItems[i + 1];
      const currentEnd = new Date(new Date(current.time).getTime() + 60 * 60 * 1000); // Assume 1 hour
      
      if (new Date(next.time) < currentEnd) {
        conflicts.push({
          items: [current, next],
          severity: "medium"
        });
      }
    }

    return conflicts;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return "vinter";
    if (month >= 3 && month <= 5) return "vår";
    if (month >= 6 && month <= 8) return "sommer";
    return "høst";
  }

  private getSeasonalActivities(season: string, month: number, day: number): string[] {
    const activities: Record<string, string[]> = {
      vinter: ["Skitur", "Skøyting", "Kaking og kos", "Vinterleker"],
      vår: ["Naturvandring", "Påskeegg", "Blomsterplukking", "Rydding i hagen"],
      sommer: ["Bading", "Hytteweekend", "Utendørs lek", "Grilling", "Friluftsliv"],
      høst: ["Sopptur", "Bærplukking", "Fjelltur", "Innendørs kosetime"]
    };

    return activities[season] || [];
  }

  /**
   * Caching methods
   */
  private async getCachedSummary(cacheKey: string): Promise<FamilyDaySummaryData | null> {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      // Convert date strings back to Date objects
      return {
        ...data,
        generatedAt: new Date(data.generatedAt),
        cacheExpiresAt: new Date(data.cacheExpiresAt),
        criticalAlerts: data.criticalAlerts.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt)
        }))
      };
    } catch (error) {
      console.warn("Failed to get cached family day summary:", error);
      return null;
    }
  }

  private async cacheSummary(cacheKey: string, summary: FamilyDaySummaryData): Promise<void> {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(summary));
    } catch (error) {
      console.warn("Failed to cache family day summary:", error);
    }
  }
}

// Export singleton instance
export const familyDaySummaryService = new FamilyDaySummaryService();