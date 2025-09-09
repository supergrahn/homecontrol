// Norwegian School Holiday Intelligence Service
// Intelligent family activity suggestions and workload redistribution during Norwegian school breaks
import { Task } from "../models/task";
import { Child } from "./children";
import { norwegianCalendar, NorwegianHoliday, NorwegianSchoolBreak } from "./norwegianCalendar";
import { listTasks } from "./tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NorwegianHolidayActivity = {
  id: string;
  title: string;
  description: string;
  category: "outdoor" | "indoor" | "cultural" | "educational" | "family_tradition";
  ageGroups: number[]; // Suitable for grades 1-10
  duration: number; // Minutes
  season: "vinter" | "vår" | "sommer" | "høst" | "all";
  weatherDependent: boolean;
  cost: "free" | "low" | "medium" | "high";
  location: "home" | "local" | "travel_required";
  norwegianContext: string;
};

export type HolidayWorkloadAdjustment = {
  taskId: string;
  originalDate: Date;
  suggestedDate: Date;
  reason: string;
  automaticallyApplied: boolean;
  priority: "low" | "medium" | "high";
};

export type NorwegianHolidayIntelligence = {
  holiday: NorwegianHoliday;
  break?: NorwegianSchoolBreak;
  familyActivities: NorwegianHolidayActivity[];
  workloadAdjustments: HolidayWorkloadAdjustment[];
  weatherForecast?: {
    temperature: number;
    conditions: string;
    outdoorSuitable: boolean;
  };
  traditionalCelebrations: string[];
  childrenHomeSchedule: {
    childId: string;
    childName: string;
    normalSchoolHours: { start: string; end: string };
    extraCareNeeded: boolean;
  }[];
};

// Norwegian holiday activities database
const NORWEGIAN_HOLIDAY_ACTIVITIES: NorwegianHolidayActivity[] = [
  // Winter activities (Vinter)
  {
    id: "winter_ski_trip",
    title: "Familieskitur",
    description: "Ta hele familien med på skitur i marka eller på fjellet",
    category: "outdoor",
    ageGroups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    duration: 240, // 4 hours
    season: "vinter",
    weatherDependent: true,
    cost: "low",
    location: "local",
    norwegianContext: "Skitur er en klassisk norsk familieaktivitet, spesielt i vinterferien"
  },
  {
    id: "winter_ice_skating",
    title: "Skøyting på kunstis",
    description: "Gå på skøyter på lokal kunstisbane eller naturis",
    category: "outdoor",
    ageGroups: [3, 4, 5, 6, 7, 8, 9, 10],
    duration: 90,
    season: "vinter",
    weatherDependent: false,
    cost: "low",
    location: "local",
    norwegianContext: "Skøyting er populært blant norske barn og familier"
  },
  {
    id: "hygge_indoor",
    title: "Hjemmekos og baking",
    description: "Bak sammen, spill spill og ha det koselig hjemme",
    category: "indoor",
    ageGroups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    duration: 180,
    season: "all",
    weatherDependent: false,
    cost: "low",
    location: "home",
    norwegianContext: "Hygge og kos er viktige verdier i norske hjem"
  },

  // Spring activities (Vår)
  {
    id: "may_17_celebration",
    title: "17. mai-feiring",
    description: "Delta i 17. mai-toget og feir Norges nasjonaldag",
    category: "cultural",
    ageGroups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    duration: 300, // 5 hours
    season: "vår",
    weatherDependent: true,
    cost: "medium",
    location: "local",
    norwegianContext: "17. mai er Norges viktigste nasjonale feiring"
  },
  {
    id: "nature_hike",
    title: "Naturvandring og blomsterplukking",
    description: "Utforsk naturen og plukk vårblomster",
    category: "outdoor",
    ageGroups: [2, 3, 4, 5, 6, 7, 8, 9],
    duration: 120,
    season: "vår",
    weatherDependent: true,
    cost: "free",
    location: "local",
    norwegianContext: "Allemannsretten gir alle rett til å ferdes fritt i naturen"
  },

  // Summer activities (Sommer)
  {
    id: "cabin_trip",
    title: "Hytteweekend",
    description: "Dra på hytta eller lei hytte for familieferie",
    category: "family_tradition",
    ageGroups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    duration: 2880, // 48 hours (weekend)
    season: "sommer",
    weatherDependent: false,
    cost: "medium",
    location: "travel_required",
    norwegianContext: "Hytta er en viktig del av norsk kultur og ferietradisjon"
  },
  {
    id: "beach_swimming",
    title: "Strand og bading",
    description: "Tilbring dagen ved sjøen eller innsjø",
    category: "outdoor",
    ageGroups: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    duration: 240,
    season: "sommer",
    weatherDependent: true,
    cost: "free",
    location: "local",
    norwegianContext: "Norge har mange flotte badestrender og badesjøer"
  },

  // Autumn activities (Høst)
  {
    id: "mushroom_picking",
    title: "Sopptur i skogen",
    description: "Plukk sopp og nyt høstnaturen",
    category: "outdoor",
    ageGroups: [4, 5, 6, 7, 8, 9, 10],
    duration: 180,
    season: "høst",
    weatherDependent: true,
    cost: "free",
    location: "local",
    norwegianContext: "Sopp- og bærplukking er tradisjonelle norske høstaktiviteter"
  },
  {
    id: "cultural_museum",
    title: "Besøk lokale museer",
    description: "Utforsk lokale museer og kulturarv",
    category: "cultural",
    ageGroups: [3, 4, 5, 6, 7, 8, 9, 10],
    duration: 150,
    season: "all",
    weatherDependent: false,
    cost: "medium",
    location: "local",
    norwegianContext: "Mange norske museer har spesielle familieprogrammer"
  }
];

