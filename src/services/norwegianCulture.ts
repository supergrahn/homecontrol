// Cultural Configuration Framework
// Scalable architecture for international cultural adaptation with Norwegian excellence as the default
// This service maintains 100% Norwegian functionality while enabling expansion to other cultures
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Child } from "./children";

export type LanguageLevel = "native" | "advanced" | "intermediate" | "beginner";
export type SupportedCulture = "norwegian" | "swedish" | "danish" | "german" | "american";

export type CulturalPreferences = {
  culture: SupportedCulture;
  preferNativeLanguage: boolean;
  useLocalTimeFormat: boolean; // 24-hour format for Norway/Europe, 12-hour for US
  observeLocalHolidays: boolean;
  includeOutdoorActivities: boolean; // Friluftsliv for Norway, hiking for US, etc.
  useLocalGradingSystem: boolean; // 1-6 scale for Norway, A-F for US
  respectQuietHours: boolean; // Cultural quiet hours vary by country
  includeLocalTraditions: boolean;
  dialectSupport?: string; // "bokmål"|"nynorsk" for Norwegian, etc.
  regionSpecifics?: {
    region: string; // kommune for Norway, state for US, etc.
    subRegion: string; // fylke for Norway, county for US, etc.
    customTraditions: string[];
  };
};

// Backwards compatibility type alias
export type NorwegianCulturalPreferences = CulturalPreferences;

