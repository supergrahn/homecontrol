// Norwegian Weather-Aware Activity AI Service
// Integrates weather data with Norwegian friluftsliv culture and family activity suggestions

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Child } from "./children";

export type WeatherCondition = 
  | 'clear' | 'sunny' | 'partly_cloudy' | 'cloudy' 
  | 'light_rain' | 'rain' | 'heavy_rain'
  | 'light_snow' | 'snow' | 'heavy_snow'
  | 'fog' | 'windy' | 'storm';

export type NorwegianWeatherData = {
  current: {
    condition: WeatherCondition;
    temperature: number; // Celsius
    windSpeed: number; // km/h
    humidity: number; // %
    uvIndex: number;
    visibility: number; // km
  };
  forecast: {
    date: string;
    condition: WeatherCondition;
    tempHigh: number;
    tempLow: number;
    precipitationChance: number; // %
    windSpeed: number;
  }[];
  location: {
    name: string;
    lat: number;
    lng: number;
    timezone: string;
  };
  lastUpdated: string;
};

export type FriluftslivActivity = {
  id: string;
  name: string;
  description: string;
  suitableWeather: WeatherCondition[];
  temperatureRange: { min: number; max: number };
  ageGroups: { min: number; max: number }[];
  duration: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  equipment: string[];
  safetyConsiderations: string[];
  norwegianTradition: boolean;
  seasonalBest: ('vinter' | 'vår' | 'sommer' | 'høst')[];
  culturalSignificance: string;
};

export type WeatherActivityRecommendation = {
  activity: FriluftslivActivity;
  suitabilityScore: number; // 0-1
  reasoningNorwegian: string;
  adaptations: string[];
  preparationTips: string[];
  alternativeIndoor?: FriluftslivActivity;
};