export class NorwegianHolidayIntelligenceService {
  // Get comprehensive holiday intelligence for upcoming Norwegian holidays
  async getHolidayIntelligence(
    householdId: string, 
    children: Child[],
    daysAhead: number = 14
  ): Promise<NorwegianHolidayIntelligence[]> {
    const intelligence: NorwegianHolidayIntelligence[] = [];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get Norwegian holidays and breaks
    const holidays = norwegianCalendar.getNorwegianHolidays();
    const schoolBreaks = await this.getUpcomingSchoolBreaks(children, daysAhead);

    // Process each holiday
    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      if (holidayDate <= endDate) {
        const holidayIntelligence = await this.analyzeHoliday(
          holiday, 
          householdId, 
          children
        );
        intelligence.push(holidayIntelligence);
      }
    }

    // Process school breaks
    for (const break_ of schoolBreaks) {
      const breakIntelligence = await this.analyzeSchoolBreak(
        break_, 
        householdId, 
        children
      );
      intelligence.push(breakIntelligence);
    }

    return intelligence.sort((a, b) => 
      new Date(a.holiday.date).getTime() - new Date(b.holiday.date).getTime()
    );
  }

  // Analyze individual Norwegian holiday
  private async analyzeHoliday(
    holiday: NorwegianHoliday,
    householdId: string,
    children: Child[]
  ): Promise<NorwegianHolidayIntelligence> {
    const familyActivities = await this.suggestHolidayActivities(holiday, children);
    const workloadAdjustments = await this.analyzeWorkloadAdjustments(
      holiday, 
      householdId
    );
    const childrenHomeSchedule = await this.analyzeChildCareNeeds(holiday, children);
    const traditionalCelebrations = this.getTraditionalCelebrations(holiday);

    return {
      holiday,
      familyActivities,
      workloadAdjustments,
      traditionalCelebrations,
      childrenHomeSchedule
    };
  }

  // Analyze school breaks
  private async analyzeSchoolBreak(
    break_: NorwegianSchoolBreak,
    householdId: string,
    children: Child[]
  ): Promise<NorwegianHolidayIntelligence> {
    // Create a synthetic holiday for the break
    const syntheticHoliday: NorwegianHoliday = {
      name: break_.name,
      date: break_.startDate,
      type: "school",
      affectsSchools: true,
      description: `Norwegian school break: ${break_.name}`
    };

    const familyActivities = await this.suggestBreakActivities(break_, children);
    const workloadAdjustments = await this.analyzeBreakWorkloadAdjustments(
      break_, 
      householdId
    );
    const childrenHomeSchedule = await this.analyzeBreakChildCareNeeds(break_, children);

    return {
      holiday: syntheticHoliday,
      break: break_,
      familyActivities,
      workloadAdjustments,
      traditionalCelebrations: [`Typical ${break_.type} activities`],
      childrenHomeSchedule
    };
  }

  // Suggest activities based on holiday and children
  private async suggestHolidayActivities(
    holiday: NorwegianHoliday, 
    children: Child[]
  ): Promise<NorwegianHolidayActivity[]> {
    const currentSeason = this.getCurrentNorwegianSeason();
    const childGrades = children
      .map(c => c.currentGrade)
      .filter(g => g !== null) as number[];

    // Filter activities suitable for this holiday and children
    return NORWEGIAN_HOLIDAY_ACTIVITIES.filter(activity => {
      // Check if activity suits current season or is all-season
      const seasonMatch = activity.season === currentSeason || activity.season === "all";
      
      // Check if activity is suitable for at least one child
      const ageMatch = childGrades.some(grade => 
        activity.ageGroups.includes(grade)
      );

      // Special activity filtering for specific holidays
      const holidayMatch = this.isActivitySuitableForHoliday(activity, holiday);

      return seasonMatch && ageMatch && holidayMatch;
    }).slice(0, 5); // Limit to 5 suggestions
  }

  // Suggest activities for school breaks
  private async suggestBreakActivities(
    break_: NorwegianSchoolBreak, 
    children: Child[]
  ): Promise<NorwegianHolidayActivity[]> {
    const breakSeason = this.getSeasonForBreakType(break_.type);
    const childGrades = children
      .map(c => c.currentGrade)
      .filter(g => g !== null && break_.affectsGrades.includes(g)) as number[];

    return NORWEGIAN_HOLIDAY_ACTIVITIES.filter(activity => {
      const seasonMatch = activity.season === breakSeason || activity.season === "all";
      const ageMatch = childGrades.some(grade => 
        activity.ageGroups.includes(grade)
      );
      
      // Prefer longer activities during breaks
      const suitableForBreak = break_.type === "sommerferie" ? 
        activity.duration >= 120 : activity.duration >= 90;

      return seasonMatch && ageMatch && suitableForBreak;
    }).slice(0, 8); // More suggestions for breaks
  }

  // Analyze workload adjustments needed for holidays
  private async analyzeWorkloadAdjustments(
    holiday: NorwegianHoliday,
    householdId: string
  ): Promise<HolidayWorkloadAdjustment[]> {
    const adjustments: HolidayWorkloadAdjustment[] = [];
    
    try {
      const tasks = await listTasks(householdId);
      const holidayDate = new Date(holiday.date);

      for (const task of tasks) {
        if (!task.startAt || task.status === "done") continue;

        const taskDate = new Date(task.startAt);
        const daysDifference = Math.abs(
          (taskDate.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Tasks scheduled on holiday or day before/after
        if (daysDifference <= 1) {
          const suggestedDate = new Date(holidayDate);
          
          if (taskDate.getTime() === holidayDate.getTime()) {
            // Move holiday tasks to day before
            suggestedDate.setDate(suggestedDate.getDate() - 1);
          } else {
            // Move tasks close to holiday further away
            suggestedDate.setDate(suggestedDate.getDate() + 2);
          }

          adjustments.push({
            taskId: task.id,
            originalDate: taskDate,
            suggestedDate,
            reason: `Avoid conflict with ${holiday.name}`,
            automaticallyApplied: false,
            priority: "medium"
          });
        }
      }
    } catch (error) {
      console.warn("Failed to analyze workload adjustments:", error);
    }

    return adjustments;
  }

  // Analyze workload adjustments for school breaks
  private async analyzeBreakWorkloadAdjustments(
    break_: NorwegianSchoolBreak,
    householdId: string
  ): Promise<HolidayWorkloadAdjustment[]> {
    const adjustments: HolidayWorkloadAdjustment[] = [];
    
    try {
      const tasks = await listTasks(householdId);
      const breakStart = new Date(break_.startDate);
      const breakEnd = new Date(break_.endDate);

      for (const task of tasks) {
        if (!task.startAt || task.status === "done") continue;

        const taskDate = new Date(task.startAt);
        
        // Check if task falls during break
        if (taskDate >= breakStart && taskDate <= breakEnd) {
          // School-related tasks should be moved before break
          const isSchoolRelated = task.title.toLowerCase().includes('skole') ||
                                task.title.toLowerCase().includes('lekser') ||
                                task.context?.includes('school');

          if (isSchoolRelated) {
            const suggestedDate = new Date(breakStart);
            suggestedDate.setDate(suggestedDate.getDate() - 1);

            adjustments.push({
              taskId: task.id,
              originalDate: taskDate,
              suggestedDate,
              reason: `Complete before ${break_.name}`,
              automaticallyApplied: false,
              priority: "high"
            });
          }
        }
      }
    } catch (error) {
      console.warn("Failed to analyze break workload adjustments:", error);
    }

    return adjustments;
  }

  // Analyze child care needs during holidays
  private async analyzeChildCareNeeds(
    holiday: NorwegianHoliday, 
    children: Child[]
  ): Promise<{childId: string; childName: string; normalSchoolHours: {start: string; end: string}; extraCareNeeded: boolean}[]> {
    return children.map(child => ({
      childId: child.id,
      childName: child.displayName,
      normalSchoolHours: { start: "08:00", end: "14:00" }, // Typical Norwegian school hours
      extraCareNeeded: child.currentGrade ? child.currentGrade <= 7 : true // Younger children need more supervision
    }));
  }

  // Analyze child care needs during breaks
  private async analyzeBreakChildCareNeeds(
    break_: NorwegianSchoolBreak, 
    children: Child[]
  ): Promise<{childId: string; childName: string; normalSchoolHours: {start: string; end: string}; extraCareNeeded: boolean}[]> {
    return children
      .filter(child => child.currentGrade && break_.affectsGrades.includes(child.currentGrade))
      .map(child => ({
        childId: child.id,
        childName: child.displayName,
        normalSchoolHours: { start: "08:00", end: "14:00" },
        extraCareNeeded: true // All children need care during school breaks
      }));
  }

  // Helper functions
  private getCurrentNorwegianSeason(): "vinter" | "vår" | "sommer" | "høst" {
    const month = new Date().getMonth() + 1;
    
    if (month >= 12 || month <= 2) return "vinter";
    if (month >= 3 && month <= 5) return "vår"; 
    if (month >= 6 && month <= 8) return "sommer";
    return "høst";
  }

  private getSeasonForBreakType(breakType: NorwegianSchoolBreak["type"]): "vinter" | "vår" | "sommer" | "høst" {
    const seasonMap: Record<string, "vinter" | "vår" | "sommer" | "høst"> = {
      "vinterferie": "vinter",
      "påskeferie": "vår", 
      "sommerferie": "sommer",
      "høstferie": "høst"
    };
    return seasonMap[breakType] || "all" as any;
  }

  private isActivitySuitableForHoliday(
    activity: NorwegianHolidayActivity, 
    holiday: NorwegianHoliday
  ): boolean {
    // Special matching for Norwegian holidays
    if (holiday.name === "Grunnlovsdag" && activity.id === "may_17_celebration") {
      return true;
    }
    
    // Cultural activities for national holidays
    if (holiday.type === "national" && activity.category === "cultural") {
      return true;
    }

    // Indoor activities for winter holidays
    if (holiday.date.includes("-12-") || holiday.date.includes("-01-") || holiday.date.includes("-02-")) {
      return activity.category === "indoor" || !activity.weatherDependent;
    }

    return true; // Default to suitable
  }

  private getTraditionalCelebrations(holiday: NorwegianHoliday): string[] {
    const celebrations: Record<string, string[]> = {
      "Nyttårsdag": ["Nyttårskaffe", "Familiebuffet", "Refleksjon over året som gikk"],
      "Skjærtorsdag": ["Påskeegg", "Familiesamling", "Påskekrim"],
      "Langfredag": ["Stille dag hjemme", "Påskeegg", "Tradisjonell mat"],
      "Andre påskedag": ["Påskefrokost", "Påskevandring", "Besøk familie"],
      "Arbeidernes dag": ["Første mai-tog", "Piknik", "Fellesskapsfølelse"],
      "Grunnlovsdag": ["17. mai-frokost", "Barnetog", "Bunad og flagg", "Is og pølser"],
      "Kristi himmelfartsdag": ["Familietur", "Friluftsliv", "Grilling"],
      "Andre pinsedag": ["Pinseturer", "Første sommerdager", "Utendørsaktiviteter"]
    };

    return celebrations[holiday.name] || ["Familietid", "Hvile og rekreasjon"];
  }

  private async getUpcomingSchoolBreaks(
    children: Child[], 
    daysAhead: number
  ): Promise<NorwegianSchoolBreak[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + daysAhead);

    const breaks = children
      .filter(child => child.currentGrade)
      .flatMap(child => norwegianCalendar.getNorwegianSchoolBreaks(child.currentGrade!))
      .filter((break_, index, self) => 
        // Remove duplicates and filter by date range
        self.findIndex(b => b.name === break_.name) === index &&
        new Date(break_.startDate) <= endDate &&
        new Date(break_.endDate) >= today
      );

    return breaks;
  }

  // Apply workload adjustments automatically where safe
  async applyRecommendedAdjustments(
    adjustments: HolidayWorkloadAdjustment[],
    householdId: string
  ): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;

    for (const adjustment of adjustments) {
      if (adjustment.automaticallyApplied) {
        try {
          // In production, this would update the task
          console.log(`Auto-adjusting task ${adjustment.taskId} from ${adjustment.originalDate} to ${adjustment.suggestedDate}`);
          applied++;
        } catch (error) {
          console.warn(`Failed to apply adjustment for task ${adjustment.taskId}:`, error);
          failed++;
        }
      }
    }

    return { applied, failed };
  }
}

// Export singleton instance
export const norwegianHolidayIntelligence = new NorwegianHolidayIntelligenceService();

// Utility functions
export function formatNorwegianHolidayDate(date: string): string {
  return new Date(date).toLocaleDateString('nb-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
}

export function isNorwegianFamilyHoliday(date: Date): boolean {
  const holidays = norwegianCalendar.getNorwegianHolidays();
  const dateStr = date.toISOString().split('T')[0];
  
  return holidays.some(holiday => 
    holiday.date === dateStr && holiday.affectsSchools
  );
}