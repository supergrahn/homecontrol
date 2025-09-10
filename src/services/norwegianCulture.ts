// Norwegian Language & Cultural Adaptation Service  
// Provides Norwegian-specific language support and cultural adaptations for POTY
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Child } from "./children";

export type NorwegianLanguageLevel = "native" | "advanced" | "intermediate" | "beginner";

export type NorwegianCulturalPreferences = {
  preferNorwegianLanguage: boolean;
  useNorwegianTimeFormat: boolean; // 24-hour format
  observeNorwegianHolidays: boolean;
  includeFriluftsliv: boolean; // Outdoor life activities
  useNorwegianGradingSystem: boolean; // 1-6 scale vs A-F
  respectQuietHours: boolean; // Norwegian quiet hours (22:00-07:00)
  includeNorwegianTraditions: boolean;
  dialectSupport?: "bokmål" | "nynorsk" | "both";
  regionSpecifics?: {
    kommune: string;
    fylke: string; // County
    customTraditions: string[];
  };
};

export type NorwegianLanguageSupport = {
  taskTitles: Record<string, string>; // English -> Norwegian
  notifications: Record<string, string>;
  timeExpressions: Record<string, string>;
  familyTerms: Record<string, string>;
  schoolTerms: Record<string, string>;
  weekdayShort: string[];
  monthNames: string[];
  greetings: {
    morning: string[];
    afternoon: string[];
    evening: string[];
    motivational: string[];
  };
};

export type NorwegianCulturalContext = {
  seasonalActivities: Record<"vinter" | "vår" | "sommer" | "høst", string[]>;
  importantDates: { date: string; name: string; description: string }[];
  familyValues: string[];
  parentingApproach: string[];
  workLifeBalance: string[];
  outdoorCulture: string[];
};

// Norwegian language translations and cultural mappings
const NORWEGIAN_LANGUAGE_PACK: NorwegianLanguageSupport = {
  taskTitles: {
    "Clean room": "Rydde rommet",
    "Do homework": "Gjøre lekser", 
    "Set table": "Dekke bordet",
    "Clear table": "Rydde av bordet",
    "Take out trash": "Ta ut søppel",
    "Feed pets": "Mate kjæledyr",
    "Water plants": "Vanne planter",
    "Make bed": "Rydde sengen",
    "Pack school bag": "Pakke skolesekken",
    "Brush teeth": "Pusse tenner",
    "Get dressed": "Kle på seg",
    "Eat breakfast": "Spise frokost",
    "Put on jacket": "Ta på jakken",
    "Take shower": "Dusje",
    "Practice instrument": "Øve på instrument",
    "Read book": "Lese bok",
    "Help with dinner": "Hjelpe til med middag",
    "Wash dishes": "Vaske opp",
    "Load dishwasher": "Laste oppvaskmaskin",
    "Vacuum": "Støvsuge",
    "Mop floor": "Vaske gulv",
    "Do laundry": "Ta klesvask",
    "Fold clothes": "Brette klær",
    "Grocery shopping": "Handla mat",
    "Walk dog": "Gå tur med hund",
    "Check weather": "Sjekke været",
    "Prepare lunch": "Lage matpakke"
  },
  
  notifications: {
    "Task reminder": "Oppgavepåminnelse",
    "Homework due": "Lekser skal leveres",
    "School starts soon": "Skolen starter snart", 
    "Pick up from school": "Hente på skolen",
    "Activity reminder": "Aktivitetspåminnelse",
    "Bedtime": "Leggetid",
    "Morning routine": "Morgenrutine",
    "Conflict detected": "Konflikt oppdaget",
    "Schedule change": "Endring i planen",
    "Weather alert": "Værvarsel",
    "Holiday reminder": "Helligdagspåminnelse",
    "Weekly planning": "Ukesplanlegging"
  },

  timeExpressions: {
    "in the morning": "på morgenen",
    "this afternoon": "i ettermiddag", 
    "this evening": "i kveld",
    "tomorrow": "i morgen",
    "next week": "neste uke",
    "today": "i dag",
    "yesterday": "i går",
    "soon": "snart",
    "later": "senere",
    "before school": "før skolen",
    "after school": "etter skolen",
    "during break": "i pausen",
    "weekend": "helg",
    "weekday": "hverdag"
  },

  familyTerms: {
    "mom": "mamma",
    "dad": "pappa", 
    "parent": "forelder",
    "child": "barn",
    "children": "barn",
    "family": "familie",
    "household": "husholdning",
    "sibling": "søsken",
    "brother": "bror",
    "sister": "søster",
    "grandparent": "besteforelder",
    "grandmother": "bestemor",
    "grandfather": "bestefar"
  },

  schoolTerms: {
    "homework": "lekser",
    "teacher": "lærer",  
    "class": "klasse",
    "grade": "trinn",
    "school": "skole",
    "lesson": "time",
    "break": "pause",
    "recess": "frikvarter",
    "assembly": "samling",
    "test": "prøve",
    "exam": "eksamen",
    "project": "prosjekt",
    "assignment": "oppgave",
    "subject": "fag",
    "schedule": "timeplan",
    "backpack": "skolesekk",
    "lunch box": "matboks",
    "pencil case": "pennal"
  },

  weekdayShort: ["man", "tir", "ons", "tor", "fre", "lør", "søn"],
  
  monthNames: [
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember"
  ],

  greetings: {
    morning: [
      "God morgen!", 
      "Hyggelig morgen!",
      "Ha en fin dag!",
      "Kos deg på skolen!"
    ],
    afternoon: [
      "God ettermiddag!",
      "Håper du hadde en fin dag!",
      "Hvordan gikk det på skolen?",
      "Godt jobba i dag!"
    ], 
    evening: [
      "God kveld!",
      "Kos deg i kveld!",
      "Ha det gøy!",
      "Sov godt!"
    ],
    motivational: [
      "Du klarer dette!",
      "Stå på!",
      "Bare å fortsette!",
      "Flott jobbet!",
      "Godt gjort!",
      "Helt topp!",
      "Supert!",
      "Du er flink!"
    ]
  }
};

