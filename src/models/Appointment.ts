/**
 * Norwegian Family Appointment System Models
 * Integrates with existing architecture while focusing on individual/family appointments
 * vs the Event model which handles community events
 */

export type AppointmentType = 
  | "school" // School-related appointments
  | "health" // Medical and health appointments  
  | "family" // Family activities and meetings
  | "activities" // Sports, hobbies, after-school activities
  | "cultural" // Norwegian cultural events and traditions
  | "personal"; // Personal appointments

export type AppointmentStatus = 
  | "active" // Scheduled and active
  | "completed" // Appointment finished
  | "cancelled" // Cancelled appointment
  | "rescheduled"; // Moved to different time

export interface AppointmentNotification {
  id: string;
  type: "days" | "hours" | "minutes";
  amount: number; // e.g., 2 days, 3 hours, 30 minutes before
  title: string;
  message: string;
  sent: boolean;
  sentAt?: Date;
  devicesSentTo?: string[]; // Device link IDs that received notification
  failedDeliveries?: string[]; // Device link IDs that failed to receive
}

export interface NorwegianCulturalAppointmentContext {
  // Seasonal context
  season?: "winter" | "spring" | "summer" | "autumn";
  seasonalRecommendations?: string[];
  
  // Cultural timing considerations
  timingWarnings?: {
    type: "DINNER_TIME" | "QUIET_HOURS" | "SCHOOL_HOURS" | "WEEKEND_FAMILY_TIME";
    message: string;
    suggestion?: string;
  }[];
  
  // Weather considerations (important in Norway)
  weatherDependent: boolean;
  weatherBackup?: {
    alternativeLocation?: string;
    alternativeActivity?: string;
    indoorAlternative?: string;
  };
  
  // Cultural traditions integration
  relatedTradition?: string; // "17_mai_preparation", "lucia_celebration", etc.
  traditionalElements?: string[]; // Cultural elements to include
  
  // Norwegian family values
  familyImpactLevel: "low" | "medium" | "high"; // How much it affects family schedule
  includesSiblings: boolean; // If siblings should be considered
  requiresParentCoordination: boolean; // If both parents need to coordinate
}

export interface Appointment {
  id: string;
  householdId: string;
  childId?: string; // Optional - can be family-wide appointment
  
  // Basic appointment info
  title: string;
  description?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  
  // Scheduling
  startTime: Date;
  endTime?: Date;
  allDay: boolean;
  timezone: string; // Default: "Europe/Oslo" for Norway
  
  // Location
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    isOnline?: boolean;
    meetingLink?: string;
    transportationNote?: string; // Norwegian: "Ta buss linje 5"
  };
  
  // Notifications with Norwegian cultural timing
  notifications: AppointmentNotification[];
  
  // Norwegian cultural context
  norwegianContext?: NorwegianCulturalAppointmentContext;
  
  // Participants
  participants: string[]; // User IDs who should know about this appointment
  organizerId: string; // Who created/manages this appointment
  
  // Coordination needs
  coordination?: {
    requiresTransport: boolean;
    carpoolingAvailable?: boolean;
    specialEquipment?: string[]; // "Skisko", "Badeklær", etc.
    contactPersons?: {
      name: string;
      phone?: string;
      role: string; // "Lærer", "Trener", "Lege", etc.
    }[];
  };
  
  // Recurrence (for regular appointments)
  recurrence?: {
    pattern: "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
    interval?: number;
    endDate?: Date;
    maxOccurrences?: number;
    exceptions?: Date[]; // Dates to skip
  };
  
  // Integration with device linking
  deviceNotifications?: {
    sendToLinkedDevices: boolean;
    notificationPreferences?: {
      [deviceLinkId: string]: {
        enabled: boolean;
        customMessage?: string;
      };
    };
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  
  // Connection to community events
  relatedEventId?: string; // If this appointment is related to a community event
  
  // Norwegian specific fields
  importantNote?: string; // "Husk fleece undertøy!" (Remember fleece underwear!)
  culturalSignificance?: string; // Why this is important in Norwegian culture
}

export interface AppointmentTemplate {
  id: string;
  name: string;
  type: AppointmentType;
  description: string;
  icon: string;
  
  // Template content
  template: Partial<Appointment>;
  
  // Norwegian cultural context for template
  norwegianGuidance: {
    culturalBackground: string;
    typicalTiming: string[];
    seasonalConsiderations: string[];
    parentingTips: string[];
    commonLocations: string[];
  };
  
