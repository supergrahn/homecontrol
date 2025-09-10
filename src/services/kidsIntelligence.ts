/**
 * AI Kids Intelligence Service
 * 
 * Provides Norwegian family-focused AI intelligence for children's activities,
 * school schedules, and coordination needs with anomaly detection.
 */

import { Child } from './children';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

export interface KidsIntelligenceData {
  childId: string;
  child: Child;
  todaysSummary: DailySummary;
  weekAhead: WeeklyIntelligence;
  suggestions: AISuggestions;
  anomalies: ScheduleAnomaly[];
  norwegianContext: NorwegianChildContext;
}

export interface DailySummary {
  date: Date;
  childName: string;
  schoolSchedule: TimeSlot[];
  activities: Activity[];
  anomalies: string[];
  coordinationTips: string[];
  weatherContext: string;
  preparationNeeded: PreparationItem[];
}

export interface TimeSlot {
  id: string;
  title: string;
  startTime: string; // HH:mm format
  endTime: string;
  type: 'school' | 'sfo' | 'aks' | 'activity' | 'appointment';
  location?: string;
  requiresTransport?: boolean;
  notes?: string;
}

export interface Activity {
  id: string;
  name: string;
  type: 'sport' | 'music' | 'art' | 'academic' | 'social';
  time: string;
  location: string;
  recurring: boolean;
  coordinationNeeded: boolean;
}

export interface WeeklyIntelligence {
  weekStart: Date;
  weekEnd: Date;
  upcomingDeadlines: Deadline[];
  scheduleConflicts: Conflict[];
  familyCoordinationNeeds: CoordinationNeed[];
  norwegianHolidays: NorwegianHoliday[];
  schoolBreaks: SchoolBreak[];
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  type: 'homework' | 'permission_slip' | 'payment' | 'event_rsvp';
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: number; // minutes
  requiresParentAction: boolean;
}

export interface Conflict {
  id: string;
  type: 'schedule' | 'transport' | 'resource';
  description: string;
  childrenAffected: string[]; // child IDs
  suggestedResolution: string;
  communityCoordinationOpportunity?: string;
}

export interface CoordinationNeed {
  id: string;
  title: string;
  description: string;
  childrenInvolved: string[];
  type: 'transport' | 'childcare' | 'activity_coordination' | 'resource_sharing';
  suggestedFamilies?: string[];
  deadline?: Date;
}

export interface AISuggestions {
  carpoolOpportunities: string[];
  activityRecommendations: ActivityRecommendation[];
  familyTimeSuggestions: string[];
  resourceSharingOpportunities: string[];
  communityConnectionSuggestions: string[];
}

export interface ActivityRecommendation {
  activity: string;
  reason: string;
  seasonalRelevance: boolean;
  norwegianCultural: boolean;
  ageAppropriate: boolean;
  communityAspect?: string;
}

export interface ScheduleAnomaly {
  id: string;
  type: 'early_dismissal' | 'schedule_change' | 'cancelled_activity' | 'new_requirement' | 'weather_related';
  title: string;
  description: string;
  date: Date;
  childId: string;
  impact: 'low' | 'medium' | 'high';
  actionRequired?: string;
  coordinationNeeded?: boolean;
}

export interface PreparationItem {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  type: 'equipment' | 'clothing' | 'supplies' | 'permission' | 'payment';
  norwegianContext?: string; // Cultural context explanation
}

export interface NorwegianChildContext {
  schoolType: 'barnehage' | 'grunnskole' | 'videregaende';
  grade?: number;
  currentSeason: 'winter' | 'spring' | 'summer' | 'autumn';
  seasonalActivities: string[];
  upcomingTraditions: NorwegianTradition[];
  quietHoursRespected: boolean;
  communityIntegration: {
    schoolClass: boolean;
    sfoGroup: boolean;
    neighborhoodActivities: boolean;
    parentNetwork: boolean;
  };
}

export interface NorwegianTradition {
  id: string;
  name: string;
  date: Date;
  preparation: string[];
  childParticipation: string;
  familyCoordination: string;
}

export interface NorwegianHoliday {
  id: string;
  name: string;
  date: Date;
  schoolClosed: boolean;
  culturalSignificance: string;
  familyActivities: string[];
}

export interface SchoolBreak {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  type: 'winter' | 'easter' | 'summer' | 'autumn';
  planning: {
    activitySuggestions: string[];
    coordinationOpportunities: string[];
    preparationNeeded: string[];
  };
}

/**
 * AI Kids Intelligence Service Implementation
 */
export class KidsIntelligenceService {
  
