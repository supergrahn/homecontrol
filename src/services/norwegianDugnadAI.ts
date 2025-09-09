// Norwegian Dugnad Coordination AI Service
// Facilitates community cooperation and collective work organization following Norwegian dugnad traditions

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Child } from "./children";
import { Task } from "../models/task";

export type DugnadType = 
  | 'spring_cleaning' | 'fall_preparation' | 'snow_clearing'
  | 'garden_maintenance' | 'playground_upkeep' | 'building_maintenance'
  | 'community_event' | 'holiday_preparation' | 'neighborhood_improvement';

export type DugnadParticipant = {
  householdId: string;
  familyName: string;
  adults: number;
  children: number;
  specialSkills: string[];
  availabilityHours: string[];
  contactInfo: {
    phone?: string;
    email?: string;
  };
  preferredTasks: DugnadType[];
};

export type DugnadEvent = {
  id: string;
  title: string;
  description: string;
  type: DugnadType;
  organizer: {
    name: string;
    contact: string;
  };
  location: {
    address: string;
    description: string;
    coordinates?: { lat: number; lng: number };
  };
  schedule: {
    startDate: string;
    endDate: string;
    timeSlots: {
      start: string; // HH:MM
      end: string;
      maxParticipants?: number;
      requiredSkills?: string[];
    }[];
  };
  tasks: DugnadTask[];
  participants: DugnadParticipant[];
  supplies: {
    item: string;
    needed: number;
    provided: number;
    unit: string;
    provider?: string;
  }[];
  norwegianValues: string[];
  culturalSignificance: string;
  expectedOutcome: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  created: string;
  lastModified: string;
};

export type DugnadTask = {
  id: string;
  title: string;
  description: string;
  category: 'physical' | 'organizational' | 'technical' | 'creative' | 'cooking';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // minutes
  requiredSkills: string[];
  optimalPeople: number;
  childFriendly: boolean;
  equipment: string[];
  safetyConsiderations: string[];
  assignedTo?: string[];
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
};

export type DugnadRecommendation = {
  type: DugnadType;
  title: string;
  reasoning: string;
  seasonalRelevance: string;
  communityBenefit: string;
  familyInvolvement: string;
  suggestedTasks: DugnadTask[];
  estimatedParticipants: number;
  culturalContext: string;
  organizationTips: string[];
  confidence: number;
};

// Seasonal dugnad activities reflecting Norwegian community traditions
const NORWEGIAN_DUGNAD_CALENDAR = {
  vinter: [
    {
      type: 'snow_clearing' as DugnadType,
      title: 'Fellessnørydding',
      description: 'Rydde snø fra fellsarealer og hjelpe eldre naboer',
      timing: 'after_snowfall',
      culturalImportance: 'essential',
      norwegianValues: ['neighbor_help', 'community_care', 'winter_preparedness']
    },
    {
      type: 'holiday_preparation' as DugnadType,
      title: 'Juleforberedelser dugnad',
      description: 'Fellesdekorering og juleforberedelser i nabolaget',
      timing: 'december',
      culturalImportance: 'traditional',
      norwegianValues: ['celebration', 'tradition', 'community_spirit']
    }
  ],
  
  vår: [
    {
      type: 'spring_cleaning' as DugnadType,
      title: 'Vårrengjøring dugnad',
      description: 'Tradisjonell norsk vårrengjøring av fellesområder',
      timing: 'april_may',
      culturalImportance: 'essential',
      norwegianValues: ['renewal', 'community_pride', 'environmental_care']
    },
    {
      type: 'garden_maintenance' as DugnadType,
      title: 'Hagedelta dugnad',
      description: 'Planting, såing og hagearbeid i fellesskap',
      timing: 'may_june',
      culturalImportance: 'traditional',
      norwegianValues: ['nature_connection', 'growth', 'sustainability']
    }
  ],
  
  sommer: [
    {
      type: 'playground_upkeep' as DugnadType,
      title: 'Lekeplass vedlikehold',
      description: 'Oppgradering og vedlikehold av barnas lekeplasser',
      timing: 'june_july',
      culturalImportance: 'important',
      norwegianValues: ['child_welfare', 'community_investment', 'safety']
    },
    {
      type: 'community_event' as DugnadType,
      title: 'Sommerfest organisering',
      description: 'Planlegging og gjennomføring av nabolagets sommerfest',
      timing: 'july_august',
      culturalImportance: 'social',
      norwegianValues: ['celebration', 'togetherness', 'joy']
    }
  ],
  
  høst: [
    {
      type: 'fall_preparation' as DugnadType,
      title: 'Høstforberedelser',
      description: 'Forberede nabolaget til vinter - løvraking og generell rydding',
      timing: 'september_october',
      culturalImportance: 'essential',
      norwegianValues: ['preparation', 'responsibility', 'foresight']
    },
    {
      type: 'building_maintenance' as DugnadType,
      title: 'Bygningsvedlikehold',
      description: 'Mindre reparasjoner og vedlikehold før vinteren',
      timing: 'october',
      culturalImportance: 'practical',
      norwegianValues: ['maintenance', 'cooperation', 'skill_sharing']
    }
  ]
};