// Comprehensive Norwegian outdoor activities database
const NORWEGIAN_FRILUFTSLIV_ACTIVITIES: FriluftslivActivity[] = [
  {
    id: 'skiing_family',
    name: 'Familieskitur',
    description: 'Klassisk norsk vinteraktivitet for hele familien',
    suitableWeather: ['clear', 'partly_cloudy', 'light_snow', 'snow'],
    temperatureRange: { min: -20, max: 5 },
    ageGroups: [{ min: 4, max: 80 }],
    duration: 120,
    difficulty: 'medium',
    equipment: ['ski', 'skistaver', 'vinterklær', 'matpakke', 'termos'],
    safetyConsiderations: [
      'Sjekk skiløyper og forhold',
      'Ha riktig påkledning i lag',
      'Ta med nødvendig mat og drikke',
      'Fortell andre hvor dere skal'
    ],
    norwegianTradition: true,
    seasonalBest: ['vinter'],
    culturalSignificance: 'Ski er Norges nasjonalsport og viktig del av friluftsliv-kulturen'
  },
  
  {
    id: 'forest_hike',
    name: 'Skogstur med familien',
    description: 'Utforsking av norsk natur og skog',
    suitableWeather: ['clear', 'sunny', 'partly_cloudy', 'cloudy'],
    temperatureRange: { min: 5, max: 25 },
    ageGroups: [{ min: 2, max: 80 }],
    duration: 90,
    difficulty: 'easy',
    equipment: ['gode sko', 'matpakke', 'drikkevann', 'førstehjelp'],
    safetyConsiderations: [
      'Velg stier etter barnenes alder',
      'Ha med nok mat og vann',
      'Fortell andre hvor dere er',
      'Sjekk værmelding'
    ],
    norwegianTradition: true,
    seasonalBest: ['vår', 'sommer', 'høst'],
    culturalSignificance: 'Skogstur er grunnleggende i norsk friluftsliv og naturforståelse'
  },
  
  {
    id: 'berry_picking',
    name: 'Bærplukking',
    description: 'Tradisjonell norsk sommersyssel med naturens egne gaver',
    suitableWeather: ['clear', 'sunny', 'partly_cloudy'],
    temperatureRange: { min: 10, max: 30 },
    ageGroups: [{ min: 3, max: 80 }],
    duration: 150,
    difficulty: 'easy',
    equipment: ['bærspann', 'matpakke', 'solhatt', 'myggspray'],
    safetyConsiderations: [
      'Lær barna om spiselige bær',
      'Unngå ukjente bær',
      'Ha med nok væske',
      'Pass på mygg og flått'
    ],
    norwegianTradition: true,
    seasonalBest: ['sommer'],
    culturalSignificance: 'Allemannsretten gir rett til å plukke bær, viktig norsk tradisjon'
  },
  
  {
    id: 'winter_playground',
    name: 'Vinterlek utendørs',
    description: 'Aking, snøballkrig og snømann-bygging',
    suitableWeather: ['snow', 'light_snow'],
    temperatureRange: { min: -15, max: 0 },
    ageGroups: [{ min: 2, max: 15 }],
    duration: 60,
    difficulty: 'easy',
    equipment: ['akebrett', 'vinterklær', 'votter', 'vinterstøvler'],
    safetyConsiderations: [
      'Sjekk at klærne er varme og tørre',
      'Pass på akebakken er trygg',
      'Ta pauser innendørs for oppvarming'
    ],
    norwegianTradition: true,
    seasonalBest: ['vinter'],
    culturalSignificance: 'Vinterlek lærer barn å trives i norsk vinterklima'
  },
  
  {
    id: 'cycling_tour',
    name: 'Familiesykkeltur',
    description: 'Utforske nærmiljøet på sykkel',
    suitableWeather: ['clear', 'sunny', 'partly_cloudy'],
    temperatureRange: { min: 8, max: 25 },
    ageGroups: [{ min: 5, max: 80 }],
    duration: 90,
    difficulty: 'medium',
    equipment: ['sykkel', 'hjelm', 'drikkeflaske', 'sykkelkart'],
    safetyConsiderations: [
      'Alle må bruke hjelm',
      'Sjekk syklene før tur',
      'Hold familien samlet',
      'Følg trafikkregler'
    ],
    norwegianTradition: false,
    seasonalBest: ['vår', 'sommer', 'høst'],
    culturalSignificance: 'Sykling fremmer helse og miljøvennlig transport'
  },
  
  {
    id: 'mushroom_foraging',
    name: 'Sopptur i skogen',
    description: 'Tradisjonell norsk høstaktivitet',
    suitableWeather: ['cloudy', 'light_rain'],
    temperatureRange: { min: 5, max: 15 },
    ageGroups: [{ min: 6, max: 80 }],
    duration: 120,
    difficulty: 'medium',
    equipment: ['soppsekk', 'soppkniv', 'soppbok', 'matpakke'],
    safetyConsiderations: [
      'Kun plukk sopp du er 100% sikker på',
      'Lær barna om giftige sopp',
      'Ta med ekspert eller god soppbok',
      'Respekter naturen'
    ],
    norwegianTradition: true,
    seasonalBest: ['høst'],
    culturalSignificance: 'Sopptur er del av norsk høstkultur og naturforståelse'
  },
  
  {
    id: 'beach_activities',
    name: 'Strandaktiviteter',
    description: 'Bading, sandslott og strandlek',
    suitableWeather: ['sunny', 'clear', 'partly_cloudy'],
    temperatureRange: { min: 15, max: 30 },
    ageGroups: [{ min: 1, max: 80 }],
    duration: 180,
    difficulty: 'easy',
    equipment: ['badetøy', 'håndkle', 'solkrem', 'sandleker', 'mat'],
    safetyConsiderations: [
      'Pass på sterke strømmer',
      'Bruk solkrem',
      'Hold øye med små barn',
      'Sjekk vanntemperatur'
    ],
    norwegianTradition: true,
    seasonalBest: ['sommer'],
    culturalSignificance: 'Stranddager er viktige sommerminner for norske familier'
  },
  
  {
    id: 'indoor_hygge',
    name: 'Innendørs hygge og kos',
    description: 'Koselige innendørsaktiviteter på dårlige værdager',
    suitableWeather: ['heavy_rain', 'heavy_snow', 'storm'],
    temperatureRange: { min: -30, max: 35 },
    ageGroups: [{ min: 0, max: 80 }],
    duration: 120,
    difficulty: 'easy',
    equipment: ['bøker', 'spillutstyr', 'bakeutstyr', 'varme drikker'],
    safetyConsiderations: [
      'Sørg for god ventilasjon',
      'Ha varme og lys',
      'Pass på ved baking med barn'
    ],
    norwegianTradition: true,
    seasonalBest: ['vinter', 'høst'],
    culturalSignificance: 'Hygge og kos er viktig del av norsk kultur og familieliv'
  }
];