  // Usage stats
  usageCount: number;
  isDefault: boolean; // Built-in templates vs user-created
}

// Norwegian Appointment Templates for common appointment types
export const NORWEGIAN_APPOINTMENT_TEMPLATES: Record<AppointmentType, AppointmentTemplate> = {
  school: {
    id: "template_school",
    name: "Skoleavtale",
    type: "school",
    description: "Skoleaktiviteter, foreldremøter, og skolerelaterte avtaler",
    icon: "🏫",
    template: {
      type: "school",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "days", amount: 1, title: "", message: "Skoleavtale i morgen", sent: false },
        { id: "", type: "hours", amount: 2, title: "", message: "Skoleavtale om 2 timer", sent: false }
      ],
      norwegianContext: {
        season: "autumn",
        weatherDependent: false,
        familyImpactLevel: "medium",
        includesSiblings: false,
        requiresParentCoordination: true
      }
    },
    norwegianGuidance: {
      culturalBackground: "Skole-hjem samarbeid er viktig i norsk utdanning",
      typicalTiming: ["19:00-20:30 hverdager", "10:00-12:00 lørdager"],
      seasonalConsiderations: ["Vinter: Sjekk veiforhold", "Høst: Mørkt tidlig"],
      parentingTips: ["Forbered spørsmål", "Ta notater", "Følg opp med barn"],
      commonLocations: ["Klasserom", "Skole bibliotek", "Aula"]
    },
    usageCount: 0,
    isDefault: true
  },
  
  health: {
    id: "template_health",
    name: "Helse avtale",
    type: "health", 
    description: "Legetimer, tannlege, og helsesjekker",
    icon: "🏥",
    template: {
      type: "health",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "days", amount: 2, title: "", message: "Helse avtale på torsdag", sent: false },
        { id: "", type: "hours", amount: 4, title: "", message: "Helse avtale om 4 timer", sent: false }
      ],
      norwegianContext: {
        weatherDependent: true,
        familyImpactLevel: "high",
        includesSiblings: false,
        requiresParentCoordination: true
      },
      coordination: {
        requiresTransport: true,
        specialEquipment: ["Helsekort", "ID"]
      }
    },
    norwegianGuidance: {
      culturalBackground: "Forebygging og regelmessige sjekker er viktig",
      typicalTiming: ["08:00-16:00 hverdager", "Noen lørdager"],
      seasonalConsiderations: ["Vinter: Ekstra tid for transport", "Sommer: Mindre sykdom"],
      parentingTips: ["Ha med helsekort", "Forbered barnet mentalt", "Notér spørsmål"],
      commonLocations: ["Fastlegekontor", "Tannlegekontor", "Sykehus"]
    },
    usageCount: 0,
    isDefault: true
  },
  
  family: {
    id: "template_family",
    name: "Familie aktivitet",
    type: "family",
    description: "Familietid, utflukter, og sammenkomster",
    icon: "👨‍👩‍👧‍👦",
    template: {
      type: "family",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "hours", amount: 24, title: "", message: "Familie aktivitet i morgen", sent: false },
        { id: "", type: "hours", amount: 2, title: "", message: "Familie aktivitet om 2 timer", sent: false }
      ],
      norwegianContext: {
        weatherDependent: true,
        familyImpactLevel: "high",
        includesSiblings: true,
        requiresParentCoordination: false
      }
    },
    norwegianGuidance: {
      culturalBackground: "Familietid er grunnleggende i norsk kultur",
      typicalTiming: ["Helger", "Etter skole/jobb", "Ferier"],
      seasonalConsiderations: ["Vinter: Innendørs mys", "Sommer: Lange utflukter"],
      parentingTips: ["Involver alle i planlegging", "Ha backup plan", "Nyt øyeblikket"],
      commonLocations: ["Hjemme", "Natur", "Kultursteder", "Hytta"]
    },
    usageCount: 0,
    isDefault: true
  },
  
  activities: {
    id: "template_activities",
    name: "Aktiviteter",
    type: "activities",
    description: "Sport, musikk, og fritidsaktiviteter",
    icon: "⚽",
    template: {
      type: "activities",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "hours", amount: 4, title: "", message: "Aktivitet om 4 timer", sent: false },
        { id: "", type: "minutes", amount: 30, title: "", message: "Aktivitet om 30 minutter", sent: false }
      ],
      norwegianContext: {
        weatherDependent: true,
        familyImpactLevel: "medium",
        includesSiblings: false,
        requiresParentCoordination: false
      },
      coordination: {
        requiresTransport: true,
        carpoolingAvailable: true
      }
    },
    norwegianGuidance: {
      culturalBackground: "Fysisk aktivitet og fritid er viktig for utvikling",
      typicalTiming: ["Etter skole", "Helger", "Ferier"],
      seasonalConsiderations: ["Vinter: Innendørs sport", "Sommer: Utendørs aktiviteter"],
      parentingTips: ["Ha med drikkeflaske", "Sjekk utstyrsliste", "Kom i tide"],
      commonLocations: ["Idrettshaller", "Kulturhus", "Utendørs anlegg"]
    },
    usageCount: 0,
    isDefault: true
  },
  
  cultural: {
    id: "template_cultural",
    name: "Kulturell aktivitet",
    type: "cultural",
    description: "Norske tradisjoner og kulturelle begivenheter",
    icon: "🇳🇴",
    template: {
      type: "cultural",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "days", amount: 3, title: "", message: "Kulturell aktivitet på torsdag", sent: false },
        { id: "", type: "hours", amount: 3, title: "", message: "Kulturell aktivitet om 3 timer", sent: false }
      ],
      norwegianContext: {
        weatherDependent: false,
        familyImpactLevel: "high",
        includesSiblings: true,
        requiresParentCoordination: true,
        traditionalElements: ["Nasjonalsang", "Flagg", "Tradisjonsmat"]
      }
    },
    norwegianGuidance: {
      culturalBackground: "Norske tradisjoner skaper tilhørighet og identitet",
      typicalTiming: ["Nasjonaldager", "Høytider", "Sesongfeiringer"],
      seasonalConsiderations: ["17. mai: Bunad og flagg", "Lucia: Hvite klær og lys"],
      parentingTips: ["Fortell om tradisjonen", "Involver barna", "Ta mange bilder"],
      commonLocations: ["Skole", "Kirke", "Samfunnshus", "Sentrum"]
    },
    usageCount: 0,
    isDefault: true
  },
  
  personal: {
    id: "template_personal",
    name: "Personlig avtale",
    type: "personal",
    description: "Private avtaler og personlige gjøremål",
    icon: "👤",
    template: {
      type: "personal",
      allDay: false,
      timezone: "Europe/Oslo",
      notifications: [
        { id: "", type: "hours", amount: 2, title: "", message: "Personlig avtale om 2 timer", sent: false }
      ],
      norwegianContext: {
        weatherDependent: false,
        familyImpactLevel: "low",
        includesSiblings: false,
        requiresParentCoordination: false
      }
    },
    norwegianGuidance: {
      culturalBackground: "Personlig tid og selvpleie er viktig",
      typicalTiming: ["Etter arbeidsdag", "Helger", "Kveld"],
      seasonalConsiderations: ["Vinter: Vitamin D tid", "Sommer: Utendørs personlig tid"],
      parentingTips: ["Koordiner med partner", "Planlegg barnepass", "Prioriter selvpleie"],
      commonLocations: ["Utenfor hjemmet", "Online", "Lokalt"]
    },
    usageCount: 0,
    isDefault: true
  }
};