// Norwegian community cooperation principles
const DUGNAD_PRINCIPLES = {
  equality: {
    description: 'Alle bidrar etter evne, ingen er for god til noe arbeid',
    implementation: 'Roter oppgaver, alle gjør både enkle og komplekse arbeider'
  },
  voluntary: {
    description: 'Deltagelse er frivillig, men sosialt forventet',
    implementation: 'Venlig invitasjon uten press, respekter folks begrensninger'
  },
  collective_benefit: {
    description: 'Arbeidet gagner hele fellesskapet',
    implementation: 'Tydelig kommuniker hvordan dugnaden hjelper alle'
  },
  social_bonding: {
    description: 'Dugnaden styrker sosiale bånd og fellesskapsfølelse',
    implementation: 'Kombiner arbeid med sosialisering og mat'
  },
  skill_sharing: {
    description: 'Folk lærer av hverandre og deler kunnskap',
    implementation: 'Par erfarne med uerfarne, lær bort ferdigheter'
  }
};

export class NorwegianDugnadCoordinationService {
  private dugnadCacheKey = 'norwegian_dugnad_cache';
  private participantKey = 'norwegian_dugnad_participant';

  // Generate dugnad recommendations based on season and community needs
  async generateDugnadRecommendations(
    location: { kommune: string; fylke: string },
    season?: string,
    communitySize: number = 50
  ): Promise<DugnadRecommendation[]> {
    const recommendations: DugnadRecommendation[] = [];
    
    try {
      const currentSeason = season || this.getCurrentNorwegianSeason();
      const seasonalDugnads = NORWEGIAN_DUGNAD_CALENDAR[currentSeason as keyof typeof NORWEGIAN_DUGNAD_CALENDAR];
      
      for (const dugnadTemplate of seasonalDugnads) {
        const recommendation = await this.createDugnadRecommendation(
          dugnadTemplate,
          currentSeason,
          location,
          communitySize
        );
        recommendations.push(recommendation);
      }
      
      return recommendations.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Failed to generate dugnad recommendations:', error);
      return [];
    }
  }

  // Create specific dugnad recommendation
  private async createDugnadRecommendation(
    template: any,
    season: string,
    location: any,
    communitySize: number
  ): Promise<DugnadRecommendation> {
    const tasks = this.generateDugnadTasks(template.type, season);
    const estimatedParticipants = Math.ceil(communitySize * 0.3); // Assume 30% participation

    return {
      type: template.type,
      title: template.title,
      reasoning: `${template.description} er viktig for nabomiljøet, spesielt i ${season}`,
      seasonalRelevance: this.getSeasonalRelevance(template.type, season),
      communityBenefit: this.getCommunityBenefit(template.type),
      familyInvolvement: this.getFamilyInvolvementDescription(template.type),
      suggestedTasks: tasks,
      estimatedParticipants,
      culturalContext: this.getDugnadCulturalContext(template.type),
      organizationTips: this.getOrganizationTips(template.type),
      confidence: this.calculateRecommendationConfidence(template, season)
    };
  }

