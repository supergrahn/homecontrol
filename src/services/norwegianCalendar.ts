// Norwegian School Calendar Integration Service
import { fetchNextDaySummary, SchoolEvent, searchNorwegianSchools } from "./schoolSummary";
import { Child, NorwegianSchoolType } from "./children";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NorwegianHoliday = {
  name: string;
  date: string; // ISO format
  type: "national" | "school" | "regional";
  affectsSchools: boolean;
  description?: string;
};

export type NorwegianSchoolBreak = {
  name: string;
  startDate: string;
  endDate: string;
  type: "vinterferie" | "påskeferie" | "sommerferie" | "høstferie" | "other";
  affectsGrades: number[]; // Which grades are affected
};

export type SchoolCalendarData = {
  events: SchoolEvent[];
  holidays: NorwegianHoliday[];
  breaks: NorwegianSchoolBreak[];
  sfoActivities?: SchoolEvent[]; // SkoleFritidsOrdning activities
  aksActivities?: SchoolEvent[]; // Aktivitetsskolen activities
  lastUpdated: string;
  nextUpdateAt: string;
};

// Norwegian holiday calendar (2025-2026 school year)
const NORWEGIAN_HOLIDAYS_2025_2026: NorwegianHoliday[] = [
  {
    name: "Nyttårsdag",
    date: "2025-01-01",
    type: "national",
    affectsSchools: true,
    description: "New Year's Day"
  },
  {
    name: "Skjærtorsdag",
    date: "2025-04-17",
    type: "national", 
    affectsSchools: true,
    description: "Maundy Thursday"
  },
  {
    name: "Langfredag",
    date: "2025-04-18",
    type: "national",
    affectsSchools: true,
    description: "Good Friday"
  },
  {
    name: "Andre påskedag",
    date: "2025-04-21",
    type: "national",
    affectsSchools: true,
    description: "Easter Monday"
  },
  {
    name: "Arbeidernes dag",
    date: "2025-05-01",
    type: "national",
    affectsSchools: true,
    description: "Labour Day"
  },
  {
    name: "Grunnlovsdag",
    date: "2025-05-17",
    type: "national",
    affectsSchools: true,
    description: "Constitution Day"
  },
  {
    name: "Kristi himmelfartsdag",
    date: "2025-05-29",
    type: "national",
    affectsSchools: true,
    description: "Ascension Day"
  },
  {
    name: "Andre pinsedag",
    date: "2025-06-09",
    type: "national",
    affectsSchools: true,
    description: "Whit Monday"
  }
];