export type LanguageSupport = {
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

export type CulturalContext = {
  seasonalActivities: Record<"vinter" | "vår" | "sommer" | "høst", string[]>;
  importantDates: { date: string; name: string; description: string }[];
  familyValues: string[];
  parentingApproach: string[];
  workLifeBalance: string[];
  outdoorCulture: string[];
};

// Cultural configuration interfaces
export interface CulturalConfiguration {
  culture: SupportedCulture;
  languagePack: LanguageSupport;
  culturalContext: CulturalContext;
  timeConfiguration: {
    quietHours: { start: number; end: number };
    workHours: { start: number; end: number };
    schoolHours: { start: number; end: number };
    timeFormat: '12h' | '24h';
  };
  seasonalConfiguration: {
    seasons: Record<string, string[]>; // activities by season
  };
  schoolConfiguration: {
    gradingSystem: 'norwegian' | 'american' | 'german';
    afterSchoolPrograms: string[];
  };
}

// Norwegian configuration (default/template)
const NORWEGIAN_LANGUAGE_PACK: LanguageSupport = {
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

const NORWEGIAN_CULTURAL_CONTEXT: CulturalContext = {
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

// Complete Norwegian cultural configuration
const NORWEGIAN_CONFIGURATION: CulturalConfiguration = {
  culture: 'norwegian',
  languagePack: NORWEGIAN_LANGUAGE_PACK,
  culturalContext: NORWEGIAN_CULTURAL_CONTEXT,
  timeConfiguration: {
    quietHours: { start: 20, end: 7 },
    workHours: { start: 8, end: 16 },
    schoolHours: { start: 8, end: 14 },
    timeFormat: '24h',
  },
  seasonalConfiguration: {
    seasons: NORWEGIAN_CULTURAL_CONTEXT.seasonalActivities,
  },
  schoolConfiguration: {
    gradingSystem: 'norwegian',
    afterSchoolPrograms: ['SFO', 'AKS'],
  },
};

// Cultural configuration registry
const CULTURAL_CONFIGURATIONS: Record<SupportedCulture, CulturalConfiguration> = {
  norwegian: NORWEGIAN_CONFIGURATION,
  // Placeholder configurations for future expansion
  swedish: NORWEGIAN_CONFIGURATION, // Will be replaced with Swedish-specific config
  danish: NORWEGIAN_CONFIGURATION, // Will be replaced with Danish-specific config
  german: NORWEGIAN_CONFIGURATION, // Will be replaced with German-specific config
  american: NORWEGIAN_CONFIGURATION, // Will be replaced with American-specific config
};

export class CulturalAdaptationService {
  private preferencesKey = "cultural_preferences";
  private languageLevelKey = "language_level";
  private cachedPreferences: CulturalPreferences | null = null;
  private currentConfiguration: CulturalConfiguration;

  constructor(culture: SupportedCulture = 'norwegian') {
    this.currentConfiguration = CULTURAL_CONFIGURATIONS[culture];
  }

  private getDefaultPreferences(): CulturalPreferences {
    return {
      culture: this.currentConfiguration.culture,
      preferNativeLanguage: true,
      useLocalTimeFormat: true,
      observeLocalHolidays: true,
      includeOutdoorActivities: true,
      useLocalGradingSystem: true,
      respectQuietHours: true,
      includeLocalTraditions: true,
      dialectSupport: this.currentConfiguration.culture === 'norwegian' ? "bokmål" : undefined
    };
  }

  // Get current cultural preferences
  async getCulturalPreferences(): Promise<CulturalPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.preferencesKey);
      if (stored) {
        const parsed: CulturalPreferences = JSON.parse(stored);
        // Ensure culture is set and valid
        if (!parsed.culture || !CULTURAL_CONFIGURATIONS[parsed.culture]) {
          parsed.culture = 'norwegian'; // Default to Norwegian
        }
        // Update configuration if culture changed
        if (parsed.culture !== this.currentConfiguration.culture) {
          this.currentConfiguration = CULTURAL_CONFIGURATIONS[parsed.culture];
        }
        this.cachedPreferences = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to get cultural preferences:", error);
    }

    // Default preferences for current culture
    const defaults = this.getDefaultPreferences();
    this.cachedPreferences = defaults;
    return defaults;
  }

  // Synchronous accessor using cache or defaults
  getCulturalPreferencesSync(): CulturalPreferences {
    return this.cachedPreferences ?? this.getDefaultPreferences();
  }

  // Get current cultural configuration
  getCurrentConfiguration(): CulturalConfiguration {
    return this.currentConfiguration;
  }

  // Switch culture (for future multi-market support)
  async switchCulture(culture: SupportedCulture): Promise<void> {
    this.currentConfiguration = CULTURAL_CONFIGURATIONS[culture];
    const currentPrefs = this.getCulturalPreferencesSync();
    await this.updateCulturalPreferences({ ...currentPrefs, culture });
  }

  // Update cultural preferences
  async updateCulturalPreferences(preferences: Partial<CulturalPreferences>): Promise<void> {
    try {
      const current = await this.getCulturalPreferences();
      const updated = { ...current, ...preferences };
      // Update configuration if culture changed
      if (updated.culture && updated.culture !== this.currentConfiguration.culture) {
        this.currentConfiguration = CULTURAL_CONFIGURATIONS[updated.culture];
      }
      await AsyncStorage.setItem(this.preferencesKey, JSON.stringify(updated));
      this.cachedPreferences = updated;
    } catch (error) {
      console.error("Failed to update cultural preferences:", error);
    }
  }

  // Translate text using current cultural configuration
  translateText(englishText: string, category?: "task" | "notification" | "time" | "family" | "school"): string {
    const preferences = this.getCulturalPreferencesSync();
    
    // If native language is not preferred, return original
    if (!preferences || !preferences.preferNativeLanguage) {
      return englishText;
    }

    let translationSource: Record<string, string>;
    const languagePack = this.currentConfiguration.languagePack;
    
    switch (category) {
      case "task":
        translationSource = languagePack.taskTitles;
        break;
      case "notification":
        translationSource = languagePack.notifications;
        break;
      case "time":
        translationSource = languagePack.timeExpressions;
        break;
      case "family":
        translationSource = languagePack.familyTerms;
        break;
      case "school":
        translationSource = languagePack.schoolTerms;
        break;
      default:
        // Try all categories
        const allTranslations = {
          ...languagePack.taskTitles,
          ...languagePack.notifications,
          ...languagePack.timeExpressions,
          ...languagePack.familyTerms,
          ...languagePack.schoolTerms
        };
        translationSource = allTranslations;
    }

    return translationSource[englishText] || englishText;
  }

  // Format time in cultural style
  formatLocalTime(date: Date, preferences?: CulturalPreferences): string {
    const prefs = preferences || this.getCulturalPreferencesSync();
    const config = this.currentConfiguration;
    
    if (prefs.useLocalTimeFormat) {
      const locale = this.getCultureLocale(config.culture);
      const use24Hour = config.timeConfiguration.timeFormat === '24h';
      return date.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: !use24Hour 
      });
    }
    
    return date.toLocaleTimeString('en-US');
  }

  // Backwards compatibility
  formatNorwegianTime(date: Date, preferences?: CulturalPreferences): string {
    return this.formatLocalTime(date, preferences);
  }

  // Format date in cultural style
  formatLocalDate(date: Date, includeWeekday: boolean = true): string {
    const config = this.currentConfiguration;
    const locale = this.getCultureLocale(config.culture);
    
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    
    if (includeWeekday) {
      options.weekday = 'long';
    }
    
    return date.toLocaleDateString(locale, options);
  }

  // Backwards compatibility
  formatNorwegianDate(date: Date, includeWeekday: boolean = true): string {
    return this.formatLocalDate(date, includeWeekday);
  }

  // Get culturally appropriate greeting
  getLocalGreeting(timeOfDay: "morning" | "afternoon" | "evening" | "motivational"): string {
    const greetings = this.currentConfiguration.languagePack.greetings[timeOfDay];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Backwards compatibility
  getNorwegianGreeting(timeOfDay: "morning" | "afternoon" | "evening" | "motivational"): string {
    return this.getLocalGreeting(timeOfDay);
  }

  // Get seasonal activities suggestions
  getSeasonalActivities(season?: string): string[] {
    const config = this.currentConfiguration;
    const currentSeason = season || this.getCurrentSeason();
    const activities = config.seasonalConfiguration.seasons[currentSeason];
    return activities || [];
  }

  // Check if current time respects cultural quiet hours
  isWithinQuietHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const config = this.currentConfiguration;
    
    return hour >= config.timeConfiguration.quietHours.start || hour < config.timeConfiguration.quietHours.end;
  }

  // Check if current time is during typical outdoor activity hours (cultural equivalent of friluftsliv)
  isWithinOutdoorActivityHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Weekend daytime (10:00-16:00) is typical outdoor family time across Nordic cultures
    return isWeekend && hour >= 10 && hour <= 16;
  }

  // Backwards compatibility
  isWithinFriluftsliv(): boolean {
    return this.isWithinOutdoorActivityHours();
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
    
    if (this.isWithinOutdoorActivityHours()) {
      // Short delay during outdoor activity time (30 minutes)
      return 30 * 60 * 1000;
    }
    
    return 0; // No delay
  }

  // Get culturally appropriate notification channel
  getNotificationChannel(): string {
    if (this.isWithinQuietHours()) {
      return "silent";
    }
    
    if (this.isWithinOutdoorActivityHours()) {
      return "outdoor_activity";
    }
    
    return "default";
  }

  // Adapt task scheduling for current culture
  adaptTaskForCulture(taskTitle: string, child: Child): {
    title: string;
    suggestions: string[];
    culturalNotes: string[];
  } {
    const localTitle = this.translateText(taskTitle, "task");
    const suggestions: string[] = [];
    const culturalNotes: string[] = [];
    const config = this.currentConfiguration;

    // Add culture-specific suggestions based on task type
    if (taskTitle.toLowerCase().includes("outdoor") || taskTitle.toLowerCase().includes("outside")) {
      if (config.culture === 'norwegian') {
        suggestions.push("Husk på allemannsretten når dere er ute");
        suggestions.push("Ta med ryggsekk og drikke");
        culturalNotes.push("Friluftsliv er viktig i norsk kultur");
      } else {
        suggestions.push("Remember to bring water and snacks");
        suggestions.push("Check the weather before heading out");
        culturalNotes.push("Outdoor activities are important for family bonding");
      }
    }

    if (taskTitle.toLowerCase().includes("homework") || taskTitle.toLowerCase().includes("lekser")) {
      if (config.culture === 'norwegian') {
        suggestions.push("Sett av rolig tid til lekselesing");
        suggestions.push("Ha alt utstyr klart på forhånd");
        culturalNotes.push("Norske lærere setter pris på selvstendige elever");
      } else {
        suggestions.push("Set aside quiet time for homework");
        suggestions.push("Have all supplies ready beforehand");
        culturalNotes.push("Teachers appreciate independent students");
      }
    }

    if (taskTitle.toLowerCase().includes("meal") || taskTitle.toLowerCase().includes("middag")) {
      if (config.culture === 'norwegian') {
        suggestions.push("Kanskje prøve en tradisjonell norsk rett?");
        suggestions.push("Spise sammen som familie");
        culturalNotes.push("Familemåltider er viktige i Norge");
      } else {
        suggestions.push("Try a traditional local dish");
        suggestions.push("Eat together as a family");
        culturalNotes.push("Family meals are important for bonding");
      }
    }

    return {
      title: localTitle,
      suggestions,
      culturalNotes
    };
  }

  // Backwards compatibility
  adaptTaskForNorwegianCulture(taskTitle: string, child: Child): {
    title: string;
    suggestions: string[];
    culturalNotes: string[];
  } {
    return this.adaptTaskForCulture(taskTitle, child);
  }

  // Get cultural parenting wisdom
  getParentingTip(): string {
    const config = this.currentConfiguration;
    const approaches = config.culturalContext.parentingApproach;
    return approaches[Math.floor(Math.random() * approaches.length)];
  }

  // Backwards compatibility
  getNorwegianParentingTip(): string {
    return this.getParentingTip();
  }

  // Get cultural family values for the day
  getDailyFamilyValue(): { value: string; description: string } {
    const config = this.currentConfiguration;
    const values = config.culturalContext.familyValues;
    const approaches = config.culturalContext.parentingApproach;
    
    const value = values[Math.floor(Math.random() * values.length)];
    const approach = approaches[Math.floor(Math.random() * approaches.length)];
    
    if (config.culture === 'norwegian') {
      return {
        value,
        description: `I dag kan dere fokusere på: ${approach}`
      };
    } else {
      return {
        value,
        description: `Today you can focus on: ${approach}`
      };
    }
  }

  // Backwards compatibility
  getDailyNorwegianValue(): { value: string; description: string } {
    return this.getDailyFamilyValue();
  }

  // Assess local language proficiency
  async assessLanguageLevel(child: Child): Promise<LanguageLevel> {
    // This would analyze the child's school grade and language usage
    // For now, make educated guess based on grade
    if (!child.currentGrade) return "beginner";
    
    if (child.currentGrade <= 2) return "beginner";
    if (child.currentGrade <= 5) return "intermediate"; 
    if (child.currentGrade <= 8) return "advanced";
    return "native";
  }

  // Generate cultural context for notifications
  generateCulturalNotificationContext(type: "task" | "school" | "family" | "seasonal"): string {
    const config = this.currentConfiguration;
    
    if (config.culture === 'norwegian') {
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
    } else {
      // Generic English context for other cultures (to be replaced with specific cultural contexts)
      const contexts = {
        task: [
          "Remember our family values",
          "Take your time", 
          "Ask for help if you need it",
          "Great job so far!"
        ],
        school: [
          "Have a great day at school!",
          "Don't forget your lunch and supplies",
          "Enjoy time with your friends",
          "Learn something new and exciting!"
        ],
        family: [
          "Family time is special time",
          "You're a great team together",
          "Enjoy yourselves and have fun",
          "Take care of each other"
        ],
        seasonal: this.getSeasonalMessage()
      };
      
      const options = contexts[type];
      return Array.isArray(options) ? 
        options[Math.floor(Math.random() * options.length)] :
        options;
    }
  }

  // Helper functions
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    const config = this.currentConfiguration;
    
    if (config.culture === 'norwegian') {
      if (month >= 12 || month <= 2) return "vinter";
      if (month >= 3 && month <= 5) return "vår";
      if (month >= 6 && month <= 8) return "sommer";
      return "høst";
    } else {
      // Generic season names for other cultures
      if (month >= 12 || month <= 2) return "winter";
      if (month >= 3 && month <= 5) return "spring";
      if (month >= 6 && month <= 8) return "summer";
      return "autumn";
    }
  }

  // Backwards compatibility
  private getCurrentNorwegianSeason(): "vinter" | "vår" | "sommer" | "høst" {
    return this.getCurrentSeason() as "vinter" | "vår" | "sommer" | "høst";
  }

  private getSeasonalMessage(): string {
    const season = this.getCurrentSeason();
    const config = this.currentConfiguration;
    
    if (config.culture === 'norwegian') {
      const messages: Record<string, string> = {
        vinter: "Nyt vintermørket og kos deg inne",
        vår: "Våren kommer - tid for nye begynnelser",
        sommer: "Sommerferien er tid for frihet og opplevelser", 
        høst: "Høsten er tid for forberedelser og mys"
      };
      return messages[season] || "Nyt tiden sammen";
    } else {
      const messages: Record<string, string> = {
        winter: "Enjoy the cozy indoor time",
        spring: "Spring is coming - time for new beginnings",
        summer: "Summer is time for freedom and experiences", 
        autumn: "Autumn is time for preparation and coziness"
      };
      return messages[season] || "Enjoy the time together";
    }
  }

  // Get culture-specific locale for formatting
  private getCultureLocale(culture: SupportedCulture): string {
    const locales: Record<SupportedCulture, string> = {
      norwegian: 'nb-NO',
      swedish: 'sv-SE',
      danish: 'da-DK',
      german: 'de-DE',
      american: 'en-US',
    };
    return locales[culture] || 'en-US';
  }
}

