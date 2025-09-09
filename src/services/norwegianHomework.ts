// Norwegian Homework & Assignment Integration Service
// Detects and manages homework assignments from Norwegian schools via School Crawler Platform
import { Task, TaskType } from "../models/task";
import { Child } from "./children";
import { norwegianSchoolAPI } from "./schoolSummary";
import { addTask, updateTask, listTasks } from "./tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type NorwegianHomeworkSubject = 
  | "norsk" | "matematikk" | "engelsk" | "samfunnsfag" | "naturfag" 
  | "kroppsøving" | "kunst_og_håndverk" | "musikk" | "mat_og_helse"
  | "fremmedspråk" | "religion_og_etikk" | "valgfag";

export type HomeworkDifficulty = "easy" | "medium" | "hard" | "exam_prep";

export type NorwegianHomeworkAssignment = {
  id: string;
  title: string;
  subject: NorwegianHomeworkSubject;
  description: string;
  assignedDate: string; // ISO date
  dueDate: string; // ISO date
  estimatedMinutes: number;
  difficulty: HomeworkDifficulty;
  instructions: string[];
  resources: {
    url?: string;
    pageNumbers?: string;
    onlineResources?: string[];
  };
  gradeLevel: number; // 1-10
  isGroupWork: boolean;
  requiresParentHelp: boolean;
  norwegianLanguageLevel: "standard" | "advanced"; // For non-native speakers
  schoolSource: {
    schoolId: string;
    teacherName?: string;
    className?: string;
  };
  status: "assigned" | "in_progress" | "completed" | "overdue";
  createdFromCrawler: boolean;
};

export type HomeworkProgressTracking = {
  assignmentId: string;
  childId: string;
  timeSpent: number; // Minutes
  difficultyRating?: HomeworkDifficulty;
  parentHelpNeeded: boolean;
  completionPercentage: number;
  notes: string;
  lastWorkedOn: Date;
};

export type NorwegianHomeworkSync = {
  childId: string;
  childName: string;
  assignmentsFound: number;
  newAssignments: NorwegianHomeworkAssignment[];
  updatedAssignments: NorwegianHomeworkAssignment[];
  overdueAssignments: NorwegianHomeworkAssignment[];
  upcomingDeadlines: NorwegianHomeworkAssignment[];
  syncedAt: Date;
  nextSyncAt: Date;
  error?: string;
};

// Norwegian subject mappings and estimated times
const NORWEGIAN_SUBJECT_INFO: Record<NorwegianHomeworkSubject, {
  displayName: string;
  averageMinutes: Record<number, number>; // Grade level to typical minutes
  requiresParentHelp: boolean[];
  difficulty: HomeworkDifficulty;
}> = {
  "norsk": {
    displayName: "Norsk",
    averageMinutes: { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 60, 9: 75, 10: 90 },
    requiresParentHelp: [true, true, true, false, false, false, false, false, false, false],
    difficulty: "medium"
  },
  "matematikk": {
    displayName: "Matematikk", 
    averageMinutes: { 1: 20, 2: 25, 3: 30, 4: 35, 5: 40, 6: 45, 7: 50, 8: 60, 9: 75, 10: 90 },
    requiresParentHelp: [true, true, true, true, false, false, false, false, false, false],
    difficulty: "hard"
  },
  "engelsk": {
    displayName: "Engelsk",
    averageMinutes: { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40, 8: 50, 9: 60, 10: 75 },
    requiresParentHelp: [true, true, false, false, false, false, false, false, false, false],
    difficulty: "medium"
  },
  "samfunnsfag": {
    displayName: "Samfunnsfag",
    averageMinutes: { 4: 20, 5: 25, 6: 30, 7: 35, 8: 45, 9: 60, 10: 75 },
    requiresParentHelp: [false, false, false, false, false, false, false],
    difficulty: "medium"
  },
  "naturfag": {
    displayName: "Naturfag",
    averageMinutes: { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35, 6: 40, 7: 45, 8: 60, 9: 75, 10: 90 },
    requiresParentHelp: [true, true, false, false, false, false, false, false, false, false],
    difficulty: "hard"
  },
  "kroppsøving": {
    displayName: "Kroppsøving",
    averageMinutes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
    requiresParentHelp: [false, false, false, false, false, false, false, false, false, false],
    difficulty: "easy"
  },
  "kunst_og_håndverk": {
    displayName: "Kunst og håndverk",
    averageMinutes: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30, 7: 30, 8: 45, 9: 45, 10: 45 },
    requiresParentHelp: [true, true, true, false, false, false, false, false, false, false],
    difficulty: "easy"
  },
  "musikk": {
    displayName: "Musikk",
    averageMinutes: { 1: 15, 2: 15, 3: 15, 4: 15, 5: 15, 6: 15, 7: 15, 8: 20, 9: 20, 10: 20 },
    requiresParentHelp: [true, false, false, false, false, false, false, false, false, false],
    difficulty: "easy"
  },
  "mat_og_helse": {
    displayName: "Mat og helse",
    averageMinutes: { 5: 20, 6: 20, 7: 20, 8: 30, 9: 30, 10: 30 },
    requiresParentHelp: [true, true, false, false, false, false],
    difficulty: "easy"
  },
  "fremmedspråk": {
    displayName: "Fremmedspråk",
    averageMinutes: { 8: 40, 9: 50, 10: 60 },
    requiresParentHelp: [false, false, false],
    difficulty: "medium"
  },
  "religion_og_etikk": {
    displayName: "Religion og etikk",
    averageMinutes: { 1: 15, 2: 15, 3: 15, 4: 20, 5: 20, 6: 20, 7: 25, 8: 30, 9: 30, 10: 30 },
    requiresParentHelp: [true, true, false, false, false, false, false, false, false, false],
    difficulty: "easy"
  },
  "valgfag": {
    displayName: "Valgfag",
    averageMinutes: { 8: 30, 9: 40, 10: 50 },
    requiresParentHelp: [false, false, false],
    difficulty: "medium"
  }
};

