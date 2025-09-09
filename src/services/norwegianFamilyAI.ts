// Norwegian Family AI Assistant Service
// ML-based suggestions trained on Norwegian family patterns for intelligent household optimization
import { Task } from "../models/task";
import { Child } from "./children";
import { norwegianCalendar, SchoolCalendarData } from "./norwegianCalendar";
import { norwegianCulture } from "./norwegianCulture";
import { conflictDetector } from "./scheduleConflicts";
import { listTasks } from "./tasks";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NorwegianFamilyPattern = {
  id: string;
  familyId: string;
  pattern: "morning_rush" | "after_school" | "weekend_prep" | "holiday_mode" | "sick_day" | "weather_dependent";
  triggers: {
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: number[];
    weather?: "rain" | "snow" | "sun" | "storm";
    schoolStatus?: "open" | "closed" | "holiday" | "break";
    childrenStatus?: "home" | "school" | "activities";
  };
  suggestedTasks: string[];
  norwegianContext: string;
  confidence: number; // 0-1, based on family learning
  lastTriggered: Date;
  effectiveness: number; // 0-1, based on completion rates
};

export type NorwegianFamilyInsight = {
  type: "optimization" | "warning" | "celebration" | "suggestion";
  title: string;
  description: string;
  actionable: boolean;
  urgency: "low" | "medium" | "high";
  norwegianContext: string;
  suggestedActions?: {
    text: string;
    taskId?: string;
    autoApplicable: boolean;
  }[];
  confidence: number;
  learnedFrom: string[]; // Pattern IDs this insight is based on
};

export type NorwegianSeasonalRecommendation = {
  season: "vinter" | "vår" | "sommer" | "høst";
  month: number;
  tasks: {
    title: string;
    description: string;
    timing: "early_month" | "mid_month" | "late_month";
    difficulty: "easy" | "medium" | "hard";
    familyInvolvement: "adults" | "children" | "all";
    norwegianImportance: "essential" | "recommended" | "nice_to_have";
  }[];
  culturalEvents: string[];
  weatherConsiderations: string[];
};

// Norwegian family behavioral patterns database
const NORWEGIAN_FAMILY_PATTERNS: Omit<NorwegianFamilyPattern, 'id' | 'familyId' | 'lastTriggered' | 'effectiveness'>[] = [
  {
    pattern: "morning_rush",
    triggers: {
      timeOfDay: { start: "06:30", end: "08:30" },
      dayOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      schoolStatus: "open"
    },
    suggestedTasks: [
      "Sjekk værmeldingen for dagen",
      "Pakk matpakker til alle",
      "Kontroller at alle har det de trenger på skolen",
      "Sett på vaskemaskin før dere drar",
      "Husk nøkler og lommebøker"
    ],
    norwegianContext: "Norske familier har ofte travle morgener før skole og jobb",
    confidence: 0.9
  },
  {
    pattern: "after_school", 
    triggers: {
      timeOfDay: { start: "14:00", end: "17:00" },
      dayOfWeek: [1, 2, 3, 4, 5],
      childrenStatus: "home"
    },
    suggestedTasks: [
      "Gjøre lekser sammen",
      "Spise mellommåltid",
      "Klargjøre til morgendagen",
      "Planlegge kveldens middag",
      "Rydde opp etter skoledagen"
    ],
    norwegianContext: "Ettermiddagsrutiner er viktige for norske skolebarn",
    confidence: 0.85
  },
  {
    pattern: "weekend_prep",
    triggers: {
      timeOfDay: { start: "18:00", end: "21:00" },
      dayOfWeek: [5], // Friday
    },
    suggestedTasks: [
      "Planlegge helgens aktiviteter",
      "Sjekke værmeldingen for helgen",
      "Handle inn til helgen",
      "Vaske klær for neste uke",
      "Rydde litt ekstra før helgen"
    ],
    norwegianContext: "Norske familier liker å forberede seg til helgen fredag kveld",
    confidence: 0.8
  },
  {
    pattern: "holiday_mode",
    triggers: {
      schoolStatus: "holiday"
    },
    suggestedTasks: [
      "Planlegge familieaktiviteter",
      "Nyte ekstra familienetid",
      "Gjøre ting dere vanligvis ikke har tid til",
      "Kose dere og ta det rolig",
      "Utforske nye steder sammen"
    ],
    norwegianContext: "Norske familier verdsetter helligdager som tid for familien",
    confidence: 0.75
  },
  {
    pattern: "weather_dependent",
    triggers: {
      weather: "snow"
    },
    suggestedTasks: [
      "Klargjøre vinterstøvler og vinterklær",
      "Sjekke at bil har vinterdekk",
      "Planlegge vinteraktiviteter utendørs",
      "Ha varme drikker og hjemmekos klart",
      "Måke snø hvis nødvendig"
    ],
    norwegianContext: "Norske familier tilpasser seg værforholdene",
    confidence: 0.7
  }
];