// Weather condition descriptions in Norwegian
const WEATHER_DESCRIPTIONS_NORWEGIAN: Record<WeatherCondition, string> = {
  'clear': 'klart vær',
  'sunny': 'sol og fint vær', 
  'partly_cloudy': 'delvis skyet',
  'cloudy': 'overskyet',
  'light_rain': 'lett regn',
  'rain': 'regn',
  'heavy_rain': 'kraftig regn',
  'light_snow': 'lett snø',
  'snow': 'snø',
  'heavy_snow': 'kraftig snø',
  'fog': 'tåke',
  'windy': 'vind',
  'storm': 'storm'
};

export class NorwegianWeatherActivityService {
  private weatherCacheKey = 'norwegian_weather_cache';
  private activityPreferencesKey = 'norwegian_activity_preferences';

  // Get weather-appropriate activity recommendations
  async getWeatherBasedRecommendations(
    weatherData: NorwegianWeatherData,
    children: Child[],
    preferences: {
      preferredDifficulty?: 'easy' | 'medium' | 'hard';
      maxDuration?: number;
      traditionFocus?: boolean;
      safetyFirst?: boolean;
    } = {}
  ): Promise<WeatherActivityRecommendation[]> {
    const recommendations: WeatherActivityRecommendation[] = [];
    
    try {
      const currentSeason = this.getCurrentNorwegianSeason();
      const availableActivities = NORWEGIAN_FRILUFTSLIV_ACTIVITIES.filter(activity => 
        this.isActivitySuitableForFamily(activity, children)
      );

      for (const activity of availableActivities) {
        const suitabilityScore = this.calculateActivitySuitability(
          activity,
          weatherData.current,
          currentSeason,
          preferences
        );

        if (suitabilityScore > 0.3) { // Only recommend activities with reasonable suitability
          const reasoning = this.generateNorwegianReasoning(activity, weatherData.current, suitabilityScore);
          const adaptations = this.generateActivityAdaptations(activity, weatherData.current);
          const preparationTips = this.generatePreparationTips(activity, weatherData.current);

          recommendations.push({
            activity,
            suitabilityScore,
            reasoningNorwegian: reasoning,
            adaptations,
            preparationTips,
            alternativeIndoor: suitabilityScore < 0.6 ? this.findIndoorAlternative() : undefined
          });
        }
      }

      // Sort by suitability score
      return recommendations
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
        .slice(0, 5); // Top 5 recommendations

    } catch (error) {
      console.error('Failed to get weather-based recommendations:', error);
      return [];
    }
  }

  // Calculate how suitable an activity is for current conditions
  private calculateActivitySuitability(
    activity: FriluftslivActivity,
    currentWeather: NorwegianWeatherData['current'],
    season: string,
    preferences: any
  ): number {
    let score = 0;

    // Weather condition match (40% of score)
    if (activity.suitableWeather.includes(currentWeather.condition)) {
      score += 0.4;
    } else {
      // Penalty for unsuitable weather
      if (currentWeather.condition === 'heavy_rain' || currentWeather.condition === 'storm') {
        score -= 0.2;
      }
    }

    // Temperature suitability (25% of score)
    if (currentWeather.temperature >= activity.temperatureRange.min && 
        currentWeather.temperature <= activity.temperatureRange.max) {
      score += 0.25;
    } else {
      // Gradual penalty for temperature outside range
      const tempDiff = Math.min(
        Math.abs(currentWeather.temperature - activity.temperatureRange.min),
        Math.abs(currentWeather.temperature - activity.temperatureRange.max)
      );
      score += Math.max(0, 0.25 - (tempDiff * 0.02));
    }

    // Seasonal appropriateness (20% of score)
    if (activity.seasonalBest.includes(season as any)) {
      score += 0.2;
    } else {
      score += 0.1; // Some activities are year-round
    }

    // Norwegian tradition bonus (10% of score)
    if (activity.norwegianTradition && preferences.traditionFocus !== false) {
      score += 0.1;
    }

    // Difficulty preference match (5% of score)
    if (preferences.preferredDifficulty && activity.difficulty === preferences.preferredDifficulty) {
      score += 0.05;
    }

    // Safety considerations for bad weather
    if (preferences.safetyFirst && 
        (currentWeather.condition === 'heavy_rain' || currentWeather.condition === 'storm' || 
         currentWeather.windSpeed > 40)) {
      score *= 0.5; // Halve score for outdoor activities in dangerous weather
    }

    return Math.max(0, Math.min(1, score));
  }