export class NorwegianHomeworkIntegrationService {
  private cacheKey = "norwegian_homework";

  // Sync homework assignments for all children
  async syncHouseholdHomework(householdId: string): Promise<NorwegianHomeworkSync[]> {
    const results: NorwegianHomeworkSync[] = [];
    
    try {
      const children = await this.getSchoolChildren(householdId);
      
      for (const child of children) {
        const syncResult = await this.syncChildHomework(child, householdId);
        results.push(syncResult);
        
        // Create household tasks for new assignments
        if (syncResult.newAssignments.length > 0) {
          await this.createHomeworkTasks(syncResult.newAssignments, child, householdId);
        }

        // Send notifications for overdue assignments
        if (syncResult.overdueAssignments.length > 0) {
          await this.sendOverdueNotifications(syncResult.overdueAssignments, child);
        }
      }
    } catch (error) {
      console.error("Failed to sync household homework:", error);
    }

    return results;
  }

  // Sync homework for individual child
  private async syncChildHomework(child: Child, householdId: string): Promise<NorwegianHomeworkSync> {
    const result: NorwegianHomeworkSync = {
      childId: child.id,
      childName: child.displayName,
      assignmentsFound: 0,
      newAssignments: [],
      updatedAssignments: [],
      overdueAssignments: [],
      upcomingDeadlines: [],
      syncedAt: new Date(),
      nextSyncAt: this.calculateNextHomeworkSync()
    };

    try {
      if (!child.school?.website || !child.currentGrade) {
        result.error = "Missing school information";
        return result;
      }

      // Get homework from School Crawler Platform
      const crawlerAssignments = await this.fetchHomeworkFromCrawler(child);
      
      // Get cached assignments for comparison
      const cachedAssignments = await this.getCachedHomework(child.id);
      
      // Process assignments
      result.assignmentsFound = crawlerAssignments.length;
      const { newAssignments, updatedAssignments } = this.compareAssignments(
        crawlerAssignments, 
        cachedAssignments
      );
      
      result.newAssignments = newAssignments;
      result.updatedAssignments = updatedAssignments;
      
      // Check for overdue and upcoming assignments
      result.overdueAssignments = this.findOverdueAssignments(crawlerAssignments);
      result.upcomingDeadlines = this.findUpcomingDeadlines(crawlerAssignments);
      
      // Cache updated assignments
      await this.cacheHomework(child.id, crawlerAssignments);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to sync homework for ${child.displayName}:`, error);
    }

    return result;
  }

  // Fetch homework from School Crawler Platform
  private async fetchHomeworkFromCrawler(child: Child): Promise<NorwegianHomeworkAssignment[]> {
    if (!child.school?.website || !child.school?.crawlerGradeId) {
      return [];
    }

    try {
      // Get homework data from crawler
      const response = await norwegianSchoolAPI.getHomeworkAssignments(child.school.crawlerGradeId);
      
      if (!response?.assignments) {
        return [];
      }

      // Transform crawler data to our homework format
      return response.assignments.map(assignment => this.transformCrawlerHomework(assignment, child));
      
    } catch (error) {
      console.warn("Failed to fetch homework from crawler:", error);
      return [];
    }
  }

  // Transform crawler homework to our format
  private transformCrawlerHomework(crawlerData: any, child: Child): NorwegianHomeworkAssignment {
    const subject = this.mapSubjectFromCrawler(crawlerData.subject || "ukjent");
    const subjectInfo = NORWEGIAN_SUBJECT_INFO[subject];
    const grade = child.currentGrade || 5;

    return {
      id: `hw_${crawlerData.id || Date.now()}`,
      title: crawlerData.title || "Ukjent oppgave",
      subject,
      description: crawlerData.description || "",
      assignedDate: crawlerData.assigned_date || new Date().toISOString().split('T')[0],
      dueDate: crawlerData.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedMinutes: subjectInfo?.averageMinutes[grade] || 30,
      difficulty: this.assessHomeworkDifficulty(crawlerData, grade),
      instructions: this.parseInstructions(crawlerData.instructions || crawlerData.description),
      resources: {
        url: crawlerData.resource_url,
        pageNumbers: crawlerData.pages,
        onlineResources: crawlerData.online_resources
      },
      gradeLevel: grade,
      isGroupWork: crawlerData.is_group_work || false,
      requiresParentHelp: this.shouldRequireParentHelp(subject, grade),
      norwegianLanguageLevel: grade <= 3 ? "standard" : "advanced",
      schoolSource: {
        schoolId: child.school?.id || "",
        teacherName: crawlerData.teacher,
        className: crawlerData.class_name
      },
      status: this.determineAssignmentStatus(crawlerData.due_date),
      createdFromCrawler: true
    };
  }

  // Create household tasks from homework assignments
  private async createHomeworkTasks(
    assignments: NorwegianHomeworkAssignment[],
    child: Child, 
    householdId: string
  ): Promise<void> {
    for (const assignment of assignments) {
      try {
        const dueDate = new Date(assignment.dueDate);
        const startDate = new Date(dueDate);
        
        // Schedule homework 2-3 days before due date for better planning
        const daysEarlier = assignment.difficulty === "hard" ? 3 : 2;
        startDate.setDate(startDate.getDate() - daysEarlier);

        const taskTitle = `${assignment.subject}: ${assignment.title}`;
        const taskDescription = this.generateHomeworkTaskDescription(assignment);

        await addTask(householdId, {
          title: taskTitle,
          type: "deadline" as TaskType,
          description: taskDescription,
          startAt: startDate,
          dueAt: dueDate,
          childIds: [child.id],
          context: ["homework", "school", assignment.subject],
          priority: this.getHomeworkPriority(assignment),
          prepWindowHours: Math.floor(assignment.estimatedMinutes / 60),
        });

        console.log(`Created homework task: ${taskTitle} for ${child.displayName}`);
        
      } catch (error) {
        console.error(`Failed to create task for assignment ${assignment.id}:`, error);
      }
    }
  }

  // Generate task description for homework
  private generateHomeworkTaskDescription(assignment: NorwegianHomeworkAssignment): string {
    let description = assignment.description;
    
    if (assignment.instructions.length > 0) {
      description += "\n\nOppgaver:\n" + assignment.instructions.map(inst => `• ${inst}`).join("\n");
    }
    
    if (assignment.resources.pageNumbers) {
      description += `\n\nSider: ${assignment.resources.pageNumbers}`;
    }
    
    if (assignment.resources.onlineResources?.length) {
      description += "\n\nNettressurser:\n" + assignment.resources.onlineResources.map(res => `• ${res}`).join("\n");
    }
    
    description += `\n\nEstimert tid: ${assignment.estimatedMinutes} minutter`;
    
    if (assignment.requiresParentHelp) {
      description += "\n⚠️ Kan trenge hjelp fra voksen";
    }
    
    return description;
  }

  // Send notifications for overdue homework
  private async sendOverdueNotifications(
    overdueAssignments: NorwegianHomeworkAssignment[],
    child: Child
  ): Promise<void> {
    if (overdueAssignments.length === 0) return;

    const title = `${child.displayName} har forfalte lekser`;
    const body = `${overdueAssignments.length} lekse${overdueAssignments.length > 1 ? 'r' : ''} er forfalt og trenger oppmerksomhet.`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "norwegian_homework_overdue",
          childId: child.id,
          assignments: overdueAssignments.map(a => a.id)
        },
      },
      trigger: null,
    });
  }

  // Helper functions
  private async getSchoolChildren(householdId: string): Promise<Child[]> {
    // This would use the listChildren function from children.ts
    // For now, return empty array as placeholder
    return [];
  }

  private mapSubjectFromCrawler(crawlerSubject: string): NorwegianHomeworkSubject {
    const subjectMap: Record<string, NorwegianHomeworkSubject> = {
      "norwegian": "norsk",
      "norsk": "norsk",
      "math": "matematikk", 
      "mathematics": "matematikk",
      "matematikk": "matematikk",
      "english": "engelsk",
      "engelsk": "engelsk",
      "social": "samfunnsfag",
      "samfunnsfag": "samfunnsfag",
      "science": "naturfag",
      "naturfag": "naturfag",
      "pe": "kroppsøving",
      "kroppsøving": "kroppsøving",
      "art": "kunst_og_håndverk",
      "kunst": "kunst_og_håndverk",
      "music": "musikk",
      "musikk": "musikk"
    };
    
    const normalized = crawlerSubject.toLowerCase();
    return subjectMap[normalized] || "valgfag";
  }

  private assessHomeworkDifficulty(crawlerData: any, grade: number): HomeworkDifficulty {
    // Assess difficulty based on various factors
    const hasMultipleSteps = crawlerData.instructions?.length > 3;
    const isLongAssignment = crawlerData.description?.length > 200;
    const isAdvancedGrade = grade >= 8;
    
    if (crawlerData.is_exam_prep) return "exam_prep";
    if (hasMultipleSteps && isAdvancedGrade) return "hard";
    if (isLongAssignment || hasMultipleSteps) return "medium";
    return "easy";
  }

  private shouldRequireParentHelp(subject: NorwegianHomeworkSubject, grade: number): boolean {
    const subjectInfo = NORWEGIAN_SUBJECT_INFO[subject];
    return subjectInfo?.requiresParentHelp[grade - 1] || false;
  }

  private determineAssignmentStatus(dueDate: string): NorwegianHomeworkAssignment["status"] {
    const due = new Date(dueDate);
    const now = new Date();
    
    if (due < now) return "overdue";
    return "assigned";
  }

  private parseInstructions(text: string): string[] {
    if (!text) return [];
    
    // Split by common Norwegian instruction patterns
    const instructions = text.split(/\n|•|[0-9]+\.|[a-z]\)/)
      .map(inst => inst.trim())
      .filter(inst => inst.length > 3);
    
    return instructions.slice(0, 10); // Limit to 10 instructions
  }

  private getHomeworkPriority(assignment: NorwegianHomeworkAssignment): number {
    let priority = 3; // Default medium priority
    
    if (assignment.difficulty === "exam_prep") priority = 5;
    else if (assignment.difficulty === "hard") priority = 4;
    else if (assignment.requiresParentHelp) priority += 1;
    
    return Math.min(priority, 5);
  }

  private findOverdueAssignments(assignments: NorwegianHomeworkAssignment[]): NorwegianHomeworkAssignment[] {
    const now = new Date();
    return assignments.filter(assignment => 
      new Date(assignment.dueDate) < now && assignment.status !== "completed"
    );
  }

  private findUpcomingDeadlines(assignments: NorwegianHomeworkAssignment[]): NorwegianHomeworkAssignment[] {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate >= now && dueDate <= threeDaysFromNow && assignment.status !== "completed";
    });
  }

  private compareAssignments(
    current: NorwegianHomeworkAssignment[], 
    cached: NorwegianHomeworkAssignment[]
  ): { newAssignments: NorwegianHomeworkAssignment[]; updatedAssignments: NorwegianHomeworkAssignment[] } {
    const newAssignments: NorwegianHomeworkAssignment[] = [];
    const updatedAssignments: NorwegianHomeworkAssignment[] = [];
    
    for (const assignment of current) {
      const existingAssignment = cached.find(cached => cached.id === assignment.id);
      
      if (!existingAssignment) {
        newAssignments.push(assignment);
      } else if (this.hasAssignmentChanged(existingAssignment, assignment)) {
        updatedAssignments.push(assignment);
      }
    }
    
    return { newAssignments, updatedAssignments };
  }

  private hasAssignmentChanged(old: NorwegianHomeworkAssignment, new_: NorwegianHomeworkAssignment): boolean {
    return old.title !== new_.title ||
           old.description !== new_.description ||
           old.dueDate !== new_.dueDate ||
           old.status !== new_.status;
  }

  private calculateNextHomeworkSync(): Date {
    const next = new Date();
    next.setHours(next.getHours() + 4); // Check every 4 hours
    return next;
  }

  // Cache management
  private async cacheHomework(childId: string, assignments: NorwegianHomeworkAssignment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.cacheKey}_${childId}`,
        JSON.stringify(assignments)
      );
    } catch (error) {
      console.warn("Failed to cache homework:", error);
    }
  }

  private async getCachedHomework(childId: string): Promise<NorwegianHomeworkAssignment[]> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cacheKey}_${childId}`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn("Failed to get cached homework:", error);
      return [];
    }
  }

  // Track homework progress
  async updateHomeworkProgress(
    assignmentId: string,
    childId: string,
    progress: Partial<HomeworkProgressTracking>
  ): Promise<void> {
    try {
      const key = `homework_progress_${assignmentId}_${childId}`;
      const existing = await AsyncStorage.getItem(key);
      const current: HomeworkProgressTracking = existing ? 
        JSON.parse(existing) : 
        {
          assignmentId,
          childId,
          timeSpent: 0,
          parentHelpNeeded: false,
          completionPercentage: 0,
          notes: "",
          lastWorkedOn: new Date()
        };

      const updated: HomeworkProgressTracking = {
        ...current,
        ...progress,
        lastWorkedOn: new Date()
      };

      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to update homework progress:", error);
    }
  }

  // Get homework statistics
  async getHomeworkStatistics(childId: string, days: number = 30): Promise<{
    totalAssignments: number;
    completedOnTime: number;
    completedLate: number;
    overdue: number;
    averageTimeSpent: number;
    subjectBreakdown: Record<NorwegianHomeworkSubject, number>;
  }> {
    // This would analyze cached homework and progress data
    // Return placeholder for now
    return {
      totalAssignments: 0,
      completedOnTime: 0,
      completedLate: 0,
      overdue: 0,
      averageTimeSpent: 0,
      subjectBreakdown: {} as Record<NorwegianHomeworkSubject, number>
    };
  }
}

// Export singleton instance
export const norwegianHomework = new NorwegianHomeworkIntegrationService();

// Utility functions
export function formatHomeworkDueDate(dueDate: string): string {
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Forfalt";
  if (diffDays === 0) return "I dag";
  if (diffDays === 1) return "I morgen";
  if (diffDays <= 7) return `Om ${diffDays} dager`;
  
  return due.toLocaleDateString('nb-NO');
}

export function getHomeworkSubjectColor(subject: NorwegianHomeworkSubject): string {
  const colors: Record<NorwegianHomeworkSubject, string> = {
    "norsk": "#FF6B6B",
    "matematikk": "#4ECDC4", 
    "engelsk": "#45B7D1",
    "samfunnsfag": "#96CEB4",
    "naturfag": "#FECA57",
    "kroppsøving": "#FF9FF3",
    "kunst_og_håndverk": "#F38BA8",
    "musikk": "#A8E6CF",
    "mat_og_helse": "#FFB3BA",
    "fremmedspråk": "#BFDBFE",
    "religion_og_etikk": "#DDD6FE",
    "valgfag": "#E5E7EB"
  };
  
  return colors[subject] || "#E5E7EB";
}