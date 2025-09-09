// Norwegian Task Exceptions Service
// Advanced recurring task exceptions with Norwegian holiday and cultural awareness
import { Task } from "../models/task";
import { norwegianCalendar, NorwegianHoliday, NorwegianSchoolBreak } from "./norwegianCalendar";
import { norwegianCulture } from "./norwegianCulture";
import { updateTask } from "./tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RRule, RRuleSet, rrulestr } from "rrule";

export type NorwegianTaskException = {
  id: string;
  taskId: string;
  householdId: string;
  exceptionType: "skip" | "reschedule" | "modify" | "pause" | "vacation_mode";
  originalDate: string; // ISO date
  reason: "norwegian_holiday" | "school_break" | "family_vacation" | "sick_day" | "weather" | "cultural_event" | "manual";
  
  // For rescheduling
  newDate?: string; // ISO date
  newTime?: string; // HH:MM format
  
  // For modifications
  modifications?: {
    title?: string;
    description?: string;
    duration?: number; // minutes
    assigneeIds?: string[];
  };
  
  // Norwegian cultural context
  norwegianContext?: {
    holidayName?: string;
    culturalSignificance?: string;
    familyTraditions?: string[];
    alternativeActivities?: string[];
  };
  
  // Automation settings
  autoApplied: boolean;
  confidence: number; // 0-1, for AI-generated exceptions
  createdAt: Date;
  appliedAt?: Date;
  userApproved: boolean;
};

export type VacationMode = {
  id: string;
  householdId: string;
  startDate: string;
  endDate: string;
  vacationType: "sommerferie" | "vinterferie" | "påskeferie" | "høstferie" | "hytteferie" | "utenlandsferie" | "other";
  location?: string;
  
  // Task handling during vacation
  pauseAllTasks: boolean;
  pauseSpecificTasks: string[]; // Task IDs
  modifyTasks: { taskId: string; frequency: "reduce" | "skip" | "modify" }[];
  
  // Pre and post vacation tasks
  preparationTasks: {
    title: string;
    description: string;
    daysBeforeVacation: number;
    priority: "low" | "medium" | "high";
  }[];
  
  returnTasks: {
    title: string;
    description: string;
    daysAfterReturn: number;
    priority: "low" | "medium" | "high";
  }[];
  
  norwegianVacationContext?: {
    typicalActivities: string[];
    culturalNotes: string[];
    weatherConsiderations: string[];
  };
  
  createdAt: Date;
  isActive: boolean;
};

export type WeatherException = {
  taskId: string;
  weatherCondition: "heavy_rain" | "snow_storm" | "extreme_cold" | "high_wind" | "fog";
  threshold: number; // Temperature, wind speed, precipitation
  action: "skip" | "reschedule" | "move_indoors";
  norwegianWeatherWisdom: string;
  autoApply: boolean;
};

// Norwegian holiday-specific task handling
const NORWEGIAN_HOLIDAY_TASK_RULES: Record<string, {
  skipTasks: string[]; // Task types/keywords to skip
  modifyTasks: { keyword: string; modification: string }[];
  addTasks: string[];
  culturalNote: string;
}> = {
  "Grunnlovsdag": {
    skipTasks: ["cleaning", "homework", "work"],
    modifyTasks: [
      { keyword: "breakfast", modification: "Make special 17. mai breakfast" },
      { keyword: "clothes", modification: "Put on bunad or nice clothes" }
    ],
    addTasks: [
      "Prepare for 17. mai parade",
      "Plan celebration activities",
      "Prepare traditional foods"
    ],
    culturalNote: "17. mai er Norges viktigste nasjonale feiring - fokuser på famile og fellesskap"
  },
  "Julaften": {
    skipTasks: ["regular_chores", "homework", "work_tasks"],
    modifyTasks: [
      { keyword: "dinner", modification: "Prepare traditional Christmas Eve dinner" },
      { keyword: "evening", modification: "Christmas Eve celebration" }
    ],
    addTasks: [
      "Open Christmas presents",
      "Attend Christmas service",
      "Enjoy family time"
    ],
    culturalNote: "Julaften er den viktigste juledagen i Norge - familieid og tradisjon"
  },
  "Påskedag": {
    skipTasks: ["heavy_work", "school_prep"],
    modifyTasks: [
      { keyword: "breakfast", modification: "Easter breakfast with family" }
    ],
    addTasks: [
      "Easter egg hunt",
      "Family Easter activities",
      "Traditional Easter foods"
    ],
    culturalNote: "Påsken er tid for familie, tradisjon og påskekrim"
  }
};