  // Generate specific tasks for dugnad type
  private generateDugnadTasks(type: DugnadType, season: string): DugnadTask[] {
    const taskTemplates: Record<DugnadType, DugnadTask[]> = {
      spring_cleaning: [
        {
          id: 'spring_sweep',
          title: 'Feie gårdsplass og gangveier',
          description: 'Grundig rydding etter vinteren',
          category: 'physical',
          difficulty: 'easy',
          duration: 60,
          requiredSkills: [],
          optimalPeople: 3,
          childFriendly: true,
          equipment: ['feiekost', 'ryddesekk', 'spade'],
          safetyConsiderations: ['Pass på rygg ved løfting'],
          status: 'open',
          priority: 'high'
        },
        {
          id: 'plant_flowers',
          title: 'Plante blomster i felleshage',
          description: 'Gjøre nabolaget vakkert til sommeren',
          category: 'creative',
          difficulty: 'medium',
          duration: 90,
          requiredSkills: ['hagearbeid'],
          optimalPeople: 4,
          childFriendly: true,
          equipment: ['spader', 'hagevann', 'blomster', 'jord'],
          safetyConsiderations: ['Bruk hansker', 'Pass på allergier'],
          status: 'open',
          priority: 'medium'
        }
      ],
      
      snow_clearing: [
        {
          id: 'clear_walkways',
          title: 'Måke gangveier og innkjørsler',
          description: 'Trygg ferdsel for alle i nabolaget',
          category: 'physical',
          difficulty: 'medium',
          duration: 45,
          requiredSkills: [],
          optimalPeople: 2,
          childFriendly: false,
          equipment: ['snømåker', 'salt/sand', 'varme klær'],
          safetyConsiderations: ['Unngå overanstrengelse', 'Ta pauser', 'Riktig løfteteknikk'],
          status: 'open',
          priority: 'high'
        }
      ],
      
      playground_upkeep: [
        {
          id: 'inspect_equipment',
          title: 'Inspisere lekeutstyr',
          description: 'Sjekke sikkerhet på alle lekeapparater',
          category: 'technical',
          difficulty: 'medium',
          duration: 60,
          requiredSkills: ['teknisk_forståelse'],
          optimalPeople: 2,
          childFriendly: false,
          equipment: ['verktøykasse', 'sjekkliste', 'målebånd'],
          safetyConsiderations: ['Følg sikkerhetskrav for lekeplassutstyr'],
          status: 'open',
          priority: 'high'
        },
        {
          id: 'paint_benches',
          title: 'Male benker og gjerder',
          description: 'Vedlikeholde og forskjønne lekeområdet',
          category: 'physical',
          difficulty: 'easy',
          duration: 120,
          requiredSkills: [],
          optimalPeople: 3,
          childFriendly: true,
          equipment: ['maling', 'pensler', 'presenning', 'tynner'],
          safetyConsiderations: ['Bruk hansker', 'Unngå innånding av maling'],
          status: 'open',
          priority: 'medium'
        }
      ],
      
      community_event: [
        {
          id: 'setup_stage',
          title: 'Rigge scene og PA-anlegg',
          description: 'Teknisk oppsett for nabolagsfest',
          category: 'technical',
          difficulty: 'hard',
          duration: 180,
          requiredSkills: ['elektro', 'lyd_teknikk'],
          optimalPeople: 4,
          childFriendly: false,
          equipment: ['lydanlegg', 'kabler', 'scene', 'verktøy'],
          safetyConsiderations: ['Elektrisk sikkerhet', 'Tung løfting'],
          status: 'open',
          priority: 'high'
        }
      ],
      
      // Default tasks for other types
      fall_preparation: [],
      garden_maintenance: [],
      building_maintenance: [],
      holiday_preparation: [],
      neighborhood_improvement: []
    };

    return taskTemplates[type] || [];
  }

  // Calculate recommendation confidence based on season and relevance
  private calculateRecommendationConfidence(template: any, season: string): number {
    let confidence = 0.5;

    // Season timing boost
    if (this.isSeasonallyRelevant(template.timing, season)) {
      confidence += 0.3;
    }

    // Cultural importance boost
    switch (template.culturalImportance) {
      case 'essential':
        confidence += 0.2;
        break;
      case 'important':
        confidence += 0.15;
        break;
      case 'traditional':
        confidence += 0.1;
        break;
    }

    return Math.min(1.0, confidence);
  }

  // Check if timing matches current season
  private isSeasonallyRelevant(timing: string, season: string): boolean {
    const seasonMonths = {
      vinter: ['december', 'january', 'february'],
      vår: ['march', 'april', 'may'],
      sommer: ['june', 'july', 'august'], 
      høst: ['september', 'october', 'november']
    };

    const currentMonth = new Date().getMonth();
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const currentMonthName = monthNames[currentMonth];

    return timing.includes(currentMonthName) || 
           timing === season ||
           (timing === 'after_snowfall' && season === 'vinter');
  }