// Utility functions for Norwegian appointments
export function createAppointmentFromTemplate(
  templateType: AppointmentType,
  customData: Partial<Appointment>
): Omit<Appointment, 'id'> {
  const template = NORWEGIAN_APPOINTMENT_TEMPLATES[templateType];
  
  return {
    ...template.template,
    ...customData,
    notifications: customData.notifications || template.template.notifications || [],
    participants: customData.participants || [],
    createdAt: new Date(),
    tags: [templateType, ...(customData.tags || [])],
  } as Omit<Appointment, 'id'>;
}

export function isAppointmentInNorwegianQuietHours(startTime: Date, endTime?: Date): boolean {
  const startHour = startTime.getHours();
  const endHour = endTime?.getHours() || startHour;
  
  // Norwegian quiet hours: 20:00 - 07:00
  return (startHour >= 20 || startHour < 7) || (endHour >= 20 || endHour < 7);
}

export function getNorwegianCulturalTimingWarnings(
  appointment: Appointment
): NorwegianCulturalAppointmentContext['timingWarnings'] {
  const warnings: NonNullable<NorwegianCulturalAppointmentContext['timingWarnings']> = [];
  const startHour = appointment.startTime.getHours();
  const dayOfWeek = appointment.startTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Norwegian dinner time (17:00-19:00)
  if (startHour >= 17 && startHour <= 19) {
    warnings.push({
      type: "DINNER_TIME",
      message: "Dette overlapper med vanlig middag tid i Norge (17:00-19:00)",
      suggestion: "Foreslår 16:30 eller 19:30 i stedet"
    });
  }
  
  // Quiet hours (20:00-07:00)
  if (isAppointmentInNorwegianQuietHours(appointment.startTime, appointment.endTime)) {
    warnings.push({
      type: "QUIET_HOURS", 
      message: "Dette er i norske kveldstimer (etter 20:00)",
      suggestion: "Vurder tidligere tidspunkt for familievennlighet"
    });
  }
  
  // Weekend family time (Saturday/Sunday morning)
  if ((dayOfWeek === 0 || dayOfWeek === 6) && startHour >= 8 && startHour <= 12) {
    warnings.push({
      type: "WEEKEND_FAMILY_TIME",
      message: "Lørdag/søndag formiddag er vanlig familietid i Norge",
      suggestion: "Sjekk at dette passer for hele familien"
    });
  }
  
  return warnings;
}