// Norwegian vacation preparation and return tasks
const NORWEGIAN_VACATION_TEMPLATES: Record<VacationMode['vacationType'], {
  preparation: VacationMode['preparationTasks'];
  return: VacationMode['returnTasks'];
  context: VacationMode['norwegianVacationContext'];
}> = {
  sommerferie: {
    preparation: [
      {
        title: "Pakke sommerkoffert",
        description: "Pakk sommerklær, badetøy og solkrem",
        daysBeforeVacation: 2,
        priority: "high"
      },
      {
        title: "Forberede huset for sommerferie",
        description: "Sjekk lås, steng vannet, tøm kjøleskap",
        daysBeforeVacation: 1,
        priority: "high"
      },
      {
        title: "Planlegge sommeraktiviteter",
        description: "Undersøk aktiviteter og attraksjoner på destinasjonen",
        daysBeforeVacation: 5,
        priority: "medium"
      }
    ],
    return: [
      {
        title: "Pakke ut og vaske ferieklær",
        description: "Ta ut det skitne tøyet og start vask",
        daysAfterReturn: 1,
        priority: "high"
      },
      {
        title: "Handle inn mat",
        description: "Fylle opp kjøleskapet etter ferien",
        daysAfterReturn: 1,
        priority: "high"
      },
      {
        title: "Forberede til skolestart",
        description: "Sjekk skolesaker og forbered til ny skolegang",
        daysAfterReturn: 3,
        priority: "medium"
      }
    ],
    context: {
      typicalActivities: ["Bading", "Solbading", "Utendørs grilling", "Lange kveldstur"],
      culturalNotes: ["Norske sommerferier er hellige - nyt frihet fra rutiner"],
      weatherConsiderations: ["Kan være regn selv om det er sommer", "Pak ekstra varme klær"]
    }
  },
  
  vinterferie: {
    preparation: [
      {
        title: "Pakke vinterutstyr",
        description: "Ski, vinterstøvler, varme klær",
        daysBeforeVacation: 2,
        priority: "high"
      },
      {
        title: "Sjekke skiutstyr",
        description: "Kontroller at ski og binding er i orden",
        daysBeforeVacation: 3,
        priority: "medium"
      }
    ],
    return: [
      {
        title: "Tørke og rense vinterutstyr",
        description: "Sørg for at alt er rent og tørt før lagring",
        daysAfterReturn: 1,
        priority: "medium"
      }
    ],
    context: {
      typicalActivities: ["Ski", "Akebrett", "Bygge snømann", "Kos innendørs"],
      culturalNotes: ["Vinterferie er tid for friluftsliv og vintermoro"],
      weatherConsiderations: ["Kan være meget kaldt", "Sjekk vindforhold på fjellet"]
    }
  },

  hytteferie: {
    preparation: [
      {
        title: "Pakke til hytta",
        description: "Mat, klær og alt som trengs for hytteferie", 
        daysBeforeVacation: 1,
        priority: "high"
      },
      {
        title: "Forberede huset",
        description: "Sjekke lås og sikkerhet før avreise",
        daysBeforeVacation: 1,
        priority: "high"
      }
    ],
    return: [
      {
        title: "Rydde og legge bort hytting",
        description: "Pakke ut og organisere ting fra hytta",
        daysAfterReturn: 1,
        priority: "medium"
      }
    ],
    context: {
      typicalActivities: ["Friluftsliv", "Bading", "Fisking", "Grilling", "Naturvandring"],
      culturalNotes: ["Hytta er hellig i norsk kultur - tid for avkobling"],
      weatherConsiderations: ["Vær kan endre seg raskt", "Pakk for alle værtyper"]
    }
  },

  påskeferie: {
    preparation: [
      {
        title: "Påskeshopping",
        description: "Handle påskeegg og tradisjonell påskemat",
        daysBeforeVacation: 3,
        priority: "medium"
      }
    ],
    return: [
      {
        title: "Rydde opp etter påske",
        description: "Ta vare på påskepynt til neste år",
        daysAfterReturn: 1,
        priority: "low"
      }
    ],
    context: {
      typicalActivities: ["Påsketur", "Påskeegg", "Påskekrim", "Familie tid"],
      culturalNotes: ["Påsken er tid for tradisjon og familie"],
      weatherConsiderations: ["Vårlig vær - kan være både sol og snø"]
    }
  },

  høstferie: {
    preparation: [
      {
        title: "Pakke høstklær",
        description: "Varme klær og regntøy for høstvær",
        daysBeforeVacation: 2,
        priority: "medium"
      }
    ],
    return: [
      {
        title: "Forberede til vintermodus",
        description: "Sette frem vinterklær og -utstyr",
        daysAfterReturn: 2,
        priority: "medium"
      }
    ],
    context: {
      typicalActivities: ["Sopptur", "Bærplukking", "Høstaktiviteter"],
      culturalNotes: ["Høsten er tid for forberedelse til vinteren"],
      weatherConsiderations: ["Kan være kaldt og vått", "Pakk varmt"]
    }
  },

  utenlandsferie: {
    preparation: [
      {
        title: "Sjekke pass og reisedokumenter",
        description: "Kontroller gyldighet og ha alt klart",
        daysBeforeVacation: 7,
        priority: "high"
      },
      {
        title: "Ordne reiseforsikring",
        description: "Sørg for dekning under utenlandsopphold",
        daysBeforeVacation: 5,
        priority: "high"
      },
      {
        title: "Pakke til utenlandsreise",
        description: "Tilpasset destinasjon og aktiviteter",
        daysBeforeVacation: 2,
        priority: "high"
      }
    ],
    return: [
      {
        title: "Sortere reisebilder",
        description: "Organisere minner fra turen",
        daysAfterReturn: 3,
        priority: "low"
      },
      {
        title: "Tilpasse seg norsk tid igjen",
        description: "Komme tilbake til norsk rutine og tidssone",
        daysAfterReturn: 2,
        priority: "medium"
      }
    ],
    context: {
      typicalActivities: ["Utforske ny kultur", "Prøve lokal mat", "Sightseeing"],
      culturalNotes: ["Utenlandsferier er luksus som norske familier setter pris på"],
      weatherConsiderations: ["Sjekk klima på destinasjonen"]
    }
  },

  other: {
    preparation: [],
    return: [],
    context: {
      typicalActivities: [],
      culturalNotes: [],
      weatherConsiderations: []
    }
  }
};