  // Check if activity is suitable for family composition
  private isActivitySuitableForFamily(activity: FriluftslivActivity, children: Child[]): boolean {
    if (children.length === 0) return true;

    // Check if any age group in the activity matches the children's ages
    return activity.ageGroups.some(ageGroup => 
      children.some(child => child.age >= ageGroup.min && child.age <= ageGroup.max)
    );
  }

  // Generate Norwegian reasoning for activity recommendation
  private generateNorwegianReasoning(
    activity: FriluftslivActivity,
    weather: NorwegianWeatherData['current'],
    score: number
  ): string {
    const weatherDesc = WEATHER_DESCRIPTIONS_NORWEGIAN[weather.condition] || weather.condition;
    
    if (score > 0.8) {
      return `Perfekte forhold for ${activity.name}! Med ${weatherDesc} og ${weather.temperature}°C er dette ideelt for ${activity.description.toLowerCase()}.`;
    } else if (score > 0.6) {
      return `Gode forhold for ${activity.name}. ${weatherDesc} og ${weather.temperature}°C gjør denne aktiviteten tilrådelig.`;
    } else if (score > 0.4) {
      return `${activity.name} kan fungere med dagens ${weatherDesc}, men det krever litt ekstra forberedelser.`;
    } else {
      return `${activity.name} er mulig, men værforholdene (${weatherDesc}, ${weather.temperature}°C) er ikke ideelle.`;
    }
  }

  // Generate activity adaptations for current weather
  private generateActivityAdaptations(
    activity: FriluftslivActivity,
    weather: NorwegianWeatherData['current']
  ): string[] {
    const adaptations: string[] = [];

    // Temperature adaptations
    if (weather.temperature < 0) {
      adaptations.push('Kle dere i flere lag og ha ekstra varme klær');
      adaptations.push('Ta med varme drikker i termos');
    } else if (weather.temperature > 25) {
      adaptations.push('Bruk solkrem og ha med nok væske');
      adaptations.push('Søk skygge og ta pauser');
    }

    // Weather condition adaptations
    switch (weather.condition) {
      case 'light_rain':
        adaptations.push('Ta med regntøy - "Det finnes ikke dårlig vær, bare dårlige klær"');
        break;
      case 'rain':
      case 'heavy_rain':
        adaptations.push('Vurder å flytte aktiviteten innendørs eller utsette');
        break;
      case 'windy':
        adaptations.push('Vær ekstra forsiktig og hold familien samlet');
        break;
      case 'fog':
        adaptations.push('Hold dere på kjente stier og ha med lommelykt');
        break;
    }

    // Wind adaptations
    if (weather.windSpeed > 20) {
      adaptations.push('Vær oppmerksom på vind - kan påvirke balanse og temperatursfølelse');
    }

    return adaptations;
  }

  // Generate preparation tips
  private generatePreparationTips(
    activity: FriluftslivActivity,
    weather: NorwegianWeatherData['current']
  ): string[] {
    const tips = [...activity.safetyConsiderations];

    // Add weather-specific tips
    tips.push('Sjekk værmelding før dere drar');
    tips.push('Fortell noen hvor dere skal og når dere kommer tilbake');

    if (activity.norwegianTradition) {
      tips.push('En god mulighet til å lære barna om norske tradisjoner');
    }

    if (weather.temperature < 5) {
      tips.push('Husk: Det finnes ikke dårlig vær, bare dårlige klær');
    }

    return tips;
  }

  // Find indoor alternative for bad weather
  private findIndoorAlternative(): FriluftslivActivity | undefined {
    return NORWEGIAN_FRILUFTSLIV_ACTIVITIES.find(activity => 
      activity.id === 'indoor_hygge'
    );
  }