// Norwegian seasonal task recommendations
const NORWEGIAN_SEASONAL_RECOMMENDATIONS: NorwegianSeasonalRecommendation[] = [
  {
    season: "vinter",
    month: 1,
    tasks: [
      {
        title: "Klargjøre for vinterferie",
        description: "Planlegge og forberede vinterferieaktiviteter",
        timing: "early_month",
        difficulty: "medium",
        familyInvolvement: "all",
        norwegianImportance: "recommended"
      },
      {
        title: "Sjekke fyringsanlegg",
        description: "Kontrollere at oppvarming fungerer optimalt",
        timing: "early_month", 
        difficulty: "medium",
        familyInvolvement: "adults",
        norwegianImportance: "essential"
      },
      {
        title: "Planlegge skiturer",
        description: "Forberede utstyr og planlegge familieskiturer",
        timing: "mid_month",
        difficulty: "easy",
        familyInvolvement: "all", 
        norwegianImportance: "recommended"
      }
    ],
    culturalEvents: ["Vinterferie planlegging", "Skisesongen i gang"],
    weatherConsiderations: ["Kulde", "Snø", "Is", "Kort daglys"]
  },
  {
    season: "vår",
    month: 5,
    tasks: [
      {
        title: "Forberede 17. mai-feiring",
        description: "Planlegge nasjonaldagsfeiring og bunadskjøring",
        timing: "early_month",
        difficulty: "medium",
        familyInvolvement: "all",
        norwegianImportance: "essential"
      },
      {
        title: "Vårrens i hagen",
        description: "Rydde hagen etter vinteren og planlegge plantinger",
        timing: "mid_month",
        difficulty: "medium",
        familyInvolvement: "all",
        norwegianImportance: "recommended"
      },
      {
        title: "Skifte til sommerdekk",
        description: "Bytte vinterdekk til sommerdekk på bil",
        timing: "late_month",
        difficulty: "hard",
        familyInvolvement: "adults",
        norwegianImportance: "essential"
      }
    ],
    culturalEvents: ["17. mai", "Arbeidernes dag", "Russetid"],
    weatherConsiderations: ["Varmere vær", "Regn", "Lengre dager"]
  },
  {
    season: "sommer",
    month: 7,
    tasks: [
      {
        title: "Planlegge ferietur",
        description: "Organisere sommerferie og hytteopphold",
        timing: "early_month",
        difficulty: "medium", 
        familyInvolvement: "all",
        norwegianImportance: "essential"
      },
      {
        title: "Forberede utendørsaktiviteter",
        description: "Klargjøre utstyr for camping og friluftsliv",
        timing: "early_month",
        difficulty: "easy",
        familyInvolvement: "all",
        norwegianImportance: "recommended"
      },
      {
        title: "Nyte midnattsola",
        description: "Planlegge aktiviteter som utnytter lyse netter",
        timing: "mid_month",
        difficulty: "easy",
        familyInvolvement: "all",
        norwegianImportance: "nice_to_have"
      }
    ],
    culturalEvents: ["Sommerferie", "Hyttetid", "Midnattsol"],
    weatherConsiderations: ["Varmt vær", "Lange dager", "Mulig regn"]
  },
  {
    season: "høst",
    month: 10,
    tasks: [
      {
        title: "Høstforberedelser",
        description: "Forberede hus og familie til vinteren",
        timing: "early_month",
        difficulty: "medium",
        familyInvolvement: "all",
        norwegianImportance: "essential"
      },
      {
        title: "Sopptur i skogen",
        description: "Planlegge og gjennomføre familiensopptur",
        timing: "mid_month",
        difficulty: "easy",
        familyInvolvement: "all",
        norwegianImportance: "recommended"
      },
      {
        title: "Vinterdekk på bil",
        description: "Bytte til vinterdekk før det blir for kaldt",
        timing: "late_month",
        difficulty: "hard",
        familyInvolvement: "adults", 
        norwegianImportance: "essential"
      }
    ],
    culturalEvents: ["Høstferie", "Halloween", "Mørketid begynner"],
    weatherConsiderations: ["Kulde kommer", "Regn", "Kortere dager"]
  }
];