export class NorwegianTaskExceptionService {
  private exceptionsKey = "norwegian_task_exceptions";
  private vacationKey = "norwegian_vacation_modes";
  private weatherKey = "norwegian_weather_exceptions";

  // Create task exception for Norwegian holiday
  async createHolidayException(
    taskId: string,
    householdId: string, 
    holiday: NorwegianHoliday,
    originalDate: string,
    autoApply: boolean = true
  ): Promise<NorwegianTaskException> {
    const holidayRules = NORWEGIAN_HOLIDAY_TASK_RULES[holiday.name];
    
    const exception: NorwegianTaskException = {
      id: `exception_${taskId}_${holiday.date}`,
      taskId,
      householdId,
      exceptionType: "skip", // Default, may be changed based on rules
      originalDate,
      reason: "norwegian_holiday",
      norwegianContext: {
        holidayName: holiday.name,
        culturalSignificance: holiday.description || holidayRules?.culturalNote,
        familyTraditions: holidayRules?.addTasks || [],
        alternativeActivities: holidayRules?.addTasks || []
      },
      autoApplied: autoApply,
      confidence: 0.9,
      createdAt: new Date(),
      userApproved: autoApply
    };

    // Apply holiday-specific rules
    if (holidayRules && autoApply) {
      await this.applyHolidayRules(exception, holidayRules);
    }

    await this.saveException(exception);
    return exception;
  }