// Norwegian school breaks (typical dates, varies by municipality)
const NORWEGIAN_SCHOOL_BREAKS_2025_2026: NorwegianSchoolBreak[] = [
  {
    name: "Vinterferie",
    startDate: "2025-02-17",
    endDate: "2025-02-21",
    type: "vinterferie",
    affectsGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  {
    name: "Påskeferie", 
    startDate: "2025-04-14",
    endDate: "2025-04-22",
    type: "påskeferie",
    affectsGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  {
    name: "Sommerferie",
    startDate: "2025-06-20",
    endDate: "2025-08-20",
    type: "sommerferie", 
    affectsGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  {
    name: "Høstferie",
    startDate: "2025-10-06",
    endDate: "2025-10-10",
    type: "høstferie",
    affectsGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
];

export class NorwegianSchoolCalendarService {
  private cacheKey = "norwegian_school_calendar";
  
  // Get comprehensive calendar data for a child
  async getChildCalendarData(child: Child): Promise<SchoolCalendarData | null> {
    if (!child.school || !child.currentGrade) {
      return null;
    }

    try {
      // Get school events from School Crawler Platform
      const schoolEvents = await this.getSchoolEvents(child);
      
      // Get Norwegian holidays and breaks
      const holidays = this.getNorwegianHolidays();
      const breaks = this.getNorwegianSchoolBreaks(child.currentGrade);
      
      // Get SFO/AKS activities if enrolled
      const sfoActivities = child.enrolledInSFO ? await this.getSFOActivities(child) : [];
      const aksActivities = child.enrolledInAKS ? await this.getAKSActivities(child) : [];

      const calendarData: SchoolCalendarData = {
        events: schoolEvents || [],
        holidays,
        breaks,
        sfoActivities,
        aksActivities,
        lastUpdated: new Date().toISOString(),
        nextUpdateAt: this.calculateNextUpdate().toISOString(),
      };

      // Cache the data
      await this.cacheCalendarData(child.id, calendarData);
      
      return calendarData;
    } catch (error) {
      console.error("Failed to get Norwegian school calendar:", error);
      
      // Try to return cached data
      return await this.getCachedCalendarData(child.id);
    }
  }

  // Get school events from School Crawler Platform
  private async getSchoolEvents(child: Child): Promise<SchoolEvent[]> {
    if (!child.school?.website) return [];
    
    try {
      const summary = await fetchNextDaySummary(child.school.website);
      return summary?.events || [];
    } catch (error) {
      console.warn("Failed to fetch school events:", error);
      return [];
    }
  }

  // Get Norwegian holidays that affect schools
  getNorwegianHolidays(): NorwegianHoliday[] {
    return NORWEGIAN_HOLIDAYS_2025_2026.filter(holiday => holiday.affectsSchools);
  }

  // Get Norwegian school breaks for specific grade
  getNorwegianSchoolBreaks(grade: number): NorwegianSchoolBreak[] {
    return NORWEGIAN_SCHOOL_BREAKS_2025_2026.filter(breakPeriod =>
      breakPeriod.affectsGrades.includes(grade)
    );
  }

  // Check if date is Norwegian school holiday or break
  isSchoolClosedDate(date: Date, child: Child): boolean {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check holidays
    const isHoliday = this.getNorwegianHolidays().some(holiday => holiday.date === dateStr);
    if (isHoliday) return true;
    
    // Check school breaks
    if (child.currentGrade) {
      const breaks = this.getNorwegianSchoolBreaks(child.currentGrade);
      return breaks.some(breakPeriod => {
        const start = new Date(breakPeriod.startDate);
        const end = new Date(breakPeriod.endDate);
        return date >= start && date <= end;
      });
    }
    
    return false;
  }

  // Get SFO (after-school program) activities
  private async getSFOActivities(child: Child): Promise<SchoolEvent[]> {
    // In production, this would integrate with SFO activity systems
    // For now, return placeholder SFO activities
    if (!child.enrolledInSFO) return [];
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return [
      {
        id: "sfo_activity_1",
        title: "SFO - Leksetid",
        start_time: `${tomorrow.toISOString().split('T')[0]}T14:00:00+01:00`,
        end_time: `${tomorrow.toISOString().split('T')[0]}T15:00:00+01:00`,
        type: "other",
        description: "Guided homework time in SFO"
      },
      {
        id: "sfo_activity_2", 
        title: "SFO - Utendørsaktiviteter",
        start_time: `${tomorrow.toISOString().split('T')[0]}T15:00:00+01:00`,
        end_time: `${tomorrow.toISOString().split('T')[0]}T16:00:00+01:00`,
        type: "other",
        description: "Outdoor activities and free play"
      }
    ];
  }

  // Get AKS (activity school) activities  
  private async getAKSActivities(child: Child): Promise<SchoolEvent[]> {
    // In production, this would integrate with AKS activity systems
    if (!child.enrolledInAKS) return [];
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return [
      {
        id: "aks_activity_1",
        title: "AKS - Fotball",
        start_time: `${tomorrow.toISOString().split('T')[0]}T16:00:00+01:00`,
        end_time: `${tomorrow.toISOString().split('T')[0]}T17:00:00+01:00`,
        type: "other",
        description: "Football training with AKS"
      }
    ];
  }

  // Calculate when to next update calendar data
  private calculateNextUpdate(): Date {
    const now = new Date();
    const nextUpdate = new Date(now);
    
    // Update every morning at 6 AM
    nextUpdate.setHours(6, 0, 0, 0);
    if (nextUpdate <= now) {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
    }
    
    return nextUpdate;
  }

  // Cache calendar data locally
  private async cacheCalendarData(childId: string, data: SchoolCalendarData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.cacheKey}_${childId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn("Failed to cache Norwegian calendar data:", error);
    }
  }

  // Get cached calendar data
  private async getCachedCalendarData(childId: string): Promise<SchoolCalendarData | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cacheKey}_${childId}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as SchoolCalendarData;
      
      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - new Date(data.lastUpdated).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxAge) {
        await AsyncStorage.removeItem(`${this.cacheKey}_${childId}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn("Failed to get cached Norwegian calendar data:", error);
      return null;
    }
  }
}

// Export singleton instance
export const norwegianCalendar = new NorwegianSchoolCalendarService();

// Utility functions for Norwegian school calendar
export function formatNorwegianDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nb-NO', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
}

export function isNorwegianSchoolDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // Monday = 1, Friday = 5 in Norwegian schools
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

export function getNorwegianSeasonalTasks(season: "vinter" | "vår" | "sommer" | "høst"): string[] {
  const seasonalTasks = {
    vinter: [
      "Skrapise på bilen",
      "Måke snø",
      "Sette frem vinterstøvler",
      "Sjekke varmeregning"
    ],
    vår: [
      "Rydde i hagen", 
      "Vaske vinterdekk",
      "Planlegge 17. mai-feiring",
      "Bytte til sommerdekk"
    ],
    sommer: [
      "Vanne plantene",
      "Pakke til sommerferie",
      "Grille ute",
      "Badedrakt og solkrem klart"
    ],
    høst: [
      "Rake løv",
      "Sette frem vinterklær", 
      "Sjekke fyringsanlegg",
      "Handle inn til mørketiden"
    ]
  };
  
  return seasonalTasks[season] || [];
}