export function getCurrentNorwegianSeason(): "winter" | "spring" | "summer" | "autumn" {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 1) return "winter";
  if (month >= 2 && month <= 4) return "spring"; 
  if (month >= 5 && month <= 7) return "summer";
  return "autumn";
}

export function getSeasonalAppointmentRecommendations(season: string, type: AppointmentType): string[] {
  const recommendations: Record<string, Record<AppointmentType, string[]>> = {
    winter: {
      school: ["Sjekk veiforhold før møter", "Ha ekstra tid til transport"],
      health: ["Book time for D-vitamin kontroll", "Influensavaksine påminnelse"],
      family: ["Planlegg innendørs koselige aktiviteter", "Ski og vinteraktiviteter"],
      activities: ["Innendørs sport og aktiviteter", "Vinter utstyr og klær"],
      cultural: ["Lucia forberedelser", "Juleforberedelser og tradisjoner"],
      personal: ["Ekstra selvpleie i mørke måneder", "Planlegg vinterferie"]
    },
    spring: {
      school: ["17. mai forberedelser", "Vårsemester avslutning"],
      health: ["Allergi sjekker og forberedelser", "Utendørs aktiviteter gjenopptar"],
      family: ["Første utendørs familieturer", "Hagearbeid og planting"],
      activities: ["Overgang til utendørs sport", "Sykkel og utstyr service"], 
      cultural: ["17. mai planlegging", "Påskeforberedelser og tradisjoner"],
      personal: ["Vår rengjøring og organisering", "Utendørs trening gjenopptas"]
    },
    summer: {
      school: ["Sommerferie planlegging", "Skole avslutninger og fester"],
      health: ["Solkrem og sommersikkerhet", "Ferie medisiner og reise"],
      family: ["Lange hytteutflukter", "Strand og sjø aktiviteter"],
      activities: ["Sommercamper og utendørs sport", "Svømming og vannsport"],
      cultural: ["Midsommer feiring", "Lokale festivaler og arrangement"],
      personal: ["Aktiv sommer og utendørs tid", "Sommerferie og avkobling"]
    },
    autumn: {
      school: ["Skolestart forberedelser", "Høstsemester planlegging"],
      health: ["Influensavaksine", "Skole helse sjekker"],
      family: ["Høst aktiviteter og bærplukking", "Innendørs aktiviteter forberedes"],
      activities: ["Innendørs sport sesongen starter", "Høst utstyr og klær"],
      cultural: ["Høst tradisjoner og feiringer", "Forberedelser til vinter kulturer"],
      personal: ["Høst planlegging og organisering", "Vinter forberedelser"]
    }
  };
  
  return recommendations[season]?.[type] || [];
}

export function formatAppointmentType(type: AppointmentType): string {
  return NORWEGIAN_APPOINTMENT_TEMPLATES[type].name;
}

export function getAppointmentTypeIcon(type: AppointmentType): string {
  return NORWEGIAN_APPOINTMENT_TEMPLATES[type].icon;
}