  // Get seasonal relevance explanation
  private getSeasonalRelevance(type: DugnadType, season: string): string {
    const relevanceMap: Record<DugnadType, Record<string, string>> = {
      spring_cleaning: {
        vår: 'Perfekt tid for vårrengjøring etter lang vinter',
        sommer: 'Forberedelse til sommerens utendørsaktiviteter',
        høst: 'Rydding før vinteren setter inn',
        vinter: 'Vintervedlikehold av innendørsområder'
      },
      snow_clearing: {
        vinter: 'Kritisk for trygg ferdsel i vintermåneder',
        vår: 'Fjerne siste snørester og forberede til vår',
        sommer: 'Ikke relevant i sommermåneder',
        høst: 'Forberede utstyr før vinteren'
      },
      // Add more mappings as needed
    } as any;

    return relevanceMap[type]?.[season] || 'Relevant for fellesskapets trivsel';
  }

  // Get community benefit description
  private getCommunityBenefit(type: DugnadType): string {
    const benefits: Record<DugnadType, string> = {
      spring_cleaning: 'Renere og mer innbydende nabolag for alle',
      snow_clearing: 'Trygg ferdsel for eldre, barn og funksjonshemmede',
      playground_upkeep: 'Trygg og hyggelig lekeplass for alle barn',
      community_event: 'Styrker naboskapet og skaper gode minner',
      fall_preparation: 'Godt forberedt nabolag til vintersesongen',
      garden_maintenance: 'Vakkert grøntområde som alle kan nyte',
      building_maintenance: 'Tryggere og bedre vedlikeholdte fellesarealer',
      holiday_preparation: 'Felles glede og tradisjonell feststemning',
      neighborhood_improvement: 'Økt trivsel og eiendomsverdier for alle'
    };

    return benefits[type] || 'Styrker fellesskapsfølelsen i nabolaget';
  }

  // Get family involvement description
  private getFamilyInvolvementDescription(type: DugnadType): string {
    const familyDescriptions: Record<DugnadType, string> = {
      spring_cleaning: 'Perfekt for hele familien - barn kan hjelpe med enklere oppgaver',
      snow_clearing: 'Primært voksne, men ungdom kan delta under veiledning',
      playground_upkeep: 'Barn kan delta med maling og enklere oppgaver',
      community_event: 'Alle aldre kan bidra med sine unike talenter',
      fall_preparation: 'Familien kan rydde sammen og lære barna om forberedelser',
      garden_maintenance: 'Lærerik aktivitet der barn lærer om planter og natur',
      building_maintenance: 'Primært voksne med tekniske ferdigheter',
      holiday_preparation: 'Hyggelig aktivitet for hele familien med tradisjonsfokus',
      neighborhood_improvement: 'Avhenger av prosjektet, men ofte familievennlig'
    };

    return familyDescriptions[type] || 'Tilpasses familiens sammensetning og interesser';
  }

  // Get cultural context for dugnad type
  private getDugnadCulturalContext(type: DugnadType): string {
    return 'Dugnad er en dypt rotfestet norsk tradisjon som bygger fellesskap gjennom felles innsats. ' +
           'Det handler ikke bare om arbeidet som skal gjøres, men om å styrke naboskapet og skape tilhørighet. ' +
           'Alle bidrar etter evne, og resultatet tilhører fellesskapet.';
  }

  // Get organization tips
  private getOrganizationTips(type: DugnadType): string[] {
    const commonTips = [
      'Send invitasjon i god tid - minst 2 uker på forhånd',
      'Lag en tydelig plan med tidsram og oppgaver',
      'Sørg for kaffe, rundstykker eller enkel mat til deltakerne',
      'Ha utstyr og verktøy klart på forhånd',
      'Avslutt med takk og evaluering av resultatet',
      'Dokumenter med bilder for å vise fellesskapets innsats'
    ];

    const specificTips: Record<DugnadType, string[]> = {
      spring_cleaning: [
        'Koordiner med kommunen om henting av hageavfall',
        'Ha førstehjelp tilgjengelig'
      ],
      community_event: [
        'Søk nødvendige tillatelser i god tid',
        'Ha værplan for utendørsarrangementer'
      ]
    };

    return [...commonTips, ...(specificTips[type] || [])];
  }

