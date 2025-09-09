// Intelligent Schedule Conflict Detection for Norwegian Families
import { Task } from "../models/task";
import { Child } from "./children";
import { SchoolEvent, SchoolCalendarData, norwegianCalendar } from "./norwegianCalendar";

export type ConflictType = 
  | "school_task_overlap" // School event conflicts with household task
  | "multiple_children" // Tasks for multiple children at same time
  | "norwegian_holiday" // Task scheduled during Norwegian holiday
  | "school_break" // Task during school break when child is home
  | "sfo_aks_conflict" // SFO/AKS activity conflicts with task
  | "travel_time" // Not enough time between school and home activities
  | "family_overload"; // Too many activities for family at once

export type ScheduleConflict = {
  id: string;
  type: ConflictType;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedTasks: Task[];
  affectedChildren?: Child[];
  conflictingEvents?: SchoolEvent[];
  suggestedResolutions: ConflictResolution[];
  detectedAt: Date;
  norwegianContext?: string; // Norwegian-specific context
};

export type ConflictResolution = {
  id: string;
  type: "reschedule" | "delegate" | "cancel" | "modify" | "accept_conflict";
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: string;
  autoApplicable: boolean;
};

export class NorwegianScheduleConflictDetector {
  // Detect conflicts for a household's schedule
  async detectConflicts(
    tasks: Task[],
    children: Child[],
    dateRange: { start: Date; end: Date }
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Get school calendar data for all children
    const childrenCalendars = new Map<string, SchoolCalendarData>();
    for (const child of children) {
      const calendar = await norwegianCalendar.getChildCalendarData(child);
      if (calendar) {
        childrenCalendars.set(child.id, calendar);
      }
    }

    // Detect different types of conflicts
    conflicts.push(...await this.detectSchoolTaskOverlaps(tasks, children, childrenCalendars));
    conflicts.push(...await this.detectNorwegianHolidayConflicts(tasks, children, childrenCalendars));
    conflicts.push(...await this.detectMultiChildConflicts(tasks, children));
    conflicts.push(...await this.detectSFOAKSConflicts(tasks, children, childrenCalendars));
    conflicts.push(...await this.detectTravelTimeConflicts(tasks, children, childrenCalendars));
    conflicts.push(...await this.detectFamilyOverload(tasks, children, childrenCalendars));

    // Sort by severity and return
    return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  // Detect when household tasks conflict with school events
  private async detectSchoolTaskOverlaps(
    tasks: Task[],
    children: Child[],
    calendars: Map<string, SchoolCalendarData>
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    for (const task of tasks) {
      if (!task.childIds || !task.startAt || !task.dueAt) continue;

      for (const childId of task.childIds) {
        const child = children.find(c => c.id === childId);
        const calendar = calendars.get(childId);
        
        if (!child || !calendar) continue;

        // Check against school events
        for (const event of calendar.events) {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          // Check for time overlap
          if (this.hasTimeOverlap(task.startAt, task.dueAt, eventStart, eventEnd)) {
            conflicts.push({
              id: `conflict_${task.id}_${event.id}`,
              type: "school_task_overlap",
              severity: this.calculateOverlapSeverity(task, event),
              title: `${task.title} overlapper med ${event.title}`,
              description: `${child.displayName} har ${event.title} på skolen samtidig som ${task.title} skal gjøres hjemme.`,
              affectedTasks: [task],
              affectedChildren: [child],
              conflictingEvents: [event],
              suggestedResolutions: this.generateSchoolTaskResolutions(task, event, child),
              detectedAt: new Date(),
              norwegianContext: "Norsk skole prioriteres vanligvis over hjemmeoppgaver"
            });
          }
        }
      }
    }

    return conflicts;
  }

  // Detect tasks scheduled during Norwegian holidays
  private async detectNorwegianHolidayConflicts(
    tasks: Task[],
    children: Child[], 
    calendars: Map<string, SchoolCalendarData>
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    const holidays = norwegianCalendar.getNorwegianHolidays();

    for (const task of tasks) {
      if (!task.startAt) continue;

      const taskDate = task.startAt.toISOString().split('T')[0];
      const holiday = holidays.find(h => h.date === taskDate);
      
      if (holiday) {
        conflicts.push({
          id: `holiday_conflict_${task.id}`,
          type: "norwegian_holiday",
          severity: "medium",
          title: `${task.title} planlagt på ${holiday.name}`,
          description: `Oppgaven er planlagt på ${holiday.name}, en norsk helligdag. Familien har kanskje andre planer.`,
          affectedTasks: [task],
          suggestedResolutions: this.generateHolidayResolutions(task, holiday),
          detectedAt: new Date(),
          norwegianContext: `${holiday.name} er en viktig norsk helligdag`
        });
      }
    }

    return conflicts;
  }

  // Detect when multiple children have tasks at same time
  private async detectMultiChildConflicts(
    tasks: Task[],
    children: Child[]
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Group tasks by time and check for overlaps
    const timeSlots = new Map<string, Task[]>();
    
    for (const task of tasks) {
      if (!task.startAt || !task.childIds?.length) continue;
      
      const timeKey = task.startAt.toISOString();
      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, []);
      }
      timeSlots.get(timeKey)!.push(task);
    }

