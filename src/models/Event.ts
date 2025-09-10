/**
 * Norwegian Community Events Data Models
 * Supporting Norwegian cultural events, school coordination, and family activities
 */

export type EventType = 
  | "bursdagsfest" // Birthday parties
  | "skolearrangement" // School events
  | "foreldremøte" // Parent meetings
  | "klassetur" // Class trips
  | "sfo_aktivitet" // SFO activities
  | "aks_aktivitet" // AKS activities
  | "17_mai" // Constitution Day celebration
  | "lucia" // Lucia celebration
  | "julebord" // Christmas party
  | "vinterferie" // Winter holiday activities
  | "sommerferie" // Summer holiday activities
  | "dugnad" // Community work day
  | "idrett" // Sports events
  | "kultur" // Cultural activities
  | "friluftsliv" // Outdoor activities
  | "custom"; // Custom events

export type EventStatus = 
  | "draft" // Planning stage
  | "published" // Available for RSVPs
  | "confirmed" // Minimum attendance reached
  | "cancelled" // Event cancelled
  | "completed"; // Event finished

export type RSVPStatus = 
  | "pending" // No response yet
  | "yes" // Will attend
  | "no" // Will not attend
  | "maybe" // Uncertain
  | "waitlist"; // On waiting list

export type EventRecurrenceType = 
  | "none"
  | "weekly" 
  | "biweekly"
  | "monthly"
  | "yearly"
  | "school_term"; // Following Norwegian school calendar

export interface EventAttendee {
  userId: string;
  displayName: string;
  rsvpStatus: RSVPStatus;
  rsvpAt?: Date;
  
  // Who is attending
  attendingChildren: {
    childId: string;
    childName: string;
    specialNeeds?: string; // Dietary, accessibility, etc.
  }[];
  
  // Norwegian cultural context
  norwegianContext?: {
    bringingTraditionalFood?: boolean; // For cultural events
    volunteringForDugnad?: string[]; // Tasks they'll help with
    transportOffered?: boolean; // Can give rides to others
    equipmentSharing?: string[]; // What they can lend/share
  };
  
  // Practical information
  contactInfo?: {
    phone?: string;
    emergencyContact?: string;
  };
  
  notes?: string; // Special requests or information
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  
  // Scheduling
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timezone: string; // Default: Europe/Oslo
  
  // Recurrence
  recurrence: {
    type: EventRecurrenceType;
    interval?: number; // Every X weeks/months
    endDate?: Date;
    maxOccurrences?: number;
  };
  
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
  };
  
  // Organization
  organizerId: string;
  organizerName: string;
  groupId?: string; // Associated group
  
  // Norwegian cultural context
  norwegianCulturalContext?: {
    traditionalElement?: string; // What makes this culturally Norwegian
    seasonalContext?: string; // Connection to Norwegian seasons
    weatherConsiderations?: string; // Important for outdoor events
    giftGiving?: {
      expected: boolean;
      suggestions?: string[];
      maxAmount?: number; // Kroner
    };
    dresscode?: string;
    languagePreference?: "norwegian" | "english" | "both";
  };
  
  // Attendance management
  attendees: EventAttendee[];
  maxAttendees?: number;
  minAttendees?: number; // Event may be cancelled below this
  waitlistEnabled: boolean;
  
  // Coordination features
  coordination: {
    allowVolunteerSignup: boolean;
    volunteerTasks?: {
      task: string;
      volunteers: string[]; // User IDs
      maxVolunteers?: number;
    }[];
    
    allowResourceSharing: boolean;
    sharedResources?: {
      resource: string;
      providedBy: string; // User ID
      needsReturn: boolean;
    }[];
    
    carpoolingEnabled: boolean;
    carpools?: {
      driverId: string;
      driverName: string;
      availableSeats: number;
      pickupLocation?: string;
      riders: string[]; // User IDs
    }[];
  };
  
  // Communication
  updates: {
    id: string;
    authorId: string;
    authorName: string;
    message: string;
    timestamp: Date;
    isImportant: boolean; // Highlighted update
  }[];
  
  // Cost and logistics
  cost?: {
    amount: number; // Norwegian kroner
    currency: "NOK";
    description?: string;
    paymentDeadline?: Date;
    paymentMethods?: ("vipps" | "bank_transfer" | "cash" | "invoice")[];
  };
  
  // Age and grade restrictions
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
    specificGrades?: number[]; // Norwegian grades 1-10
  };
  
  // Privacy and visibility
  privacy: {
    visibility: "public" | "group_only" | "invite_only" | "school_only";
    allowGuestInvites: boolean; // Can attendees invite others
    shareAttendeeList: boolean;
  };
  
  // Weather contingency (important in Norway!)
  weatherBackup?: {
    required: boolean;
    alternativeLocation?: string;
    alternativeActivity?: string;
    weatherThreshold?: string; // "Heavy rain", "Snow", etc.
    decisionDeadline?: Date; // When final decision is made
  };
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  tags: string[];
  isTemplate: boolean; // Can be reused as template
}