const NORWEGIAN_CULTURAL_CONTEXT: NorwegianCulturalContext = {
  seasonalActivities: {
    vinter: [
      "Gå på ski", "Bygge snømann", "Ake", "Skøyte", "Vintertur i marka",
      "Kose seg innendørs", "Bake julekaker", "Tenne peisen", "Leke i snøen"
    ],
    vår: [
      "17. mai-feiring", "Plante i hagen", "Naturvandring", "Plukke blomster",
      "Sykkeltur", "Påsketur til fjellet", "Renske i hagen", "Grilling utendørs"
    ],
    sommer: [
      "Bade i sjøen", "Hyttetid", "Bærplukking", "Camping", "Midnattsol",
      "Fisketurer", "Fjelltur", "Bål og grilling", "Utendørsaktiviteter"
    ],
    høst: [
      "Sopptur", "Høstmys", "Rake løv", "Halloween", "Tenne fyringsanlegget",
      "Høstferie", "Sette frem vinterklær", "Lyse mange lys"
    ]
  },

  importantDates: [
    { date: "01-01", name: "Nyttårsdag", description: "Nytt år og nye muligheter" },
    { date: "05-01", name: "Arbeidernes dag", description: "Feire arbeid og felleskap" },
    { date: "05-17", name: "Grunnlovsdag", description: "Norges nasjonaldag med tog og feiring" },
    { date: "12-24", name: "Julaften", description: "Den viktigste juledagen i Norge" },
    { date: "12-25", name: "1. juledag", description: "Familietid og ro" },
    { date: "12-26", name: "2. juledag", description: "Fortsatt julestemning" }
  ],

  familyValues: [
    "Trygghet og tillit",
    "Likestilling og rettferdighet", 
    "Ansvar for fellesskapet",
    "Respekt for naturen",
    "Verdsetting av kunnskap",
    "Balanse mellom jobb og familie",
    "Enkle gleder og hygge",
    "Demokratisk beslutningstagning"
  ],

  parentingApproach: [
    "La barn være barn",
    "Lær gjennom lek og utforskning", 
    "Tillit til barns egne valg",
    "Oppmuntre selvstendighet",
    "Naturnær oppvekst",
    "Balanse mellom struktur og frihet",
    "Åpen kommunikasjon",
    "Respektere barnets perspektiv"
  ],

  workLifeBalance: [
    "Familie kommer først",
    "Fleksible arbeidstider",
    "Lang ferieperiode om sommeren",
    "Korte arbeidsdager for barn", 
    "Tid til hvile og rekreasjon",
    "Verdsette fritid",
    "Bærekraftig livsstil",
    "Mindre stress, mer glede"
  ],

  outdoorCulture: [
    "Allemannsretten - fri ferdsel i naturen",
    "Friluftsliv som livsstil",
    "Være ute i all slags vær", 
    "Lære om naturen",
    "Respektere miljøet",
    "Fysisk aktivitet utendørs",
    "Enkle gleder i naturen",
    "Hyttekultur og fjelltur"
  ]
};