  // Get current Norwegian season
  private getCurrentNorwegianSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 9 && month <= 11) return 'høst';
    if (month >= 12 || month <= 2) return 'vinter';
    if (month >= 3 && month <= 5) return 'vår';
    return 'sommer';
  }

  // Cache weather data
  async cacheWeatherData(data: NorwegianWeatherData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.weatherCacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache weather data:', error);
    }
  }

  // Get cached weather data
  async getCachedWeatherData(): Promise<NorwegianWeatherData | null> {
    try {
      const cached = await AsyncStorage.getItem(this.weatherCacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Weather data is valid for 1 hour
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        await AsyncStorage.removeItem(this.weatherCacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to get cached weather data:', error);
      return null;
    }
  }

  // Get Norwegian weather wisdom
  getWeatherWisdom(): string {
    const wisdom = [
      'Det finnes ikke dårlig vær, bare dårlige klær',
      'Ute er bra, inne er godt - men ute er best',
      'Nordmenn fødes med ski på beina',
      'En dag uten frisk luft er en dag kastet bort',
      'Naturen er den beste lekeplass',
      'I Norge leker vi ute hele året',
      'Regn gjør ikke norske barn våte, det gjør dem sterke',
      'Snø er ikke kaldt, det er koselig'
    ];

    return wisdom[Math.floor(Math.random() * wisdom.length)];
  }

  // Provide weather-adapted Norwegian family advice
  async getWeatherAdaptedFamilyAdvice(
    weatherData: NorwegianWeatherData,
    children: Child[]
  ): Promise<{
    mainAdvice: string;
    culturalNote: string;
    practicalTips: string[];
    norwegianWisdom: string;
  }> {
    const currentSeason = this.getCurrentNorwegianSeason();
    const temp = weatherData.current.temperature;
    const condition = weatherData.current.condition;

    let mainAdvice = '';
    let culturalNote = '';
    const practicalTips: string[] = [];

    // Generate season and weather appropriate advice
    if (condition.includes('snow') && currentSeason === 'vinter') {
      mainAdvice = 'Perfekt snøvær for vinteraktiviteter! Nå er det tid for ekte norsk vintermoro.';
      culturalNote = 'Vinterleker er grunnleggende i norsk barndom - ski, aking og snølek bygger karakteren.';
      practicalTips.push('Sjekk at alle har varme, tørre vinterklær');
      practicalTips.push('Ta med akebrett eller ski hvis dere har');
      practicalTips.push('Husk varme drikker til etter leken');
    } else if (condition === 'sunny' && temp > 15) {
      mainAdvice = 'Flott vær for utendørsaktiviteter! Dette er dagen for friluftsliv.';
      culturalNote = 'Nordmenn utnytter hver soldag - det er vår måte å takle det mørke vinterhalvåret.';
      practicalTips.push('Bruk solkrem selv om det ikke føles så varmt');
      practicalTips.push('Ta med nok væske på turen');
      practicalTips.push('Planlegg lengre utendørsaktiviteter');
    } else if (condition.includes('rain')) {
      mainAdvice = 'Regnvær stopper ikke norske familier! Tid for regntøysaktiviteter.';
      culturalNote = 'Norske barn lærer tidlig at regn bare betyr andre typer morsomme aktiviteter.';
      practicalTips.push('Kle alle i skikkelig regntøy');
      practicalTips.push('Utforsk pøler og regnaktiviteter');
      practicalTips.push('Ha varme klær klare når dere kommer inn');
    }

    return {
      mainAdvice,
      culturalNote,
      practicalTips,
      norwegianWisdom: this.getWeatherWisdom()
    };
  }
}

// Export singleton instance
export const norwegianWeatherAI = new NorwegianWeatherActivityService();

// Utility functions for weather integration
export function isOutdoorWeather(condition: WeatherCondition): boolean {
  const outdoorConditions: WeatherCondition[] = [
    'clear', 'sunny', 'partly_cloudy', 'cloudy', 'light_rain', 'light_snow', 'snow'
  ];
  return outdoorConditions.includes(condition);
}

export function getWeatherEmoji(condition: WeatherCondition): string {
  const emojis: Record<WeatherCondition, string> = {
    'clear': '☀️',
    'sunny': '🌞',
    'partly_cloudy': '⛅',
    'cloudy': '☁️',
    'light_rain': '🌦️',
    'rain': '🌧️',
    'heavy_rain': '⛈️',
    'light_snow': '🌨️',
    'snow': '❄️',
    'heavy_snow': '🌨️',
    'fog': '🌫️',
    'windy': '💨',
    'storm': '⛈️'
  };
  
  return emojis[condition] || '🌤️';
}

export function formatTemperatureNorwegian(celsius: number): string {
  return `${celsius}°C${celsius < 0 ? ' (minusgrader)' : celsius < 5 ? ' (kaldt)' : celsius < 15 ? ' (kjølig)' : celsius < 25 ? ' (behagelig)' : ' (varmt)'}`;
}