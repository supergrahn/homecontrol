// Norwegian Intelligence Backend Service
// Advanced AI processing for Norwegian family coordination and cultural recommendations

import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Types for Norwegian AI processing
export interface NorwegianFamilyData {
  householdId: string;
  children: {
    id: string;
    name: string;
    age: number;
    grade?: number;
    schoolId?: string;
    interests: string[];
    currentActivities: string[];
  }[];
  taskHistory: {
    taskId: string;
    title: string;
    completedAt: Date;
    completedBy: string;
    timeSpent?: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  familyPreferences: {
    preferredLanguage: 'nb' | 'en';
    culturalAlignment: number; // 0-1 scale
    friluftsliv: boolean;
    observeHolidays: boolean;
    quietHours: { start: string; end: string };
  };
  locationContext: {
    kommune: string;
    fylke: string;
    climate: 'coastal' | 'inland' | 'arctic';
    timezone: string;
  };
}

export interface NorwegianAIInsight {
  type: 'seasonal_prep' | 'cultural_event' | 'family_optimization' | 'dugnad_planning' | 'friluftsliv';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  culturalContext: string;
  suggestions: {
    action: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeEstimate: number; // minutes
    familyInvolvement: 'adults' | 'children' | 'all';
    timing: 'immediate' | 'this_week' | 'this_month' | 'seasonal';
  }[];
  confidence: number; // 0-1
  norwegianValues: string[];
}

export interface WeatherInfluencedActivity {
  activityType: string;
  description: string;
  suitableWeather: string[];
  equipment: string[];
  duration: number;
  ageGroups: number[][];
  norwegianTradition: boolean;
  friluftsliv: boolean;
}

// Norwegian seasonal intelligence patterns
const NORWEGIAN_SEASONAL_INTELLIGENCE = {
  høst: {
    months: [9, 10, 11],
    keyTasks: [
      {
        task: 'Vinterforberedelser',
        timing: 'early_october',
        culturalImportance: 'essential',
        description: 'Forberede hus og familie til den kommende vinteren',
        subtasks: ['Vinterdekk på bil', 'Sjekke fyringsanlegg', 'Vinterklær frem', 'Vinterstøvler klare']
      },
      {
        task: 'Sopptur',
        timing: 'september_october',
        culturalImportance: 'traditional',
        description: 'Tradisjonell norsk familieaktivitet for høsten',
        subtasks: ['Planlegge sopprute', 'Pakke turutstyr', 'Lære barn om sopp', 'Nyte naturen sammen']
      },
      {
        task: 'Høstmys',
        timing: 'throughout_season',
        culturalImportance: 'cultural',
        description: 'Kose seg innendørs når mørketiden kommer',
        subtasks: ['Tenne lys', 'Varme drikker', 'Hjemmebaking', 'Familieaktiviteter inne']
      }
    ],
    culturalEvents: ['Høstferie', 'Halloween (økende popularitet)', 'Skolestart etter sommerferie'],
    weatherConsiderations: ['Kortere dager', 'Temperaturfall', 'Økt nedbør', 'Første frost']
  },
  
  vinter: {
    months: [12, 1, 2],
    keyTasks: [
      {
        task: 'Vinterferie forberedelser',
        timing: 'january_february',
        culturalImportance: 'essential',
        description: 'Planlegge og forberede vinterferieaktiviteter',
        subtasks: ['Bestille hyttetur', 'Skiutstyr klart', 'Vinteraktiviteter', 'Pakke varme klær']
      },
      {
        task: 'Juletradisjon oppfølging',
        timing: 'december_january',
        culturalImportance: 'traditional',
        description: 'Vedlikeholde norske juletradisjon år etter år',
        subtasks: ['Evaluere årets jul', 'Planlegge neste år', 'Ta vare på tradisjon', 'Lære barna']
      },
      {
        task: 'Snøaktiviteter',
        timing: 'december_february',
        culturalImportance: 'friluftsliv',
        description: 'Utnytte vinteren for aktiv familie friluftsliv',
        subtasks: ['Bygg snømann', 'Gå på ski', 'Ake', 'Leke i snøen']
      }
    ],
    culturalEvents: ['Jul', 'Nyttår', 'Vinterferie', 'Fastelavn'],
    weatherConsiderations: ['Snø og is', 'Kort daglys', 'Kulde', 'Vinterføre']
  },
  
  vår: {
    months: [3, 4, 5],
    keyTasks: [
      {
        task: '17. mai forberedelser',
        timing: 'april_early_may',
        culturalImportance: 'essential',
        description: 'Forberede Norges viktigste nasjonale feiring',
        subtasks: ['Sjekke bunad/festklær', 'Planlegge feiring', 'Lage flagg', 'Øve på nasjonalsangen']
      },
      {
        task: 'Vårrens',
        timing: 'march_april',
        culturalImportance: 'traditional',
        description: 'Tradisjonell norsk vårrens og hage forberedelser',
        subtasks: ['Rydde hagen', 'Planlegg plantinger', 'Vaske vinduer', 'Lufta ut huset']
      },
      {
        task: 'Påskeforberedelser',
        timing: 'march_april',
        culturalImportance: 'cultural',
        description: 'Forberede familiens påskeferie og tradisjon',
        subtasks: ['Planlegg påsketur', 'Påskeegg', 'Familiereiser', 'Påskekrim']
      }
    ],
    culturalEvents: ['Påske', '17. mai', 'Arbeidernes dag', 'Kristi himmelfartsdag'],
    weatherConsiderations: ['Varmere vær', 'Lengre dager', 'Vårregn', 'Smelting']
  },
  
  sommer: {
    months: [6, 7, 8],
    keyTasks: [
      {
        task: 'Sommerferie planlegging',
        timing: 'may_june',
        culturalImportance: 'essential',
        description: 'Planlegge den viktige norske sommerferien',
        subtasks: ['Booking hytter', 'Ferieruter', 'Aktiviteter', 'Familie samvær']
      },
      {
        task: 'Utendørs friluftsliv',
        timing: 'june_august',
        culturalImportance: 'friluftsliv',
        description: 'Maksimere nytten av norsk sommer og natur',
        subtasks: ['Fottur', 'Bading', 'Camping', 'Bærplukking', 'Fiske']
      },
      {
        task: 'Hyttekultur',
        timing: 'june_august',
        culturalImportance: 'cultural',
        description: 'Leve norsk hyttetradisjon og enkel livsstil',
        subtasks: ['Hyttevedlikehold', 'Enkelt kosthold', 'Naturaktiviteter', 'Digital detox']
      }
    ],
    culturalEvents: ['Sommerferie', 'Sankthans', 'Midnattsol', 'Festivals'],
    weatherConsiderations: ['Lyse netter', 'Varmt vær', 'Tørkeperioder', 'Regn']
  }
};

// Norwegian cultural value system for AI decision making
const NORWEGIAN_CULTURAL_VALUES = {
  lagom: {
    weight: 0.9,
    description: 'Balanced approach - not too much, not too little',
    applications: ['task_distribution', 'activity_planning', 'resource_usage']
  },
  
  friluftsliv: {
    weight: 0.95,
    description: 'Outdoor life and connection with nature',
    applications: ['activity_suggestions', 'weather_responses', 'family_time']
  },
  
  dugnad: {
    weight: 0.8,
    description: 'Community cooperation and collective work',
    applications: ['family_tasks', 'community_involvement', 'teaching_values']
  },
  
  trygghet: {
    weight: 0.9,
    description: 'Safety and security in all aspects of life',
    applications: ['task_planning', 'child_activities', 'decision_making']
  },
  
  likestilling: {
    weight: 0.85,
    description: 'Equality and fair distribution of responsibilities',
    applications: ['task_assignment', 'decision_making', 'family_roles']
  }
};

// Weather-influenced activity suggestions
const WEATHER_ACTIVITIES: Record<string, WeatherInfluencedActivity[]> = {
  sunny: [
    {
      activityType: 'hiking',
      description: 'Familieturmed fjelltur eller skogstur',
      suitableWeather: ['sunny', 'partly_cloudy'],
      equipment: ['ryggsekk', 'matpakke', 'drikkevann', 'solbriller'],
      duration: 180,
      ageGroups: [[3, 18]],
      norwegianTradition: true,
      friluftsliv: true
    },
    {
      activityType: 'outdoor_play',
      description: 'Utendørs lek i hagen eller parken',
      suitableWeather: ['sunny', 'partly_cloudy'],
      equipment: ['solkrem', 'leker', 'ball'],
      duration: 120,
      ageGroups: [[2, 12]],
      norwegianTradition: false,
      friluftsliv: true
    }
  ],
  
  rainy: [
    {
      activityType: 'indoor_cozy',
      description: 'Innendørs kos med baking eller håndverk',
      suitableWeather: ['rainy', 'cloudy'],
      equipment: ['bakeutstyr', 'håndverksmaterialer', 'bøker'],
      duration: 90,
      ageGroups: [[4, 18]],
      norwegianTradition: true,
      friluftsliv: false
    },
    {
      activityType: 'rain_walk',
      description: 'Regnturs for de som liker været',
      suitableWeather: ['light_rain'],
      equipment: ['regntøy', 'støvler', 'varme klær'],
      duration: 60,
      ageGroups: [[5, 18]],
      norwegianTradition: true,
      friluftsliv: true
    }
  ],
  
  snowy: [
    {
      activityType: 'winter_sports',
      description: 'Skiturer, aking eller andre vinteraktiviteter',
      suitableWeather: ['snowy', 'cold'],
      equipment: ['ski', 'akebrett', 'vinterklær', 'vintersko'],
      duration: 150,
      ageGroups: [[4, 18]],
      norwegianTradition: true,
      friluftsliv: true
    },
    {
      activityType: 'snow_play',
      description: 'Bygge snømann eller snøborg sammen',
      suitableWeather: ['snowy'],
      equipment: ['votter', 'vinterklær', 'spade'],
      duration: 90,
      ageGroups: [[3, 15]],
      norwegianTradition: true,
      friluftsliv: true
    }
  ]
};

// Main AI processing function
export const generateNorwegianFamilyInsights = onCall(
  { 
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 300
  },
  async (request: CallableRequest<{
    familyData: NorwegianFamilyData;
    weatherData?: any;
    schoolData?: any;
    requestType: 'daily' | 'weekly' | 'seasonal' | 'event_based';
  }>) => {
    try {
      logger.info('Processing Norwegian family insights', { 
        householdId: request.data.familyData.householdId,
        requestType: request.data.requestType
      });

      const { familyData, weatherData, schoolData, requestType } = request.data;
      
      // Validate authentication
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const insights: NorwegianAIInsight[] = [];
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentSeason = getCurrentNorwegianSeason(currentMonth);

      // Generate seasonal insights
      if (requestType === 'seasonal' || requestType === 'daily') {
        const seasonalInsights = generateSeasonalIntelligence(
          familyData,
          currentSeason,
          currentDate
        );
        insights.push(...seasonalInsights);
      }

      // Generate weather-influenced insights
      if (weatherData && familyData.familyPreferences.friluftsliv) {
        const weatherInsights = generateWeatherBasedInsights(
          familyData,
          weatherData,
          currentSeason
        );
        insights.push(...weatherInsights);
      }

      // Generate school-schedule aware insights
      if (schoolData) {
        const schoolInsights = generateSchoolAwareInsights(
          familyData,
          schoolData,
          currentDate
        );
        insights.push(...schoolInsights);
      }

      // Generate family pattern optimization
      if (requestType === 'weekly' || requestType === 'daily') {
        const optimizationInsights = generateFamilyOptimizationInsights(
          familyData,
          currentDate
        );
        insights.push(...optimizationInsights);
      }

      // Generate dugnad and community insights
      if (requestType !== 'daily') {
        const communityInsights = generateCommunityInsights(
          familyData,
          currentSeason
        );
        insights.push(...communityInsights);
      }

      // Sort by priority and cultural relevance
      const sortedInsights = insights
        .sort((a, b) => {
          const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
        })
        .slice(0, 10); // Limit to top 10 insights

      // Log successful processing
      logger.info('Norwegian family insights generated successfully', {
        householdId: familyData.householdId,
        insightCount: sortedInsights.length,
        requestType
      });

      return {
        success: true,
        insights: sortedInsights,
        metadata: {
          generatedAt: new Date().toISOString(),
          season: currentSeason,
          culturalAlignment: familyData.familyPreferences.culturalAlignment,
          processingTime: Date.now() - currentDate.getTime()
        }
      };

    } catch (error) {
      logger.error('Failed to generate Norwegian family insights', error);
      throw new HttpsError('internal', 'Failed to generate insights');
    }
  }
);

// Seasonal intelligence generator
function generateSeasonalIntelligence(
  familyData: NorwegianFamilyData,
  season: keyof typeof NORWEGIAN_SEASONAL_INTELLIGENCE,
  currentDate: Date
): NorwegianAIInsight[] {
  const insights: NorwegianAIInsight[] = [];
  const seasonData = NORWEGIAN_SEASONAL_INTELLIGENCE[season];
  
  // Generate insights for key seasonal tasks
  for (const task of seasonData.keyTasks) {
    const isRelevantTiming = isTaskTimingRelevant(task.timing, currentDate);
    
    if (isRelevantTiming) {
      insights.push({
        type: 'seasonal_prep',
        priority: task.culturalImportance === 'essential' ? 'high' : 'medium',
        title: `${task.task} - ${season}forberedelser`,
        description: task.description,
        reasoning: `Basert på norske ${season}tradisjoner og familiens preferanser`,
        culturalContext: `${task.culturalImportance} oppgave i norsk ${season}kultur`,
        suggestions: task.subtasks.map(subtask => ({
          action: subtask,
          difficulty: 'medium' as const,
          timeEstimate: 45,
          familyInvolvement: task.culturalImportance === 'traditional' ? 'all' as const : 'adults' as const,
          timing: 'this_week' as const
        })),
        confidence: 0.85,
        norwegianValues: ['friluftsliv', 'family_time', 'tradition']
      });
    }
  }

  return insights;
}

// Weather-based activity insights
function generateWeatherBasedInsights(
  familyData: NorwegianFamilyData,
  weatherData: any,
  season: string
): NorwegianAIInsight[] {
  const insights: NorwegianAIInsight[] = [];
  const currentWeather = weatherData.current?.condition?.toLowerCase() || 'unknown';
  
  let weatherCategory = 'sunny';
  if (currentWeather.includes('rain')) weatherCategory = 'rainy';
  else if (currentWeather.includes('snow')) weatherCategory = 'snowy';
  
  const suitableActivities = WEATHER_ACTIVITIES[weatherCategory] || [];
  
  for (const activity of suitableActivities) {
    // Check if activity is suitable for children's ages
    const suitableForChildren = familyData.children.some(child => 
      activity.ageGroups.some(([minAge, maxAge]) => 
        child.age >= minAge && child.age <= maxAge
      )
    );
    
    if (suitableForChildren) {
      insights.push({
        type: 'friluftsliv',
        priority: activity.friluftsliv ? 'high' : 'medium',
        title: `Værbasert aktivitet: ${activity.activityType}`,
        description: activity.description,
        reasoning: `Tilpasset dagens vær (${currentWeather}) og norsk friluftsliv`,
        culturalContext: activity.norwegianTradition ? 
          'Tradisjonell norsk aktivitet for hele familien' : 
          'Utendørsaktivitet som passer norsk livsstil',
        suggestions: [{
          action: activity.description,
          difficulty: 'easy',
          timeEstimate: activity.duration,
          familyInvolvement: 'all',
          timing: 'immediate'
        }],
        confidence: 0.8,
        norwegianValues: activity.friluftsliv ? ['friluftsliv', 'family_time'] : ['family_time']
      });
    }
  }
  
  return insights;
}

// School-aware insights generator
function generateSchoolAwareInsights(
  familyData: NorwegianFamilyData,
  schoolData: any,
  currentDate: Date
): NorwegianAIInsight[] {
  const insights: NorwegianAIInsight[] = [];
  
  // Analyze upcoming school events and suggest family coordination
  if (schoolData.events && schoolData.events.length > 0) {
    const upcomingEvents = schoolData.events.filter((event: any) => {
      const eventDate = new Date(event.start_time);
      const daysDiff = Math.ceil((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 7; // Next 7 days
    });

    if (upcomingEvents.length > 0) {
      insights.push({
        type: 'family_optimization',
        priority: 'medium',
        title: 'Skoleplan-optimalisering',
        description: `${upcomingEvents.length} skoleaktivitet${upcomingEvents.length > 1 ? 'er' : ''} kommende uke`,
        reasoning: 'Basert på skolens timeplan og familiens rutiner',
        culturalContext: 'Norske familier prioriterer god koordinering mellom skole og familie',
        suggestions: [
          {
            action: 'Gjennomgå kommende skoleaktiviteter med barna',
            difficulty: 'easy',
            timeEstimate: 15,
            familyInvolvement: 'all',
            timing: 'this_week'
          },
          {
            action: 'Tilpass familiets rutiner til skoleplanen',
            difficulty: 'medium',
            timeEstimate: 30,
            familyInvolvement: 'adults',
            timing: 'immediate'
          }
        ],
        confidence: 0.75,
        norwegianValues: ['organization', 'family_support']
      });
    }
  }

  return insights;
}

// Family optimization insights
function generateFamilyOptimizationInsights(
  familyData: NorwegianFamilyData,
  currentDate: Date
): NorwegianAIInsight[] {
  const insights: NorwegianAIInsight[] = [];
  
  // Analyze task completion patterns
  const recentTasks = familyData.taskHistory.filter(task => {
    const taskDate = new Date(task.completedAt);
    const daysDiff = Math.ceil((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 14; // Last 2 weeks
  });

  if (recentTasks.length > 0) {
    // Calculate completion efficiency
    const avgTimeSpent = recentTasks
      .filter(t => t.timeSpent)
      .reduce((sum, t) => sum + (t.timeSpent || 0), 0) / recentTasks.length;

    // Analyze task distribution among family members
    const tasksByPerson = recentTasks.reduce((acc, task) => {
      acc[task.completedBy] = (acc[task.completedBy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const isImbalanced = Object.values(tasksByPerson).some(count => 
      count > (recentTasks.length / Object.keys(tasksByPerson).length) * 1.5
    );

    if (isImbalanced) {
      insights.push({
        type: 'family_optimization',
        priority: 'medium',
        title: 'Oppgavefordeling kan forbedres',
        description: 'AI har oppdaget ubalanse i hvordan oppgaver fordeles i familien',
        reasoning: 'Basert på oppgavehistorikk og norske verdier om likestilling',
        culturalContext: 'Norske familier verdsetter rettferdig fordeling av husholdningsoppgaver',
        suggestions: [
          {
            action: 'Diskuter oppgavefordeling på familiemøte',
            difficulty: 'easy',
            timeEstimate: 30,
            familyInvolvement: 'all',
            timing: 'this_week'
          },
          {
            action: 'Omfordel noen oppgaver for bedre balanse',
            difficulty: 'medium',
            timeEstimate: 15,
            familyInvolvement: 'adults',
            timing: 'immediate'
          }
        ],
        confidence: 0.7,
        norwegianValues: ['likestilling', 'dugnad', 'fairness']
      });
    }
  }

  return insights;
}

// Community and dugnad insights
function generateCommunityInsights(
  familyData: NorwegianFamilyData,
  season: string
): NorwegianAIInsight[] {
  const insights: NorwegianAIInsight[] = [];
  
  // Seasonal dugnad suggestions
  const seasonalDugnadActivities = {
    vår: ['Fellesrydding i nabolaget', 'Hagerens fellesarbeid', 'Lekeområde vedlikehold'],
    sommer: ['Fellesgrilling', 'Ferieavløsning for naboer', 'Fellesaktiviteter for barn'],
    høst: ['Løvraking fellesområder', 'Vinterforberedelser sammen', 'Deling av høstprodukter'],
    vinter: ['Snørydding fellesområder', 'Deling av vintervarer', 'Fellesaktiviteter innendørs']
  };

  const activities = seasonalDugnadActivities[season as keyof typeof seasonalDugnadActivities] || [];
  
  if (activities.length > 0) {
    insights.push({
      type: 'dugnad_planning',
      priority: 'low',
      title: `${season.charAt(0).toUpperCase() + season.slice(1)}-dugnad muligheter`,
      description: 'Forslag til fellesaktiviteter som styrker naboskapet',
      reasoning: 'Basert på norsk dugnadstradisjon og sesongmessige behov',
      culturalContext: 'Dugnad er en viktig del av norsk samfunnskultur og bygger fellesskap',
      suggestions: activities.map(activity => ({
        action: activity,
        difficulty: 'medium',
        timeEstimate: 120,
        familyInvolvement: 'all',
        timing: 'this_month'
      })),
      confidence: 0.6,
      norwegianValues: ['dugnad', 'community', 'cooperation']
    });
  }

  return insights;
}

// Helper functions
function getCurrentNorwegianSeason(month: number): keyof typeof NORWEGIAN_SEASONAL_INTELLIGENCE {
  if (month >= 9 && month <= 11) return 'høst';
  if (month >= 12 || month <= 2) return 'vinter';
  if (month >= 3 && month <= 5) return 'vår';
  return 'sommer';
}

function isTaskTimingRelevant(timing: string, currentDate: Date): boolean {
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  
  // Simple timing logic - can be enhanced with more sophisticated rules
  switch (timing) {
    case 'early_october':
      return month === 10 && day <= 15;
    case 'september_october':
      return month === 9 || month === 10;
    case 'throughout_season':
      return true;
    case 'january_february':
      return month === 1 || month === 2;
    case 'december_january':
      return month === 12 || month === 1;
    case 'december_february':
      return month >= 12 || month <= 2;
    case 'april_early_may':
      return month === 4 || (month === 5 && day <= 15);
    case 'march_april':
      return month === 3 || month === 4;
    case 'may_june':
      return month === 5 || month === 6;
    case 'june_august':
      return month >= 6 && month <= 8;
    default:
      return false;
  }
}

// Export additional utility functions for frontend integration
export const norwegianAIUtilities = onCall(
  { region: 'europe-west1' },
  async (request: CallableRequest<{
    action: 'validate_cultural_alignment' | 'get_seasonal_tasks' | 'calculate_family_score';
    data: any;
  }>) => {
    const { action, data } = request.data;
    
    switch (action) {
      case 'validate_cultural_alignment':
        return validateNorwegianCulturalAlignment(data);
      case 'get_seasonal_tasks':
        return getSeasonalTaskSuggestions(data.season, data.location);
      case 'calculate_family_score':
        return calculateNorwegianFamilyScore(data);
      default:
        throw new HttpsError('invalid-argument', 'Unknown action');
    }
  }
);

function validateNorwegianCulturalAlignment(data: any): any {
  // Validate how well family practices align with Norwegian cultural values
  let score = 0;
  let feedback: string[] = [];
  
  if (data.friluftsliv_activities > 2) {
    score += 20;
    feedback.push('Excellent friluftsliv engagement');
  }
  
  if (data.task_distribution_fairness > 0.7) {
    score += 15;
    feedback.push('Good task distribution following likestilling values');
  }
  
  if (data.seasonal_preparation_rate > 0.8) {
    score += 15;
    feedback.push('Well prepared for seasonal changes');
  }
  
  return { score, feedback, culturalAlignment: score / 50 };
}

function getSeasonalTaskSuggestions(season: string, location: any): any {
  const seasonData = NORWEGIAN_SEASONAL_INTELLIGENCE[season as keyof typeof NORWEGIAN_SEASONAL_INTELLIGENCE];
  if (!seasonData) return { tasks: [] };
  
  return {
    season,
    tasks: seasonData.keyTasks,
    culturalEvents: seasonData.culturalEvents,
    weatherConsiderations: seasonData.weatherConsiderations
  };
}

function calculateNorwegianFamilyScore(familyData: any): any {
  // Calculate comprehensive Norwegian family lifestyle score
  let totalScore = 0;
  let maxScore = 0;
  let breakdown: Record<string, number> = {};
  
  // Friluftsliv score (0-25 points)
  const friluftsliv_score = Math.min(25, familyData.outdoor_activities_per_week * 5);
  breakdown.friluftsliv = friluftsliv_score;
  totalScore += friluftsliv_score;
  maxScore += 25;
  
  // Cultural participation (0-20 points)
  const cultural_score = Math.min(20, familyData.norwegian_holidays_observed * 4);
  breakdown.cultural_participation = cultural_score;
  totalScore += cultural_score;
  maxScore += 20;
  
  // Family cooperation (0-20 points)
  const cooperation_score = Math.min(20, familyData.task_completion_rate * 20);
  breakdown.family_cooperation = cooperation_score;
  totalScore += cooperation_score;
  maxScore += 20;
  
  // Language usage (0-15 points)
  const language_score = familyData.norwegian_language_usage * 15;
  breakdown.language_usage = language_score;
  totalScore += language_score;
  maxScore += 15;
  
  // Community involvement (0-20 points)
  const community_score = Math.min(20, familyData.community_activities * 10);
  breakdown.community_involvement = community_score;
  totalScore += community_score;
  maxScore += 20;
  
  return {
    totalScore: Math.round(totalScore),
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    breakdown,
    recommendations: generateScoreRecommendations(breakdown, maxScore)
  };
}

function generateScoreRecommendations(breakdown: Record<string, number>, maxScore: number): string[] {
  const recommendations: string[] = [];
  
  if (breakdown.friluftsliv < 15) {
    recommendations.push('Øk utendørsaktiviteter for bedre friluftsliv-score');
  }
  
  if (breakdown.cultural_participation < 12) {
    recommendations.push('Deltar i flere norske kulturelle tradisjoner og høytider');
  }
  
  if (breakdown.family_cooperation < 15) {
    recommendations.push('Forbedre familiesamarbeid og oppgavefordeling');
  }
  
  if (breakdown.community_involvement < 10) {
    recommendations.push('Engasjer dere mer i lokalsamfunnet og naboskap');
  }
  
  return recommendations;
}