export class NorwegianCulturalAdaptationService {
  private preferencesKey = "norwegian_cultural_preferences";
  private languageLevelKey = "norwegian_language_level";
  private cachedPreferences: NorwegianCulturalPreferences | null = null;

  private getDefaultPreferences(): NorwegianCulturalPreferences {
    return {
      preferNorwegianLanguage: true,
      useNorwegianTimeFormat: true,
      observeNorwegianHolidays: true,
      includeFriluftsliv: true,
      useNorwegianGradingSystem: true,
      respectQuietHours: true,
      includeNorwegianTraditions: true,
      dialectSupport: "bokmål"
    };
  }

  // Get current cultural preferences
  async getCulturalPreferences(): Promise<NorwegianCulturalPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.preferencesKey);
      if (stored) {
        const parsed: NorwegianCulturalPreferences = JSON.parse(stored);
        this.cachedPreferences = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to get cultural preferences:", error);
    }

    // Default Norwegian preferences
    const defaults = this.getDefaultPreferences();
    this.cachedPreferences = defaults;
    return defaults;
  }

  // Synchronous accessor using cache or defaults
  getCulturalPreferencesSync(): NorwegianCulturalPreferences {
    return this.cachedPreferences ?? this.getDefaultPreferences();
  }

  // Update cultural preferences
  async updateCulturalPreferences(preferences: Partial<NorwegianCulturalPreferences>): Promise<void> {
    try {
      const current = await this.getCulturalPreferences();
      const updated = { ...current, ...preferences };
      await AsyncStorage.setItem(this.preferencesKey, JSON.stringify(updated));
      this.cachedPreferences = updated;
    } catch (error) {
      console.error("Failed to update cultural preferences:", error);
    }
  }

  // Translate text to Norwegian
  translateToNorwegian(englishText: string, category?: "task" | "notification" | "time" | "family" | "school"): string {
    const preferences = this.getCulturalPreferencesSync();
    
    // If Norwegian language is not preferred, return original
    if (!preferences || !preferences.preferNorwegianLanguage) {
      return englishText;
    }

    let translationSource: Record<string, string>;
    
    switch (category) {
      case "task":
        translationSource = NORWEGIAN_LANGUAGE_PACK.taskTitles;
        break;
      case "notification":
        translationSource = NORWEGIAN_LANGUAGE_PACK.notifications;
        break;
      case "time":
        translationSource = NORWEGIAN_LANGUAGE_PACK.timeExpressions;
        break;
      case "family":
        translationSource = NORWEGIAN_LANGUAGE_PACK.familyTerms;
        break;
      case "school":
        translationSource = NORWEGIAN_LANGUAGE_PACK.schoolTerms;
        break;
      default:
        // Try all categories
        const allTranslations = {
          ...NORWEGIAN_LANGUAGE_PACK.taskTitles,
          ...NORWEGIAN_LANGUAGE_PACK.notifications,
          ...NORWEGIAN_LANGUAGE_PACK.timeExpressions,
          ...NORWEGIAN_LANGUAGE_PACK.familyTerms,
          ...NORWEGIAN_LANGUAGE_PACK.schoolTerms
        };
        translationSource = allTranslations;
    }

    return translationSource[englishText] || englishText;
  }

  // Format time in Norwegian style
  formatNorwegianTime(date: Date, preferences?: NorwegianCulturalPreferences): string {
    const prefs = preferences || this.getCulturalPreferencesSync();
    
    if (prefs.useNorwegianTimeFormat) {
      return date.toLocaleTimeString('nb-NO', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    return date.toLocaleTimeString('en-US');
  }

  // Format date in Norwegian style
  formatNorwegianDate(date: Date, includeWeekday: boolean = true): string {
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    
    if (includeWeekday) {
      options.weekday = 'long';
    }
    
    return date.toLocaleDateString('nb-NO', options);
  }

  // Get culturally appropriate greeting
  getNorwegianGreeting(timeOfDay: "morning" | "afternoon" | "evening" | "motivational"): string {
    const greetings = NORWEGIAN_LANGUAGE_PACK.greetings[timeOfDay];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Get seasonal activities suggestions
  getSeasonalActivities(season?: "vinter" | "vår" | "sommer" | "høst"): string[] {
    const currentSeason = season || this.getCurrentNorwegianSeason();
    return NORWEGIAN_CULTURAL_CONTEXT.seasonalActivities[currentSeason];
  }

  // Check if current time respects Norwegian quiet hours
  isWithinQuietHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // Norwegian quiet hours: 20:00 - 07:00 (8PM - 7AM)
    return hour >= 20 || hour < 7;
  }

  // Check if current time is during typical Norwegian friluftsliv hours
  isWithinFriluftsliv(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Weekend daytime (10:00-16:00) is typical Norwegian outdoor family time
    return isWeekend && hour >= 10 && hour <= 16;
  }

  // Get appropriate notification delay for cultural context
  getNotificationDelay(): number {
    if (this.isWithinQuietHours()) {
      // Delay until 7 AM
      const now = new Date();
      const nextMorning = new Date();
      if (now.getHours() >= 20) {
        // If it's evening, delay until next morning
        nextMorning.setDate(now.getDate() + 1);
      }
      nextMorning.setHours(7, 0, 0, 0);
      return Math.max(0, nextMorning.getTime() - now.getTime());
    }
    
    if (this.isWithinFriluftsliv()) {
      // Short delay during friluftsliv time (30 minutes)
      return 30 * 60 * 1000;
    }
    
    return 0; // No delay
  }

  // Get culturally appropriate notification channel
  getNotificationChannel(): string {
    if (this.isWithinQuietHours()) {
      return "silent";
    }
    
    if (this.isWithinFriluftsliv()) {
      return "friluftsliv";
    }
    
    return "default";
  }

  // Adapt task scheduling for Norwegian culture
  adaptTaskForNorwegianCulture(taskTitle: string, child: Child): {
    title: string;
    suggestions: string[];
    culturalNotes: string[];
  } {
    const norwegianTitle = this.translateToNorwegian(taskTitle, "task");
    const suggestions: string[] = [];
    const culturalNotes: string[] = [];

    // Add Norwegian-specific suggestions based on task type
    if (taskTitle.toLowerCase().includes("outdoor") || taskTitle.toLowerCase().includes("outside")) {
      suggestions.push("Husk på allemannsretten når dere er ute");
      suggestions.push("Ta med ryggsekk og drikke");
      culturalNotes.push("Friluftsliv er viktig i norsk kultur");
    }

    if (taskTitle.toLowerCase().includes("homework") || taskTitle.toLowerCase().includes("lekser")) {
      suggestions.push("Sett av rolig tid til lekselesing");
      suggestions.push("Ha alt utstyr klart på forhånd");
      culturalNotes.push("Norske lærere setter pris på selvstendige elever");
    }

    if (taskTitle.toLowerCase().includes("meal") || taskTitle.toLowerCase().includes("middag")) {
      suggestions.push("Kanskje prøve en tradisjonell norsk rett?");
      suggestions.push("Spise sammen som familie");
      culturalNotes.push("Familemåltider er viktige i Norge");
    }

    return {
      title: norwegianTitle,
      suggestions,
      culturalNotes
    };
  }

  // Get Norwegian parenting wisdom
  getNorwegianParentingTip(): string {
    const tips = [
      "La barna leke ute i all slags vær - det styrker immunforsvaret",
      "Barn trenger struktur, men også frihet til å utforske",
      "Lær barna om naturen og respekt for miljøet",
      "Tillit er grunnlaget for gode foreldrebarn-relasjoner",
      "Det er lov å kjede seg - det fremmer kreativitet",
      "Familietid er like viktig som produktivitet",
      "Barn lærer mest gjennom lek og positive opplevelser",
      "Å feile er en naturlig del av læringen",
      "Lær barna å sette pris på enkle gleder",
      "Demokrati starter hjemme - involver barna i beslutninger"
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Get Norwegian family values for the day
  getDailyNorwegianValue(): { value: string; description: string } {
    const values = NORWEGIAN_CULTURAL_CONTEXT.familyValues;
    const approaches = NORWEGIAN_CULTURAL_CONTEXT.parentingApproach;
    
    const value = values[Math.floor(Math.random() * values.length)];
    const approach = approaches[Math.floor(Math.random() * approaches.length)];
    
    return {
      value,
      description: `I dag kan dere fokusere på: ${approach}`
    };
  }

  // Assess Norwegian language proficiency
  async assessLanguageLevel(child: Child): Promise<NorwegianLanguageLevel> {
    // This would analyze the child's school grade and language usage
    // For now, make educated guess based on grade
    if (!child.currentGrade) return "beginner";
    
    if (child.currentGrade <= 2) return "beginner";
    if (child.currentGrade <= 5) return "intermediate"; 
    if (child.currentGrade <= 8) return "advanced";
    return "native";
  }

  // Generate Norwegian cultural context for notifications
  generateCulturalNotificationContext(type: "task" | "school" | "family" | "seasonal"): string {
    const contexts = {
      task: [
        "Husk på familieverdiene våre",
        "Ta det i ditt eget tempo", 
        "Spør om hjelp hvis du trenger det",
        "Godt jobbet så langt!"
      ],
      school: [
        "Lykke til på skolen i dag!",
        "Husk matpakka og alt utstyr",
        "Ha en fin dag med vennene dine",
        "Lær noe nytt og spennende!"
      ],
      family: [
        "Familietid er koselig tid",
        "Dere er et flott lag sammen",
        "Kos dere og ha det gøy",
        "Ta vare på hverandre"
      ],
      seasonal: this.getSeasonalMessage()
    };

    const options = contexts[type];
    return Array.isArray(options) ? 
      options[Math.floor(Math.random() * options.length)] :
      options;
  }

  // Helper functions
  private getCurrentNorwegianSeason(): "vinter" | "vår" | "sommer" | "høst" {
    const month = new Date().getMonth() + 1;
    
    if (month >= 12 || month <= 2) return "vinter";
    if (month >= 3 && month <= 5) return "vår";
    if (month >= 6 && month <= 8) return "sommer";
    return "høst";
  }

  private getSeasonalMessage(): string {
    const season = this.getCurrentNorwegianSeason();
    const messages = {
      vinter: "Nyt vintermørket og kos deg inne",
      vår: "Våren kommer - tid for nye begynnelser",
      sommer: "Sommerferien er tid for frihet og opplevelser", 
      høst: "Høsten er tid for forberedelser og mys"
    };
    
    return messages[season];
  }
}

// Export singleton instance
export const norwegianCulture = new NorwegianCulturalAdaptationService();

// Utility functions for Norwegian culture
export function getNorwegianWeekday(date: Date, short: boolean = false): string {
  const weekdays = short ? 
    NORWEGIAN_LANGUAGE_PACK.weekdayShort :
    ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
  
  return weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for Norwegian week start
}

export function getNorwegianMonth(date: Date): string {
  return NORWEGIAN_LANGUAGE_PACK.monthNames[date.getMonth()];
}

export function isNorwegianWorkingHours(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Norwegian working hours: Monday-Friday, 08:00-16:00
  return day >= 1 && day <= 5 && hour >= 8 && hour <= 16;
}

export function formatNorwegianPhoneNumber(phone: string): string {
  // Norwegian phone format: +47 XXX XX XXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('47') && cleaned.length === 10) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
  }
  return phone; // Return original if can't format
}