  // Create vacation mode with Norwegian cultural context
  async createVacationMode(
    householdId: string,
    vacationData: Omit<VacationMode, 'id' | 'createdAt' | 'isActive' | 'norwegianVacationContext' | 'preparationTasks' | 'returnTasks'>
  ): Promise<VacationMode> {
    const template = NORWEGIAN_VACATION_TEMPLATES[vacationData.vacationType];
    
    const vacation: VacationMode = {
      ...vacationData,
      id: `vacation_${householdId}_${Date.now()}`,
      preparationTasks: template.preparation,
      returnTasks: template.return,
      norwegianVacationContext: template.context,
      createdAt: new Date(),
      isActive: false
    };

    await this.saveVacationMode(vacation);
    
    // Create preparation tasks
    if (vacation.preparationTasks.length > 0) {
      await this.createVacationPreparationTasks(vacation);
    }

    return vacation;
  }

  // Activate vacation mode with automatic task management
  async activateVacationMode(vacationId: string): Promise<{
    pausedTasks: string[];
    modifiedTasks: { taskId: string; originalRRule: string; newRRule: string }[];
    createdTasks: string[];
  }> {
    const vacation = await this.getVacationMode(vacationId);
    if (!vacation) throw new Error("Vacation mode not found");

    const results = {
      pausedTasks: [] as string[],
      modifiedTasks: [] as { taskId: string; originalRRule: string; newRRule: string }[],
      createdTasks: [] as string[]
    };

    try {
      // Pause specified tasks during vacation
      if (vacation.pauseAllTasks || vacation.pauseSpecificTasks.length > 0) {
        const tasksToPause = vacation.pauseAllTasks ? 
          await this.getAllHouseholdTasks(vacation.householdId) :
          vacation.pauseSpecificTasks;

        for (const taskId of tasksToPause) {
          await this.pauseTaskDuringVacation(taskId, vacation.startDate, vacation.endDate);
          results.pausedTasks.push(taskId);
        }
      }

      // Apply task modifications
      for (const modification of vacation.modifyTasks) {
        const result = await this.modifyTaskForVacation(modification.taskId, modification.frequency, vacation);
        if (result) {
          results.modifiedTasks.push(result);
        }
      }

      // Create return tasks
      const returnTaskIds = await this.createVacationReturnTasks(vacation);
      results.createdTasks.push(...returnTaskIds);

      // Mark vacation as active
      vacation.isActive = true;
      await this.saveVacationMode(vacation);

    } catch (error) {
      console.error("Failed to activate vacation mode:", error);
    }

    return results;
  }

  // Handle weather-based task exceptions
  async handleWeatherException(
    taskId: string,
    weatherCondition: WeatherException['weatherCondition'],
    currentWeather: { temperature?: number; windSpeed?: number; precipitation?: number }
  ): Promise<NorwegianTaskException | null> {
    const weatherRules = await this.getWeatherExceptions(taskId);
    const applicableRule = weatherRules.find(rule => rule.weatherCondition === weatherCondition);
    
    if (!applicableRule) return null;

    // Check if weather exceeds threshold
    let threshold = false;
    switch (weatherCondition) {
      case "extreme_cold":
        threshold = (currentWeather.temperature ?? 0) <= applicableRule.threshold;
        break;
      case "high_wind":
        threshold = (currentWeather.windSpeed ?? 0) >= applicableRule.threshold;
        break;
      case "heavy_rain":
        threshold = (currentWeather.precipitation ?? 0) >= applicableRule.threshold;
        break;
      default:
        threshold = true;
    }

    if (!threshold) return null;

    const exception: NorwegianTaskException = {
      id: `weather_${taskId}_${Date.now()}`,
      taskId,
      householdId: "", // Will be filled from task
      exceptionType: applicableRule.action as any,
      originalDate: new Date().toISOString().split('T')[0],
      reason: "weather",
      norwegianContext: {
        culturalSignificance: applicableRule.norwegianWeatherWisdom
      },
      autoApplied: applicableRule.autoApply,
      confidence: 0.8,
      createdAt: new Date(),
      userApproved: applicableRule.autoApply
    };

    if (applicableRule.autoApply) {
      await this.applyException(exception);
    }

    await this.saveException(exception);
    return exception;
  }