export interface EventTemplate {
  id: string;
  name: string;
  type: EventType;
  description: string;
  icon: string;
  
  // Template content
  template: Partial<Event>;
  
  // Norwegian context
  norwegianContext: {
    culturalSignificance: string;
    typicalTimings: string[];
    commonLocations: string[];
    traditionalActivities: string[];
    planningSuggestions: string[];
  };
  
  // Usage
  usageCount: number;
  isPublic: boolean; // Available to all users
  createdBy?: string; // If custom template
}

export interface EventInvitation {
  id: string;
  eventId: string;
  inviterId: string;
  inviterName: string;
  targetUserId?: string; // For direct invitations
  targetEmail?: string; // For external invitations
  
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Date;
  expiresAt?: Date;
  
  message?: string;
  allowPlusOne?: boolean; // Can bring additional person
  
  // Norwegian politeness
  norwegianContext?: {
    relationshipToHost: string; // "Vi er klassekamerater"
    personalNote?: string; // Personal invitation message
    giftSuggestions?: string[]; // If gift-giving event
  };
}

// Norwegian Event Templates
export const NORWEGIAN_EVENT_TEMPLATES: Record<EventType, EventTemplate> = {
  bursdagsfest: {
    id: "template_bursdagsfest",
    name: "Bursdagsfest",
    type: "bursdagsfest",
    description: "Tradisjonell norsk barnebursdag",
    icon: "🎂",
    template: {
      type: "bursdagsfest",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: false,
      norwegianCulturalContext: {
        traditionalElement: "Bursdagsleker, kake, og gavebord",
        giftGiving: {
          expected: true,
          suggestions: ["Bøker", "Leker", "Klær"],
          maxAmount: 200
        },
        dresscode: "Vanlige klær, gjerne litt pyntet"
      },
      coordination: {
        allowVolunteerSignup: true,
        allowResourceSharing: true,
        carpoolingEnabled: false
      },
      privacy: {
        visibility: "invite_only",
        allowGuestInvites: false,
        shareAttendeeList: true
      }
    },
    norwegianContext: {
      culturalSignificance: "Viktig tradisjon for å feire barnets spesielle dag",
      typicalTimings: ["14:00-17:00 på lørdag", "13:00-16:00 på søndag"],
      commonLocations: ["Hjemme", "Lekeplass", "Aktivitetssenter"],
      traditionalActivities: ["Bursdagsleker", "Kakeserving", "Gaveutpakking"],
      planningSuggestions: [
        "Send invitasjoner 2-3 uker i forveien",
        "Planlegg leker for ulik alder", 
        "Ha nok kake til alle",
        "Forbered liten takketale til slutt"
      ]
    },
    usageCount: 0,
    isPublic: true
  },
  
  skolearrangement: {
    id: "template_skolearrangement",
    name: "Skolearrangement",
    type: "skolearrangement",
    description: "Skoleaktiviteter og foreldremøter",
    icon: "🏫",
    template: {
      type: "skolearrangement",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: false,
      coordination: {
        allowVolunteerSignup: true,
        allowResourceSharing: false,
        carpoolingEnabled: true
      },
      privacy: {
        visibility: "group_only",
        allowGuestInvites: false,
        shareAttendeeList: true
      }
    },
    norwegianContext: {
      culturalSignificance: "Viktig for skole-hjem samarbeid",
      typicalTimings: ["19:00-20:30 på hverdager", "10:00-12:00 på lørdager"],
      commonLocations: ["Klasserom", "Gymsal", "Aula"],
      traditionalActivities: ["Presentasjoner", "Diskusjoner", "Planlegging"],
      planningSuggestions: [
        "Send påmelding i god tid",
        "Forbered spørsmål på forhånd",
        "Ta notater underveis",
        "Følg opp med læreren etterpå"
      ]
    },
    usageCount: 0,
    isPublic: true
  },
  
  "17_mai": {
    id: "template_17_mai", 
    name: "17. mai feiring",
    type: "17_mai",
    description: "Grunnlovsdag feiring",
    icon: "🇳🇴",
    template: {
      type: "17_mai",
      isAllDay: true,
      recurrence: { type: "yearly", interval: 1 },
      waitlistEnabled: false,
      norwegianCulturalContext: {
        traditionalElement: "Bunad, flagg, og nasjonalsangen",
        dresscode: "Bunad eller fine klær i rødt, hvitt og blått",
        languagePreference: "norwegian"
      },
      coordination: {
        allowVolunteerSignup: true,
        allowResourceSharing: true,
        carpoolingEnabled: false
      },
      privacy: {
        visibility: "public",
        allowGuestInvites: true,
        shareAttendeeList: false
      },
      weatherBackup: {
        required: true,
        weatherThreshold: "Kraftig regn",
        alternativeActivity: "Innendørs feiring"
      }
    },
    norwegianContext: {
      culturalSignificance: "Norges viktigste nasjonaldag",
      typicalTimings: ["09:00 barnetog", "12:00 familiesamling", "15:00 aktiviteter"],
      commonLocations: ["Sentrum", "Skolegård", "Lokalmiljø"],
      traditionalActivities: ["Barnetog", "Flaggheising", "Nasjonalsang", "Is og pølser"],
      planningSuggestions: [
        "Sjekk værmeldingen dagen før",
        "Ha flagg og evt. bunad klart",
        "Møt opp i god tid til toget",
        "Ta mange bilder av denne spesielle dagen"
      ]
    },
    usageCount: 0,
    isPublic: true
  },
  
  friluftsliv: {
    id: "template_friluftsliv",
    name: "Friluftsliv",
    type: "friluftsliv", 
    description: "Naturopplevelser og utendørsaktiviteter",
    icon: "🏔️",
    template: {
      type: "friluftsliv",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: true,
      norwegianCulturalContext: {
        traditionalElement: "Tilgang til naturen for alle",
        seasonalContext: "Tilpasset årstiden",
        weatherConsiderations: "Avhengig av værforhold",
        dresscode: "Varme, vanntette klær og gode sko"
      },
      coordination: {
        allowVolunteerSignup: true,
        allowResourceSharing: true,
        carpoolingEnabled: true
      },
      privacy: {
        visibility: "group_only",
        allowGuestInvites: true,
        shareAttendeeList: true
      },
      weatherBackup: {
        required: true,
        weatherThreshold: "Farlig vær",
        decisionDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours before
      }
    },
    norwegianContext: {
      culturalSignificance: "Grunnleggende del av norsk kultur og identitet",
      typicalTimings: ["10:00-15:00", "Hele dagen", "Helg"],
      commonLocations: ["Skog", "Fjell", "Sjø", "Skiløyper"],
      traditionalActivities: ["Turgåing", "Bærplukking", "Skitur", "Bålkos"],
      planningSuggestions: [
        "Sjekk værmelding og føreforhold",
        "Pakk termokanne og mat",
        "Ha førstehjelpsutstyr",
        "Inform om ruten og returntid"
      ]
    },
    usageCount: 0,
    isPublic: true
  },
  
  // Add other templates...
  foreldremøte: {
    id: "template_foreldremøte",
    name: "Foreldremøte",
    type: "foreldremøte",
    description: "Møte mellom foreldre og skole/gruppe",
    icon: "👨‍👩‍👧‍👦",
    template: {
      type: "foreldremøte",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Viktig kommunikasjon mellom hjem og skole",
      typicalTimings: ["19:00-21:00"],
      commonLocations: ["Klasserom", "Bibliotek"],
      traditionalActivities: ["Informasjonsutveksling", "Planlegging"],
      planningSuggestions: ["Forbered spørsmål", "Ta notater"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  klassetur: {
    id: "template_klassetur",
    name: "Klassetur",
    type: "klassetur",
    description: "Tur med hele klassen",
    icon: "🚌",
    template: {
      type: "klassetur",
      isAllDay: true,
      recurrence: { type: "none" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Viktig for klassefellesskap",
      typicalTimings: ["Hele dagen", "Flere dager"],
      commonLocations: ["Museum", "Natur", "Kultursteder"],
      traditionalActivities: ["Læring", "Lek", "Sosial samhandling"],
      planningSuggestions: ["Pakk matpakke", "Ha varme klær"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  sfo_aktivitet: {
    id: "template_sfo_aktivitet",
    name: "SFO Aktivitet",
    type: "sfo_aktivitet",
    description: "Aktivitet i SkoleFritidsOrdning",
    icon: "⚽",
    template: {
      type: "sfo_aktivitet",
      isAllDay: false,
      recurrence: { type: "weekly" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Viktig for arbeidslivet til foreldre",
      typicalTimings: ["15:30-17:00"],
      commonLocations: ["Skole", "Gymsal", "Uteområde"],
      traditionalActivities: ["Sport", "Håndverk", "Lek"],
      planningSuggestions: ["Husk ekstra klær", "Gi beskjed om henting"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  aks_aktivitet: {
    id: "template_aks_aktivitet",
    name: "AKS Aktivitet",
    type: "aks_aktivitet",
    description: "Aktivitetsskole arrangement",
    icon: "🎨",
    template: {
      type: "aks_aktivitet",
      isAllDay: false,
      recurrence: { type: "weekly" },
      waitlistEnabled: true
    },
    norwegianContext: {
      culturalSignificance: "Utvikling av barnas interesser og talenter",
      typicalTimings: ["16:00-17:30"],
      commonLocations: ["Skole", "Kulturhus", "Bibliotek"],
      traditionalActivities: ["Kunst", "Musikk", "Teater"],
      planningSuggestions: ["Ha materiell klart", "Kom i tide"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  lucia: {
    id: "template_lucia",
    name: "Lucia",
    type: "lucia",
    description: "Lucia feiring 13. desember",
    icon: "🕯️",
    template: {
      type: "lucia",
      isAllDay: false,
      recurrence: { type: "yearly" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Tradisjonell vinterfeiring",
      typicalTimings: ["18:00-20:00"],
      commonLocations: ["Skole", "Kirke", "Samfunnshus"],
      traditionalActivities: ["Lucia-tog", "Sang", "Lys"],
      planningSuggestions: ["Øv på sanger", "Ha hvite klær"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  julebord: {
    id: "template_julebord",
    name: "Julebord",
    type: "julebord",
    description: "Julefest for barn og familier",
    icon: "🎄",
    template: {
      type: "julebord",
      isAllDay: false,
      recurrence: { type: "yearly" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Viktig juletradisjoner",
      typicalTimings: ["17:00-20:00"],
      commonLocations: ["Samfunnshus", "Skole", "Hjemme"],
      traditionalActivities: ["Julebord", "Julesanger", "Dans"],
      planningSuggestions: ["Ta med julemat", "Øv på sanger"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  vinterferie: {
    id: "template_vinterferie",
    name: "Vinterferie",
    type: "vinterferie",
    description: "Vinterferieaktiviteter",
    icon: "⛷️",
    template: {
      type: "vinterferie",
      isAllDay: true,
      recurrence: { type: "none" },
      waitlistEnabled: true
    },
    norwegianContext: {
      culturalSignificance: "Viktig vinterpause i skoleåret",
      typicalTimings: ["Hele dagen", "Flere dager"],
      commonLocations: ["Skiområder", "Byen", "Natur"],
      traditionalActivities: ["Skiing", "Aking", "Inne aktiviteter"],
      planningSuggestions: ["Sjekk værmelding", "Pakk varmt"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  sommerferie: {
    id: "template_sommerferie",
    name: "Sommerferie",
    type: "sommerferie",
    description: "Sommerferieaktiviteter",
    icon: "☀️",
    template: {
      type: "sommerferie",
      isAllDay: true,
      recurrence: { type: "none" },
      waitlistEnabled: true
    },
    norwegianContext: {
      culturalSignificance: "Lang sommerpause i norsk skole",
      typicalTimings: ["Hele dagen", "Flere uker"],
      commonLocations: ["Strander", "Parker", "Hytte"],
      traditionalActivities: ["Baden", "Gåturer", "Utforskning"],
      planningSuggestions: ["Sjekk værmelding", "Ta med solkrem"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  dugnad: {
    id: "template_dugnad",
    name: "Dugnad",
    type: "dugnad",
    description: "Fellesjobb for skole eller gruppe",
    icon: "🧹",
    template: {
      type: "dugnad",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Viktig norsk tradisjon for fellesskap",
      typicalTimings: ["09:00-15:00 lørdag"],
      commonLocations: ["Skole", "Uteområder", "Lokalmiljø"],
      traditionalActivities: ["Rydding", "Maling", "Vedlikehold"],
      planningSuggestions: ["Ta med arbeidsklær", "Ha redskaper"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  idrett: {
    id: "template_idrett",
    name: "Idrett",
    type: "idrett",
    description: "Sportsaktiviteter og konkurranser",
    icon: "⚽",
    template: {
      type: "idrett",
      isAllDay: false,
      recurrence: { type: "weekly" },
      waitlistEnabled: true
    },
    norwegianContext: {
      culturalSignificance: "Viktig for fysisk aktivitet og sosialisering",
      typicalTimings: ["17:00-19:00"],
      commonLocations: ["Gymsal", "Idrettsplass", "Utendørs"],
      traditionalActivities: ["Trening", "Kamper", "Konkurranser"],
      planningSuggestions: ["Ta med sportsutstyr", "Drikke vann"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  kultur: {
    id: "template_kultur",
    name: "Kultur",
    type: "kultur",
    description: "Kulturelle aktiviteter og opplevelser",
    icon: "🎭",
    template: {
      type: "kultur",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: true
    },
    norwegianContext: {
      culturalSignificance: "Viktig for kulturell utvikling",
      typicalTimings: ["19:00-21:00", "14:00-16:00"],
      commonLocations: ["Teater", "Museum", "Bibliotek"],
      traditionalActivities: ["Forestillinger", "Utstillinger", "Workshops"],
      planningSuggestions: ["Bestill billetter i forveien", "Les om arrangementet"]
    },
    usageCount: 0,
    isPublic: true
  },
  
  custom: {
    id: "template_custom",
    name: "Egendefinert",
    type: "custom",
    description: "Lag ditt eget arrangement",
    icon: "⚙️",
    template: {
      type: "custom",
      isAllDay: false,
      recurrence: { type: "none" },
      waitlistEnabled: false
    },
    norwegianContext: {
      culturalSignificance: "Tilpasset deres behov",
      typicalTimings: ["Velg selv"],
      commonLocations: ["Etter eget valg"],
      traditionalActivities: ["Egendefinert"],
      planningSuggestions: ["Planlegg i god tid"]
    },
    usageCount: 0,
    isPublic: false
  }
};

// Utility functions
export function createEventFromTemplate(
  templateType: EventType,
  customData: Partial<Event>
): Omit<Event, 'id'> {
  const template = NORWEGIAN_EVENT_TEMPLATES[templateType];
  
  return {
    ...template.template,
    ...customData,
    attendees: [],
    updates: [],
    coordination: {
      allowVolunteerSignup: false,
      allowResourceSharing: false,
      carpoolingEnabled: false,
      ...template.template.coordination,
      ...customData.coordination
    },
    createdAt: new Date(),
    tags: [templateType],
    isTemplate: false
  } as Omit<Event, 'id'>;
}

export function isEventInNorwegianQuietHours(startTime: Date, endTime: Date): boolean {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  
  // Check if event starts or ends during quiet hours (20:00-07:00)
  return (startHour >= 20 || startHour < 7) || (endHour >= 20 || endHour < 7);
}

export function calculateEventCapacity(event: Event): {
  totalCapacity: number;
  currentAttendees: number;
  availableSpots: number;
  waitlistCount: number;
} {
  const currentAttendees = event.attendees.filter(a => a.rsvpStatus === "yes").length;
  const waitlistCount = event.attendees.filter(a => a.rsvpStatus === "waitlist").length;
  const totalCapacity = event.maxAttendees || Infinity;
  
  return {
    totalCapacity: totalCapacity === Infinity ? -1 : totalCapacity,
    currentAttendees,
    availableSpots: totalCapacity === Infinity ? -1 : Math.max(0, totalCapacity - currentAttendees),
    waitlistCount
  };
}

export function shouldCancelEventDueToWeather(
  event: Event,
  currentWeather: string
): boolean {
  if (!event.weatherBackup?.required) return false;
  if (!event.weatherBackup.weatherThreshold) return false;
  
  const threshold = event.weatherBackup.weatherThreshold.toLowerCase();
  const weather = currentWeather.toLowerCase();
  
  // Simple weather check - in production this would integrate with weather API
  return weather.includes(threshold);
}

export function formatEventType(type: EventType): string {
  return NORWEGIAN_EVENT_TEMPLATES[type].name;
}

export function getEventTypeIcon(type: EventType): string {
  return NORWEGIAN_EVENT_TEMPLATES[type].icon;
}

export function isChildEligibleForEvent(
  event: Event,
  child: { age: number; currentGrade?: number }
): boolean {
  const { ageRestrictions } = event;
  if (!ageRestrictions) return true;
  
  // Check age restrictions
  if (ageRestrictions.minAge && child.age < ageRestrictions.minAge) return false;
  if (ageRestrictions.maxAge && child.age > ageRestrictions.maxAge) return false;
  
  // Check grade restrictions
  if (ageRestrictions.specificGrades && child.currentGrade) {
    return ageRestrictions.specificGrades.includes(child.currentGrade);
  }
  
  return true;
}