  /**
   * Generate comprehensive intelligence data for a child
   */
  async generateKidsIntelligence(child: Child): Promise<KidsIntelligenceData> {
    const today = dayjs();
    const weekStart = today.startOf('week');
    const weekEnd = today.endOf('week');
    
    // Generate today's summary with anomaly detection
    const todaysSummary = await this.generateDailySummary(child, today.toDate());
    
    // Generate weekly intelligence
    const weekAhead = await this.generateWeeklyIntelligence(child, weekStart.toDate(), weekEnd.toDate());
    
    // Generate AI suggestions
    const suggestions = await this.generateAISuggestions(child);
    
    // Detect schedule anomalies
    const anomalies = await this.detectScheduleAnomalies(child);
    
    // Norwegian cultural context
    const norwegianContext = await this.generateNorwegianContext(child);
    
    return {
      childId: child.id,
      child,
      todaysSummary,
      weekAhead,
      suggestions,
      anomalies,
      norwegianContext,
    };
  }
  
  /**
   * Generate daily summary with Norwegian context
   */
  private async generateDailySummary(child: Child, date: Date): Promise<DailySummary> {
    // Mock implementation - in real app this would integrate with school APIs, calendar data, etc.
    const mockSchedule: TimeSlot[] = [
      {
        id: '1',
        title: 'Skole',
        startTime: '08:15',
        endTime: '14:00',
        type: 'school',
        location: child.school?.name || 'Skole',
        requiresTransport: false,
      },
      {
        id: '2',
        title: 'SFO',
        startTime: '14:00',
        endTime: '16:00',
        type: 'sfo',
        location: child.school?.name || 'Skole',
        requiresTransport: false,
      }
    ];
    
    // Detect anomalies for today
    const todaysAnomalies = [
      `${child.displayName} har tidlig slutt tirsdag (13:00) for lærermøte`,
      'Husk: Gymnastikktøy til torsdag',
    ];
    
    // Generate Norwegian coordination tips
    const coordinationTips = [
      'Tre familier fra klassen trenger kjøring til fotballtrening',
      'Perfekt vær for sykling til skole i dag!',
      'Bursdagsfest på lørdag - husk gave til Emma (150-200 kr)',
    ];
    
    // Weather context for Norwegian families
    const weatherContext = this.generateWeatherContext(date);
    
    // Preparation items
    const preparationNeeded: PreparationItem[] = [
      {
        id: '1',
        title: 'Gymnastikktøy',
        description: 'Husk gymnastikktøy til torsdag',
        deadline: dayjs(date).add(2, 'days').toDate(),
        type: 'equipment',
        norwegianContext: 'Gymnastikk er obligatorisk i norsk skole',
      }
    ];
    
    return {
      date,
      childName: child.displayName,
      schoolSchedule: mockSchedule,
      activities: [],
      anomalies: todaysAnomalies,
      coordinationTips,
      weatherContext,
      preparationNeeded,
    };
  }
  
  /**
   * Generate weekly intelligence with Norwegian planning
   */
  private async generateWeeklyIntelligence(child: Child, weekStart: Date, weekEnd: Date): Promise<WeeklyIntelligence> {
    // Mock Norwegian holidays and school breaks
    const norwegianHolidays: NorwegianHoliday[] = [];
    const schoolBreaks: SchoolBreak[] = [];
    
    // Check if 17. mai is this week
    const currentYear = dayjs().year();
    const constitutionDay = dayjs(`${currentYear}-05-17`);
    if (constitutionDay.isBetween(weekStart, weekEnd, 'day', '[]')) {
      norwegianHolidays.push({
        id: '17mai',
        name: '17. mai - Grunnlovsdagen',
        date: constitutionDay.toDate(),
        schoolClosed: true,
        culturalSignificance: 'Norges nasjonaldag med barnetog og feiring',
        familyActivities: ['Barnetog', 'Flaggheising', 'Familiemiddag', 'Bunad/festklær'],
      });
    }
    
    // Mock upcoming deadlines
    const upcomingDeadlines: Deadline[] = [
      {
        id: '1',
        title: 'Tillatelse for klassetur',
        dueDate: dayjs(weekEnd).add(1, 'week').toDate(),
        type: 'permission_slip',
        priority: 'high',
        requiresParentAction: true,
      },
      {
        id: '2',
        title: 'Matematikk hjemmeoppgave',
        dueDate: dayjs(weekEnd).add(2, 'days').toDate(),
        type: 'homework',
        priority: 'medium',
        estimatedTime: 30,
        requiresParentAction: false,
      }
    ];
    
    // Detect schedule conflicts
    const scheduleConflicts: Conflict[] = [];
    
    // Family coordination needs
    const familyCoordinationNeeds: CoordinationNeed[] = [
      {
        id: '1',
        title: 'Fotballtrening transport',
        description: 'Koordinere kjøring til fotballtrening onsdag',
        childrenInvolved: [child.id],
        type: 'transport',
        suggestedFamilies: ['Familie Jensen', 'Familie Hansen'],
        deadline: dayjs().add(3, 'days').toDate(),
      }
    ];
    
    return {
      weekStart,
      weekEnd,
      upcomingDeadlines,
      scheduleConflicts,
      familyCoordinationNeeds,
      norwegianHolidays,
      schoolBreaks,
    };
  }
  