  // Get all exceptions for a household
  async getHouseholdExceptions(
    householdId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<NorwegianTaskException[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.exceptionsKey}_${householdId}`);
      let exceptions: NorwegianTaskException[] = stored ? JSON.parse(stored) : [];

      if (dateRange) {
        exceptions = exceptions.filter(exception => {
          const exceptionDate = new Date(exception.originalDate);
          return exceptionDate >= dateRange.start && exceptionDate <= dateRange.end;
        });
      }

      return exceptions;
    } catch (error) {
      console.error("Failed to get household exceptions:", error);
      return [];
    }
  }

  // Apply exception to task
  private async applyException(exception: NorwegianTaskException): Promise<void> {
    try {
      // This would integrate with the task service to apply the exception
      console.log(`Applying exception ${exception.exceptionType} to task ${exception.taskId}`);
      
      switch (exception.exceptionType) {
        case "skip":
          await this.skipTaskOccurrence(exception.taskId, exception.originalDate);
          break;
        case "reschedule":
          if (exception.newDate) {
            await this.rescheduleTask(exception.taskId, exception.originalDate, exception.newDate);
          }
          break;
        case "modify":
          if (exception.modifications) {
            await this.modifyTask(exception.taskId, exception.modifications);
          }
          break;
        case "pause":
          await this.pauseTask(exception.taskId);
          break;
      }

      exception.appliedAt = new Date();
      await this.saveException(exception);
      
    } catch (error) {
      console.error("Failed to apply exception:", error);
    }
  }

  // Helper methods for task operations
  private async skipTaskOccurrence(taskId: string, date: string): Promise<void> {
    // Add date to skipDates array in task
    console.log(`Skipping task ${taskId} on ${date}`);
  }

  private async rescheduleTask(taskId: string, originalDate: string, newDate: string): Promise<void> {
    // Modify task's exceptionShifts
    console.log(`Rescheduling task ${taskId} from ${originalDate} to ${newDate}`);
  }

  private async modifyTask(taskId: string, modifications: NorwegianTaskException['modifications']): Promise<void> {
    // Apply modifications to task
    console.log(`Modifying task ${taskId}:`, modifications);
  }

  private async pauseTask(taskId: string): Promise<void> {
    // Set pausedUntil on task
    console.log(`Pausing task ${taskId}`);
  }

  private async pauseTaskDuringVacation(taskId: string, startDate: string, endDate: string): Promise<void> {
    console.log(`Pausing task ${taskId} during vacation from ${startDate} to ${endDate}`);
  }

  private async modifyTaskForVacation(
    taskId: string, 
    frequency: "reduce" | "skip" | "modify", 
    vacation: VacationMode
  ): Promise<{ taskId: string; originalRRule: string; newRRule: string } | null> {
    // Modify task frequency during vacation
    console.log(`Modifying task ${taskId} frequency to ${frequency} during vacation`);
    return null; // Placeholder
  }

  private async createVacationPreparationTasks(vacation: VacationMode): Promise<string[]> {
    const createdTaskIds: string[] = [];
    
    for (const prepTask of vacation.preparationTasks) {
      const dueDate = new Date(vacation.startDate);
      dueDate.setDate(dueDate.getDate() - prepTask.daysBeforeVacation);
      
      console.log(`Creating preparation task: ${prepTask.title} due ${dueDate.toISOString()}`);
      // This would create actual tasks in the system
      createdTaskIds.push(`prep_task_${Date.now()}`);
    }
    
    return createdTaskIds;
  }

  private async createVacationReturnTasks(vacation: VacationMode): Promise<string[]> {
    const createdTaskIds: string[] = [];
    
    for (const returnTask of vacation.returnTasks) {
      const dueDate = new Date(vacation.endDate);
      dueDate.setDate(dueDate.getDate() + returnTask.daysAfterReturn);
      
      console.log(`Creating return task: ${returnTask.title} due ${dueDate.toISOString()}`);
      createdTaskIds.push(`return_task_${Date.now()}`);
    }
    
    return createdTaskIds;
  }

  private async applyHolidayRules(
    exception: NorwegianTaskException, 
    rules: typeof NORWEGIAN_HOLIDAY_TASK_RULES[string]
  ): Promise<void> {
    // Apply Norwegian holiday-specific rules
    console.log(`Applying holiday rules for ${exception.norwegianContext?.holidayName}`);
  }

  // Storage methods
  private async saveException(exception: NorwegianTaskException): Promise<void> {
    try {
      const key = `${this.exceptionsKey}_${exception.householdId}`;
      const existing = await AsyncStorage.getItem(key);
      const exceptions: NorwegianTaskException[] = existing ? JSON.parse(existing) : [];
      
      const existingIndex = exceptions.findIndex(e => e.id === exception.id);
      if (existingIndex >= 0) {
        exceptions[existingIndex] = exception;
      } else {
        exceptions.push(exception);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(exceptions));
    } catch (error) {
      console.error("Failed to save exception:", error);
    }
  }

  private async saveVacationMode(vacation: VacationMode): Promise<void> {
    try {
      const key = `${this.vacationKey}_${vacation.householdId}`;
      const existing = await AsyncStorage.getItem(key);
      const vacations: VacationMode[] = existing ? JSON.parse(existing) : [];
      
      const existingIndex = vacations.findIndex(v => v.id === vacation.id);
      if (existingIndex >= 0) {
        vacations[existingIndex] = vacation;
      } else {
        vacations.push(vacation);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(vacations));
    } catch (error) {
      console.error("Failed to save vacation mode:", error);
    }
  }

  private async getVacationMode(vacationId: string): Promise<VacationMode | null> {
    try {
      // This would search through all household vacation modes
      // Simplified for now
      return null;
    } catch (error) {
      console.error("Failed to get vacation mode:", error);
      return null;
    }
  }

  private async getWeatherExceptions(taskId: string): Promise<WeatherException[]> {
    // Return weather-based exception rules for task
    return [];
  }

  private async getAllHouseholdTasks(householdId: string): Promise<string[]> {
    // Return all task IDs for household
    return [];
  }

  // Public utility methods
  async getNorwegianVacationSuggestions(
    month: number,
    familySize: number,
    childrenAges: number[]
  ): Promise<{
    vacationType: VacationMode['vacationType'];
    suggestion: string;
    culturalNote: string;
    activities: string[];
  }[]> {
    const suggestions = [];
    
    // Summer vacation suggestions
    if (month >= 6 && month <= 8) {
      suggestions.push({
        vacationType: "sommerferie" as VacationMode['vacationType'],
        suggestion: "Norsk sommerferie - tid for frihet og opplevelser",
        culturalNote: "Sommeren er hellig i Norge - mange tar lang ferie",
        activities: ["Hyttetid", "Camping", "Strandliv", "Fisketurer"]
      });
    }

    // Winter vacation suggestions
    if (month >= 12 || month <= 3) {
      suggestions.push({
        vacationType: "vinterferie" as VacationMode['vacationType'],
        suggestion: "Vinterferie i fjellet eller på hytta",
        culturalNote: "Vinterferie er tid for skiaktiviteter og hygge",
        activities: ["Skitur", "Snølek", "Kos innendørs", "Vinteraktiviteter"]
      });
    }

    return suggestions;
  }
}

// Export singleton instance
export const norwegianTaskExceptions = new NorwegianTaskExceptionService();

// Utility functions
export function formatExceptionReason(reason: NorwegianTaskException['reason']): string {
  const reasons = {
    norwegian_holiday: "Norsk helligdag",
    school_break: "Skoleferie",
    family_vacation: "Familieferie",
    sick_day: "Sykdom",
    weather: "Værforhold",
    cultural_event: "Kulturelt arrangement",
    manual: "Manuell endring"
  };
  
  return reasons[reason] || reason;
}

export function getVacationTypeIcon(vacationType: VacationMode['vacationType']): string {
  const icons = {
    sommerferie: "☀️",
    vinterferie: "❄️",
    påskeferie: "🐣",
    høstferie: "🍂",
    hytteferie: "🏠",
    utenlandsferie: "✈️",
    other: "🏖️"
  };
  
  return icons[vacationType] || "📅";
}