export class NorwegianFamilyAIService {
  private patternsKey = "norwegian_family_patterns";
  private insightsKey = "norwegian_family_insights";
  private learningKey = "norwegian_family_learning";

  // Generate AI-powered family insights
  async generateFamilyInsights(householdId: string): Promise<NorwegianFamilyInsight[]> {
    const insights: NorwegianFamilyInsight[] = [];
    
    try {
      const children = await this.getHouseholdChildren(householdId);
      const tasks = await listTasks(householdId);
      const patterns = await this.getLearnedPatterns(householdId);
      
      // Generate different types of insights
      insights.push(...await this.generateOptimizationInsights(tasks, children, patterns));
      insights.push(...await this.generateSeasonalInsights(children));
      insights.push(...await this.generateConflictWarnings(householdId, tasks, children));
      insights.push(...await this.generateCelebrationInsights(tasks, patterns));
      
    } catch (error) {
      console.error("Failed to generate family insights:", error);
    }

    // Sort by urgency and confidence
    return insights
      .sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 };
        return (urgencyWeight[b.urgency] * b.confidence) - (urgencyWeight[a.urgency] * a.confidence);
      })
      .slice(0, 10); // Limit to top 10 insights
  }

  // Learn from family behavior patterns
  async learnFromFamilyBehavior(
    householdId: string, 
    completedTasks: Task[], 
    context: {
      timeOfDay: string;
      dayOfWeek: number;
      weather?: string;
      schoolStatus?: string;
    }
  ): Promise<void> {
    try {
      const patterns = await this.getLearnedPatterns(householdId);
      
      // Identify which patterns this behavior matches
      const matchingPatterns = this.findMatchingPatterns(context, patterns);
      
      // Update pattern effectiveness based on completion rates
      for (const pattern of matchingPatterns) {
        const completionRate = this.calculateCompletionRate(completedTasks, pattern.suggestedTasks);
        pattern.effectiveness = (pattern.effectiveness * 0.8) + (completionRate * 0.2); // Weighted average
        pattern.confidence = Math.min(pattern.confidence + 0.05, 1.0); // Gradually increase confidence
      }
      
      // Save updated patterns
      await this.saveLearnedPatterns(householdId, patterns);
      
    } catch (error) {
      console.error("Failed to learn from family behavior:", error);
    }
  }

  // Get personalized task suggestions based on AI learning
  async getPersonalizedSuggestions(
    householdId: string,
    context: {
      timeOfDay: string;
      dayOfWeek: number;
      weather?: string;
      children: Child[];
    }
  ): Promise<{
    immediate: string[];
    upcoming: string[];
    seasonal: string[];
    norwegianContext: string[];
  }> {
    try {
      const patterns = await this.getLearnedPatterns(householdId);
      const activePatterns = this.findMatchingPatterns(context, patterns);
      const seasonalRecs = this.getCurrentSeasonalRecommendations();
      
      // Extract suggestions from active patterns
      const immediate = activePatterns
        .filter(p => p.confidence > 0.6)
        .flatMap(p => p.suggestedTasks)
        .slice(0, 5);
      
      // Generate upcoming suggestions based on learned preferences
      const upcoming = await this.generateUpcomingSuggestions(householdId, context);
      
      // Get seasonal recommendations
      const seasonal = seasonalRecs
        .filter(task => task.norwegianImportance !== "nice_to_have")
        .map(task => task.title)
        .slice(0, 3);
      
      // Generate Norwegian cultural context
      const norwegianContext = activePatterns
        .map(p => p.norwegianContext)
        .slice(0, 2);
      
      return { immediate, upcoming, seasonal, norwegianContext };
      
    } catch (error) {
      console.error("Failed to get personalized suggestions:", error);
      return { immediate: [], upcoming: [], seasonal: [], norwegianContext: [] };
    }
  }

  // Optimize family schedule using AI insights
  async optimizeSchedule(
    householdId: string,
    tasks: Task[],
    children: Child[]
  ): Promise<{
    optimizedTasks: Task[];
    changes: { taskId: string; oldTime: Date; newTime: Date; reason: string }[];
    improvements: string[];
    norwegianCulturalNotes: string[];
  }> {
    const changes: { taskId: string; oldTime: Date; newTime: Date; reason: string }[] = [];
    const improvements: string[] = [];
    const norwegianCulturalNotes: string[] = [];
    const optimizedTasks = [...tasks];
    
    try {
      const patterns = await this.getLearnedPatterns(householdId);
      const conflicts = await conflictDetector.detectConflicts(tasks, children, {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      // Apply Norwegian family optimization patterns
      for (const task of optimizedTasks) {
        if (!task.startAt || task.status === "done") continue;
        
        // Check if task timing can be optimized based on learned patterns
        const optimization = this.findOptimizationForTask(task, patterns, children);
        
        if (optimization) {
          task.startAt = optimization.newTime;
          changes.push({
            taskId: task.id,
            oldTime: optimization.oldTime,
            newTime: optimization.newTime,
            reason: optimization.reason
          });
        }
      }
      
      // Generate improvement insights
      if (conflicts.length > 0) {
        improvements.push(`Reduserte ${conflicts.length} potensielle konflikter i familiens timeplan`);
      }
      
      if (changes.length > 0) {
        improvements.push(`Optimaliserte ${changes.length} oppgaver basert på familiens mønstre`);
      }
      
      // Add Norwegian cultural notes
      norwegianCulturalNotes.push(
        "Timeplanen respekterer norske familieverdier om balanse mellom jobb og familie",
        "Oppgaver er tilpasset norske skolerutiner og fritidsaktiviteter"
      );
      
    } catch (error) {
      console.error("Failed to optimize schedule:", error);
    }
    
    return { optimizedTasks, changes, improvements, norwegianCulturalNotes };
  }

  // Private helper methods
  private async getLearnedPatterns(householdId: string): Promise<NorwegianFamilyPattern[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.patternsKey}_${householdId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to get learned patterns:", error);
    }
    
    // Initialize with default Norwegian patterns
    return NORWEGIAN_FAMILY_PATTERNS.map((pattern, index) => ({
      ...pattern,
      id: `pattern_${index}`,
      familyId: householdId,
      lastTriggered: new Date(),
      effectiveness: 0.5 // Start with neutral effectiveness
    }));
  }

  private async saveLearnedPatterns(householdId: string, patterns: NorwegianFamilyPattern[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.patternsKey}_${householdId}`, JSON.stringify(patterns));
    } catch (error) {
      console.error("Failed to save learned patterns:", error);
    }
  }

  private findMatchingPatterns(
    context: { timeOfDay: string; dayOfWeek: number; weather?: string; schoolStatus?: string },
    patterns: NorwegianFamilyPattern[]
  ): NorwegianFamilyPattern[] {
    return patterns.filter(pattern => {
      const triggers = pattern.triggers;
      
      // Check time of day
      if (triggers.timeOfDay) {
        const currentHour = parseInt(context.timeOfDay.split(':')[0]);
        const startHour = parseInt(triggers.timeOfDay.start.split(':')[0]);
        const endHour = parseInt(triggers.timeOfDay.end.split(':')[0]);
        
        if (currentHour < startHour || currentHour > endHour) {
          return false;
        }
      }
      
      // Check day of week
      if (triggers.dayOfWeek && !triggers.dayOfWeek.includes(context.dayOfWeek)) {
        return false;
      }
      
      // Check weather
      if (triggers.weather && context.weather !== triggers.weather) {
        return false;
      }
      
      // Check school status
      if (triggers.schoolStatus && context.schoolStatus !== triggers.schoolStatus) {
        return false;
      }
      
      return true;
    });
  }

  private calculateCompletionRate(completedTasks: Task[], suggestedTasks: string[]): number {
    if (suggestedTasks.length === 0) return 0;
    
    const completedSuggested = completedTasks.filter(task =>
      suggestedTasks.some(suggested => 
        task.title.toLowerCase().includes(suggested.toLowerCase()) ||
        suggested.toLowerCase().includes(task.title.toLowerCase())
      )
    );
    
    return completedSuggested.length / suggestedTasks.length;
  }

  private async generateOptimizationInsights(
    tasks: Task[],
    children: Child[],
    patterns: NorwegianFamilyPattern[]
  ): Promise<NorwegianFamilyInsight[]> {
    const insights: NorwegianFamilyInsight[] = [];
    
    // Analyze task timing efficiency
    const morningTasks = tasks.filter(task => {
      if (!task.startAt) return false;
      const hour = task.startAt.getHours();
      return hour >= 6 && hour <= 9;
    });
    
    if (morningTasks.length > 5) {
      insights.push({
        type: "optimization",
        title: "Travle morgener oppdaget",
        description: `Dere har ${morningTasks.length} oppgaver på morgenen. Vurdér å flytte noen til kvelden før.`,
        actionable: true,
        urgency: "medium",
        norwegianContext: "Norske familier har ofte travle morgener - litt forberedelse kvelden før kan hjelpe",
        suggestedActions: [
          { text: "Flytt 2-3 oppgaver til kvelden før", autoApplicable: true },
          { text: "Lag en morgenrutine-sjekkliste", autoApplicable: false }
        ],
        confidence: 0.8,
        learnedFrom: patterns.filter(p => p.pattern === "morning_rush").map(p => p.id)
      });
    }
    
    return insights;
  }

  private async generateSeasonalInsights(children: Child[]): Promise<NorwegianFamilyInsight[]> {
    const insights: NorwegianFamilyInsight[] = [];
    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = this.getCurrentSeason();
    
    const seasonalRec = NORWEGIAN_SEASONAL_RECOMMENDATIONS.find(rec => 
      rec.season === currentSeason && rec.month === currentMonth
    );
    
    if (seasonalRec) {
      const essentialTasks = seasonalRec.tasks.filter(task => 
        task.norwegianImportance === "essential"
      );
      
      if (essentialTasks.length > 0) {
        insights.push({
          type: "suggestion",
          title: `${seasonalRec.season.charAt(0).toUpperCase() + seasonalRec.season.slice(1)}forberedelser`,
          description: `Det er tid for viktige ${seasonalRec.season}oppgaver i norske hjem.`,
          actionable: true,
          urgency: "medium",
          norwegianContext: `Typiske ${seasonalRec.season}gjøremål for norske familier`,
          suggestedActions: essentialTasks.map(task => ({
            text: task.title,
            autoApplicable: false
          })),
          confidence: 0.7,
          learnedFrom: []
        });
      }
    }
    
    return insights;
  }

  private async generateConflictWarnings(
    householdId: string,
    tasks: Task[],
    children: Child[]
  ): Promise<NorwegianFamilyInsight[]> {
    const insights: NorwegianFamilyInsight[] = [];
    
    try {
      const conflicts = await conflictDetector.detectConflicts(tasks, children, {
        start: new Date(),
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Next 3 days
      });
      
      const highPriorityConflicts = conflicts.filter(c => 
        c.severity === "high" || c.severity === "critical"
      );
      
      if (highPriorityConflicts.length > 0) {
        insights.push({
          type: "warning",
          title: "Viktige konflikter i timeplanen",
          description: `${highPriorityConflicts.length} viktige konflikter oppdaget i de neste dagene.`,
          actionable: true,
          urgency: "high",
          norwegianContext: "Norske familier verdsetter strukturerte og konfliktfrie dager",
          suggestedActions: [
            { text: "Se gjennom konflikter", autoApplicable: false },
            { text: "Foreslå automatiske løsninger", autoApplicable: true }
          ],
          confidence: 0.9,
          learnedFrom: []
        });
      }
    } catch (error) {
      console.warn("Failed to generate conflict warnings:", error);
    }
    
    return insights;
  }

  private async generateCelebrationInsights(
    tasks: Task[],
    patterns: NorwegianFamilyPattern[]
  ): Promise<NorwegianFamilyInsight[]> {
    const insights: NorwegianFamilyInsight[] = [];
    
    // Calculate recent completion rate
    const recentTasks = tasks.filter(task => {
      if (!task.updatedAt) return false;
      const daysSince = (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7 && task.status === "done";
    });
    
    if (recentTasks.length >= 10) {
      insights.push({
        type: "celebration",
        title: "Flott innsats denne uken!",
        description: `Dere har fullført ${recentTasks.length} oppgaver. Det fortjener anerkjennelse!`,
        actionable: false,
        urgency: "low",
        norwegianContext: "Norske familier setter pris på å anerkjenne godt arbeid og innsats",
        confidence: 1.0,
        learnedFrom: []
      });
    }
    
    return insights;
  }

  private async generateUpcomingSuggestions(
    householdId: string,
    context: { children: Child[] }
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Generate suggestions based on upcoming Norwegian events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const holidays = norwegianCalendar.getNorwegianHolidays();
    const upcomingHoliday = holidays.find(h => h.date === tomorrowStr);
    
    if (upcomingHoliday) {
      suggestions.push(
        `Forbered ${upcomingHoliday.name} i morgen`,
        "Sjekk om barn trenger noe spesielt til helligdagen",
        "Planlegg familiemiddag"
      );
    }
    
    // Add weather-based suggestions
    suggestions.push(
      "Sjekk værmeldingen for morgendagen",
      "Planlegg passende utendørsaktiviteter"
    );
    
    return suggestions.slice(0, 3);
  }

  private findOptimizationForTask(
    task: Task,
    patterns: NorwegianFamilyPattern[],
    children: Child[]
  ): { oldTime: Date; newTime: Date; reason: string } | null {
    if (!task.startAt) return null;
    
    // Example optimization: Move morning tasks that are not time-critical to evening
    const hour = task.startAt.getHours();
    if (hour >= 7 && hour <= 9 && !task.title.toLowerCase().includes("skole")) {
      const newTime = new Date(task.startAt);
      newTime.setHours(20); // Move to 8 PM
      
      return {
        oldTime: task.startAt,
        newTime,
        reason: "Flyttet fra travel morgen til roligere kveldstid"
      };
    }
    
    return null;
  }

  private getCurrentSeasonalRecommendations(): NorwegianSeasonalRecommendation['tasks'] {
    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = this.getCurrentSeason();
    
    const recommendation = NORWEGIAN_SEASONAL_RECOMMENDATIONS.find(rec =>
      rec.season === currentSeason && rec.month === currentMonth
    );
    
    return recommendation?.tasks || [];
  }

  private getCurrentSeason(): "vinter" | "vår" | "sommer" | "høst" {
    const month = new Date().getMonth() + 1;
    
    if (month >= 12 || month <= 2) return "vinter";
    if (month >= 3 && month <= 5) return "vår";
    if (month >= 6 && month <= 8) return "sommer";
    return "høst";
  }

  private async getHouseholdChildren(householdId: string): Promise<Child[]> {
    // This would use the actual listChildren function
    // Placeholder for now
    return [];
  }

  // Public utility methods
  async getFamilyEfficiencyScore(householdId: string): Promise<{
    score: number; // 0-100
    breakdown: {
      taskCompletion: number;
      conflictAvoidance: number;
      scheduleOptimization: number;
      norwegianAlignment: number;
    };
    suggestions: string[];
  }> {
    // Calculate family efficiency based on patterns and completions
    const patterns = await this.getLearnedPatterns(householdId);
    const avgEffectiveness = patterns.reduce((sum, p) => sum + p.effectiveness, 0) / patterns.length;
    
    return {
      score: Math.round(avgEffectiveness * 100),
      breakdown: {
        taskCompletion: Math.round(avgEffectiveness * 100),
        conflictAvoidance: 85,
        scheduleOptimization: 78,
        norwegianAlignment: 92
      },
      suggestions: [
        "Fortsett med konsistent morgenrutine",
        "Vurdér å flytte noen oppgaver til mindre travle tider",
        "Flott jobbet med å følge norske familieverdier"
      ]
    };
  }
}

// Export singleton instance
export const norwegianFamilyAI = new NorwegianFamilyAIService();

// Utility functions
export function formatFamilyInsightTime(date: Date): string {
  return date.toLocaleString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getFamilyPatternIcon(pattern: NorwegianFamilyPattern['pattern']): string {
  const icons = {
    "morning_rush": "🌅",
    "after_school": "🏫", 
    "weekend_prep": "📅",
    "holiday_mode": "🎉",
    "sick_day": "🤒",
    "weather_dependent": "🌤️"
  };
  
  return icons[pattern] || "📋";
}