    for (const [timeKey, tasksAtTime] of timeSlots) {
      if (tasksAtTime.length > 1) {
        const affectedChildIds = new Set<string>();
        tasksAtTime.forEach(task => task.childIds?.forEach(id => affectedChildIds.add(id)));
        
        if (affectedChildIds.size > 1) {
          const affectedChildren = children.filter(c => affectedChildIds.has(c.id));
          
          conflicts.push({
            id: `multi_child_${timeKey}`,
            type: "multiple_children",
            severity: "high",
            title: `Flere barn har oppgaver samtidig`,
            description: `${affectedChildren.map(c => c.displayName).join(', ')} har alle oppgaver som skal gjøres samtidig.`,
            affectedTasks: tasksAtTime,
            affectedChildren,
            suggestedResolutions: this.generateMultiChildResolutions(tasksAtTime, affectedChildren),
            detectedAt: new Date(),
            norwegianContext: "Norske familier planlegger ofte aktiviteter rundt alle barnas behov"
          });
        }
      }
    }

    return conflicts;
  }

  // Detect SFO/AKS conflicts
  private async detectSFOAKSConflicts(
    tasks: Task[],
    children: Child[],
    calendars: Map<string, SchoolCalendarData>
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    for (const task of tasks) {
      if (!task.childIds || !task.startAt || !task.dueAt) continue;

      for (const childId of task.childIds) {
        const child = children.find(c => c.id === childId);
        const calendar = calendars.get(childId);
        
        if (!child || !calendar) continue;

        // Check SFO activities
        if (calendar.sfoActivities) {
          for (const activity of calendar.sfoActivities) {
            const activityStart = new Date(activity.start_time);
            const activityEnd = new Date(activity.end_time);
            
            if (this.hasTimeOverlap(task.startAt, task.dueAt, activityStart, activityEnd)) {
              conflicts.push({
                id: `sfo_conflict_${task.id}_${activity.id}`,
                type: "sfo_aks_conflict",
                severity: "medium",
                title: `${task.title} overlapper med SFO`,
                description: `${child.displayName} er på SFO (${activity.title}) når ${task.title} skal gjøres.`,
                affectedTasks: [task],
                affectedChildren: [child],
                conflictingEvents: [activity],
                suggestedResolutions: this.generateSFOAKSResolutions(task, activity, child),
                detectedAt: new Date(),
                norwegianContext: "SFO er en viktig del av norsk skoledag for mange barn"
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  // Detect insufficient travel time between activities
  private async detectTravelTimeConflicts(
    tasks: Task[],
    children: Child[],
    calendars: Map<string, SchoolCalendarData>
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    const MINIMUM_TRAVEL_TIME_MINUTES = 30; // Typical Norwegian commute

    for (const child of children) {
      const calendar = calendars.get(child.id);
      if (!calendar) continue;

      const childTasks = tasks.filter(t => t.childIds?.includes(child.id));
      
      for (const task of childTasks) {
        if (!task.startAt) continue;

        // Check if there's a school event ending shortly before the task
        for (const event of calendar.events) {
          const eventEnd = new Date(event.end_time);
          const taskStart = new Date(task.startAt);
          
          const timeDiffMinutes = (taskStart.getTime() - eventEnd.getTime()) / (1000 * 60);
          
          if (timeDiffMinutes > 0 && timeDiffMinutes < MINIMUM_TRAVEL_TIME_MINUTES) {
            conflicts.push({
              id: `travel_time_${task.id}_${event.id}`,
              type: "travel_time", 
              severity: "low",
              title: `For kort tid mellom skole og ${task.title}`,
              description: `${child.displayName} har bare ${Math.round(timeDiffMinutes)} minutter fra ${event.title} slutter til ${task.title} skal starte.`,
              affectedTasks: [task],
              affectedChildren: [child],
              conflictingEvents: [event],
              suggestedResolutions: this.generateTravelTimeResolutions(task, event, child),
              detectedAt: new Date(),
              norwegianContext: "Norske barn trenger tid til å komme hjem fra skole"
            });
          }
        }
      }
    }

    return conflicts;
  }

  // Detect family overload situations
  private async detectFamilyOverload(
    tasks: Task[],
    children: Child[],
    calendars: Map<string, SchoolCalendarData>
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    const MAX_CONCURRENT_ACTIVITIES = 3;

    // Check each hour for overload
    const now = new Date();
    for (let hour = 0; hour < 24 * 7; hour++) { // Check next week
      const checkTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
      
      let activitiesCount = 0;
      const activeItems: (Task | SchoolEvent)[] = [];
      
      // Count household tasks
      for (const task of tasks) {
        if (task.startAt && task.dueAt && 
            task.startAt <= checkTime && checkTime <= task.dueAt) {
          activitiesCount++;
          activeItems.push(task);
        }
      }
      
      // Count school events
      for (const calendar of calendars.values()) {
        for (const event of calendar.events) {
          const eventStart = new Date(event.start_time);
          const eventEnd = new Date(event.end_time);
          
          if (eventStart <= checkTime && checkTime <= eventEnd) {
            activitiesCount++;
            activeItems.push(event);
          }
        }
      }
      
      if (activitiesCount > MAX_CONCURRENT_ACTIVITIES) {
        conflicts.push({
          id: `overload_${checkTime.toISOString()}`,
          type: "family_overload",
          severity: "high",
          title: `Familien har for mange aktiviteter`,
          description: `Familien har ${activitiesCount} aktiviteter samtidig rundt ${checkTime.toLocaleTimeString('nb-NO')}.`,
          affectedTasks: activeItems.filter(item => 'householdId' in item) as Task[],
          suggestedResolutions: this.generateOverloadResolutions(activeItems),
          detectedAt: new Date(),
          norwegianContext: "Norske familier verdsetter balanse mellom aktiviteter og hvile"
        });
      }
    }

    return conflicts;
  }

  // Helper functions
  private hasTimeOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1;
  }

  private calculateOverlapSeverity(task: Task, event: SchoolEvent): "low" | "medium" | "high" | "critical" {
    if (event.type === "lesson") return "high";
    if (event.type === "assembly") return "medium";
    return "low";
  }

  private getSeverityWeight(severity: "low" | "medium" | "high" | "critical"): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    return weights[severity];
  }

  // Resolution generators
  private generateSchoolTaskResolutions(task: Task, event: SchoolEvent, child: Child): ConflictResolution[] {
    return [
      {
        id: "reschedule_after_school",
        type: "reschedule",
        title: "Flytt til etter skole",
        description: `Flytt ${task.title} til etter ${event.title} er ferdig`,
        effort: "low",
        impact: "Barnet kan fokusere på skole uten bekymring for hjemmeoppgaver",
        autoApplicable: true
      },
      {
        id: "delegate_to_weekend",
        type: "reschedule", 
        title: "Flytt til helg",
        description: "Flytt oppgaven til helgen når det er mer tid",
        effort: "low",
        impact: "Mer rolig hverdag, men kan påvirke helgeplaner",
        autoApplicable: true
      }
    ];
  }

  private generateHolidayResolutions(task: Task, holiday: any): ConflictResolution[] {
    return [
      {
        id: "reschedule_before_holiday",
        type: "reschedule",
        title: "Flytt til dagen før",
        description: `Gjør ${task.title} dagen før ${holiday.name}`,
        effort: "low", 
        impact: "Oppgaven blir gjort uten å forstyrre helligdagen",
        autoApplicable: true
      }
    ];
  }

  private generateMultiChildResolutions(tasks: Task[], children: Child[]): ConflictResolution[] {
    return [
      {
        id: "stagger_tasks",
        type: "reschedule",
        title: "Spre oppgavene utover",
        description: "Flytt noen oppgaver til andre tidspunkt",
        effort: "medium",
        impact: "Mindre stress for familien",
        autoApplicable: false
      }
    ];
  }

  private generateSFOAKSResolutions(task: Task, activity: SchoolEvent, child: Child): ConflictResolution[] {
    return [
      {
        id: "reschedule_after_sfo",
        type: "reschedule",
        title: "Flytt til etter SFO/AKS",
        description: `Gjør ${task.title} når ${child.displayName} kommer hjem fra ${activity.title}`,
        effort: "low",
        impact: "Barnet får fullføre sine aktiviteter",
        autoApplicable: true
      }
    ];
  }

  private generateTravelTimeResolutions(task: Task, event: SchoolEvent, child: Child): ConflictResolution[] {
    return [
      {
        id: "add_buffer_time",
        type: "modify",
        title: "Legg til reisetid",
        description: `Flytt ${task.title} 30 minutter senere`,
        effort: "low",
        impact: "Barnet får tid til å komme hjem og slappe av",
        autoApplicable: true
      }
    ];
  }

  private generateOverloadResolutions(items: (Task | SchoolEvent)[]): ConflictResolution[] {
    return [
      {
        id: "redistribute_tasks",
        type: "reschedule",
        title: "Omfordel oppgaver",
        description: "Spre aktivitetene over flere dager",
        effort: "medium",
        impact: "Mer balansert familieplan",
        autoApplicable: false
      }
    ];
  }
}

// Export singleton instance
export const conflictDetector = new NorwegianScheduleConflictDetector();