  /**
   * Generate AI suggestions with Norwegian cultural awareness
   */
  private async generateAISuggestions(child: Child): Promise<AISuggestions> {
    const currentSeason = this.getCurrentNorwegianSeason();
    
    // Seasonal activity recommendations
    const activityRecommendations: ActivityRecommendation[] = [];
    
    if (currentSeason === 'winter') {
      activityRecommendations.push({
        activity: 'Langrenn for barn',
        reason: 'Perfekt snøforhold for å lære langrenn',
        seasonalRelevance: true,
        norwegianCultural: true,
        ageAppropriate: true,
        communityAspect: 'Mange familier i området går sammen på ski',
      });
    } else if (currentSeason === 'summer') {
      activityRecommendations.push({
        activity: 'Friluftsliv og bærplukking',
        reason: 'Perfekt tid for å utforske naturen og plukke bær',
        seasonalRelevance: true,
        norwegianCultural: true,
        ageAppropriate: true,
        communityAspect: 'Organiser bærplukking med andre familier',
      });
    }
    
    return {
      carpoolOpportunities: [
        'Dele kjøring til fotballtrening med Familie Hansen',
        'Koordinere henting fra SFO med nabofamilier',
      ],
      activityRecommendations,
      familyTimeSuggestions: [
        'Helg på hytta - perfekt tid for familietur',
        'Søndagsmiddag med utvidet familie',
      ],
      resourceSharingOpportunities: [
        'Låne ski-utstyr fra Familie Jensen',
        'Dele kostyme til skuespill med andre foreldre',
      ],
      communityConnectionSuggestions: [
        'Bli med på foreldregruppen for klassen',
        'Organiser dugnad for skolen sammen med andre',
      ],
    };
  }
  
  /**
   * Detect schedule anomalies with Norwegian school context
   */
  private async detectScheduleAnomalies(child: Child): Promise<ScheduleAnomaly[]> {
    const anomalies: ScheduleAnomaly[] = [];
    
    // Mock anomaly detection - in real app this would analyze calendar changes, school notifications, etc.
    anomalies.push({
      id: '1',
      type: 'early_dismissal',
      title: 'Tidlig slutt tirsdag',
      description: `${child.displayName} har tidlig slutt tirsdag (13:00) på grunn av lærermøte`,
      date: dayjs().add(2, 'days').toDate(),
      childId: child.id,
      impact: 'medium',
      actionRequired: 'Koordiner henting eller barnepass fra 13:00',
      coordinationNeeded: true,
    });
    
    // Weather-related anomaly
    if (this.getCurrentNorwegianSeason() === 'winter') {
      anomalies.push({
        id: '2',
        type: 'weather_related',
        title: 'Ekstra vinterkledning',
        description: 'Kuldegrader denne uken - husk ekstra varm klær til friluft',
        date: dayjs().toDate(),
        childId: child.id,
        impact: 'low',
        actionRequired: 'Sjekk vinterjjakke og lue',
        coordinationNeeded: false,
      });
    }
    
    return anomalies;
  }
  
  /**
   * Generate Norwegian cultural context for child
   */
  private async generateNorwegianContext(child: Child): Promise<NorwegianChildContext> {
    const currentSeason = this.getCurrentNorwegianSeason();
    const seasonalActivities = this.getSeasonalActivities(currentSeason);
    
    // Determine school type based on age
    const schoolType = this.determineSchoolType(child);
    
    // Upcoming Norwegian traditions
    const upcomingTraditions = this.getUpcomingNorwegianTraditions();
    
    return {
      schoolType,
      grade: child.grade,
      currentSeason,
      seasonalActivities,
      upcomingTraditions,
      quietHoursRespected: true, // Respect Norwegian communication norms
      communityIntegration: {
        schoolClass: true,
        sfoGroup: child.school?.name ? true : false,
        neighborhoodActivities: true,
        parentNetwork: true,
      },
    };
  }
  