// Export singleton instance with Norwegian as default culture
export const culturalService = new CulturalAdaptationService('norwegian');

// Backwards compatibility export
export const norwegianCulture = culturalService;

// Utility functions - Cultural adaptation layer with Norwegian as default
export function getCulturalWeekday(date: Date, short: boolean = false, culture: SupportedCulture = 'norwegian'): string {
  const config = CULTURAL_CONFIGURATIONS[culture];
  const weekdays = short ? 
    config.languagePack.weekdayShort :
    ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"]; // Norwegian default
  
  return weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Adjust for week start
}

export function getCulturalMonth(date: Date, culture: SupportedCulture = 'norwegian'): string {
  const config = CULTURAL_CONFIGURATIONS[culture];
  return config.languagePack.monthNames[date.getMonth()];
}

export function isCulturalWorkingHours(date: Date, culture: SupportedCulture = 'norwegian'): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  const config = CULTURAL_CONFIGURATIONS[culture];
  
  return day >= 1 && day <= 5 && 
         hour >= config.timeConfiguration.workHours.start && 
         hour <= config.timeConfiguration.workHours.end;
}

export function formatCulturalPhoneNumber(phone: string, culture: SupportedCulture = 'norwegian'): string {
  if (culture === 'norwegian') {
    // Norwegian phone format: +47 XXX XX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('47') && cleaned.length === 10) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    }
  }
  // Add other cultural phone formats here in the future
  return phone; // Return original if can't format
}

// Backwards compatibility functions
export function getNorwegianWeekday(date: Date, short: boolean = false): string {
  return getCulturalWeekday(date, short, 'norwegian');
}

export function getNorwegianMonth(date: Date): string {
  return getCulturalMonth(date, 'norwegian');
}

export function isNorwegianWorkingHours(date: Date): boolean {
  return isCulturalWorkingHours(date, 'norwegian');
}

export function formatNorwegianPhoneNumber(phone: string): string {
  return formatCulturalPhoneNumber(phone, 'norwegian');
}