  // Get current Norwegian season
  private getCurrentNorwegianSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 9 && month <= 11) return 'høst';
    if (month >= 12 || month <= 2) return 'vinter';
    if (month >= 3 && month <= 5) return 'vår';
    return 'sommer';
  }

  // Register family as potential dugnad participant
  async registerFamilyForDugnad(
    householdId: string,
    familyInfo: Partial<DugnadParticipant>
  ): Promise<void> {
    try {
      const participant: DugnadParticipant = {
        householdId,
        familyName: familyInfo.familyName || 'Familie',
        adults: familyInfo.adults || 2,
        children: familyInfo.children || 0,
        specialSkills: familyInfo.specialSkills || [],
        availabilityHours: familyInfo.availabilityHours || ['lørdag_10_16', 'søndag_10_16'],
        contactInfo: familyInfo.contactInfo || {},
        preferredTasks: familyInfo.preferredTasks || []
      };

      await AsyncStorage.setItem(
        `${this.participantKey}_${householdId}`,
        JSON.stringify(participant)
      );
    } catch (error) {
      console.error('Failed to register family for dugnad:', error);
    }
  }

  // Get family's dugnad participation info
  async getFamilyDugnadInfo(householdId: string): Promise<DugnadParticipant | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.participantKey}_${householdId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get family dugnad info:', error);
      return null;
    }
  }

  // Generate dugnad motivation message
  getDugnadMotivation(): string {
    const motivations = [
      'Sammen klarer vi alt! Dugnad styrker både nabolag og vennskap.',
      'En dag med dugnad gir måneder med stolthet over resultatet.',
      'I Norge hjelper vi hverandre - det er sånn vi har bygget samfunnet vårt.',
      'Barn som deltar i dugnad lærer verdien av fellesskap og hardt arbeid.',
      'Dugnad handler ikke bare om arbeid, men om å skape bånd som varer.',
      'Det finnes ikke noe som kan ikke løses med kaffe og en god dugnad!',
      'Når vi jobber sammen, blir store oppgaver til hyggelige stunder.',
      'Dugnad - hvor naboer blir venner og fellesskapet blir sterkere.'
    ];

    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  // Analyze dugnad impact on family and community
  async analyzeDugnadImpact(
    householdId: string,
    participationHistory: any[]
  ): Promise<{
    familyBenefits: string[];
    communityImpact: string[];
    childDevelopment: string[];
    socialConnections: string[];
    culturalLearning: string[];
  }> {
    return {
      familyBenefits: [
        'Styrket familiestolthet gjennom felles innsats',
        'Lært praktiske ferdigheter sammen',
        'Opplevd glede av å hjelpe andre'
      ],
      communityImpact: [
        'Bidratt til et vakrere og tryggere nabolag',
        'Skapt sterkere bånd mellom naboer',
        'Demonstrert norske fellesskapsverdier'
      ],
      childDevelopment: [
        'Lært viktigheten av samarbeid og fellesskap',
        'Utviklet praktiske ferdigheter og arbeidsglede',
        'Forstått betydningen av å ta ansvar for fellesskapet'
      ],
      socialConnections: [
        'Møtt og blitt kjent med naboer',
        'Bygget tillit og gjensidig respekt',
        'Skapt grunnlag for fremtidig samarbeid'
      ],
      culturalLearning: [
        'Opplevd ekte norsk dugnadstradisjon',
        'Forstått hvordan samfunnet bygges nedenfra',
        'Lært at alle bidrag er verdifulle'
      ]
    };
  }
}

// Export singleton instance
export const norwegianDugnadAI = new NorwegianDugnadCoordinationService();

// Utility functions for dugnad coordination
export function formatDugnadDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function getDugnadIcon(type: DugnadType): string {
  const icons: Record<DugnadType, string> = {
    spring_cleaning: '🧹',
    fall_preparation: '🍂',
    snow_clearing: '❄️',
    garden_maintenance: '🌱',
    playground_upkeep: '🏞️',
    building_maintenance: '🔧',
    community_event: '🎉',
    holiday_preparation: '🎄',
    neighborhood_improvement: '🏘️'
  };

  return icons[type] || '🤝';
}

export function estimateDugnadDuration(tasks: DugnadTask[]): number {
  return tasks.reduce((total, task) => total + task.duration, 0);
}

export function calculateRequiredParticipants(tasks: DugnadTask[]): number {
  return Math.max(...tasks.map(task => task.optimalPeople));
}