  /**
   * Utility methods for Norwegian context
   */
  private getCurrentNorwegianSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
    const month = dayjs().month() + 1; // dayjs months are 0-indexed
    
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'autumn';
  }
  
  private getSeasonalActivities(season: string): string[] {
    switch (season) {
      case 'winter':
        return ['Langrenn', 'Alpint', 'Isbading', 'Vinterlek', 'Lucia-forberedelser'];
      case 'spring':
        return ['17. mai forberedelser', 'Sykling', 'Friluftsliv', 'Klassetur'];
      case 'summer':
        return ['Bærplukking', 'Camping', 'Svømming', 'Friluftsliv', 'Sommerferie'];
      case 'autumn':
        return ['Skolestart', 'Fotball', 'Håndball', 'Høstaktiviteter'];
      default:
        return [];
    }
  }
  
  private determineSchoolType(child: Child): 'barnehage' | 'grunnskole' | 'videregaende' {
    if (!child.grade || child.grade <= 0) return 'barnehage';
    if (child.grade <= 10) return 'grunnskole';
    return 'videregaende';
  }
  
  private getUpcomingNorwegianTraditions(): NorwegianTradition[] {
    const traditions: NorwegianTradition[] = [];
    const now = dayjs();
    
    // Check for 17. mai
    const constitutionDay = dayjs(`${now.year()}-05-17`);
    if (constitutionDay.isAfter(now) && constitutionDay.diff(now, 'months') < 2) {
      traditions.push({
        id: '17mai',
        name: '17. mai',
        date: constitutionDay.toDate(),
        preparation: ['Kjøp/sys bunad', 'Planlegg barnetog rute', 'Organiser familiemiddag'],
        childParticipation: 'Barnetog med skolen, flagg og sang',
        familyCoordination: 'Koordiner med andre familier for feiring',
      });
    }
    
    // Check for Lucia (December 13)
    const lucia = dayjs(`${now.year()}-12-13`);
    if (lucia.isAfter(now) && lucia.diff(now, 'months') < 2) {
      traditions.push({
        id: 'lucia',
        name: 'Lucia',
        date: lucia.toDate(),
        preparation: ['Lys, hvite kjøler', 'Øv på Lucia-sanger', 'Bak lussekatter'],
        childParticipation: 'Lucia-tog på skolen eller i nabolaget',
        familyCoordination: 'Delta i Lucia-planlegging med andre foreldre',
      });
    }
    
    return traditions;
  }
  
  private generateWeatherContext(date: Date): string {
    const season = this.getCurrentNorwegianSeason();
    const dayOfWeek = dayjs(date).format('dddd');
    
    switch (season) {
      case 'winter':
        return `Kaldt ${dayOfWeek} - perfekt for vinterleker ute! Husk varm påkledning.`;
      case 'spring':
        return `Fin vårdag ${dayOfWeek} - bra tid for sykling til skole!`;
      case 'summer':
        return `Deilig sommerdag ${dayOfWeek} - perfekt for friluftsliv etter skole!`;
      case 'autumn':
        return `Typisk høstdag ${dayOfWeek} - husk regnklær og gummistøvler.`;
      default:
        return `God dag for utendørsaktiviteter!`;
    }
  }
  
  /**
   * Get intelligence for multiple children
   */
  async generateFamilyIntelligence(children: Child[]): Promise<KidsIntelligenceData[]> {
    const intelligencePromises = children.map(child => this.generateKidsIntelligence(child));
    return Promise.all(intelligencePromises);
  }
  
  /**
   * Get family coordination opportunities based on kids' intelligence
   */
  async getFamilyCoordinationOpportunities(intelligenceData: KidsIntelligenceData[]): Promise<CoordinationNeed[]> {
    const coordinationNeeds: CoordinationNeed[] = [];
    
    // Find shared activities across children
    const allActivities = intelligenceData.flatMap(data => data.todaysSummary.activities);
    const sharedActivities = this.findSharedActivities(allActivities);
    
    sharedActivities.forEach(activity => {
      coordinationNeeds.push({
        id: `coord_${activity.id}`,
        title: `Koordiner ${activity.name}`,
        description: `Flere barn deltar i ${activity.name} - koordiner transport/forberedelser`,
        childrenInvolved: intelligenceData
          .filter(data => data.todaysSummary.activities.some(a => a.id === activity.id))
          .map(data => data.childId),
        type: 'activity_coordination',
        suggestedFamilies: ['Andre foreldre med barn i samme aktivitet'],
      });
    });
    
    return coordinationNeeds;
  }
  
  private findSharedActivities(activities: Activity[]): Activity[] {
    // Group activities by name and find those with multiple participants
    const activityGroups = activities.reduce((groups, activity) => {
      const key = activity.name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
      return groups;
    }, {} as Record<string, Activity[]>);
    
    return Object.values(activityGroups)
      .filter(group => group.length > 1)
      .map(group => group[0]); // Return first instance of each shared activity
  }
}

// Export singleton instance
export const kidsIntelligenceService = new KidsIntelligenceService();