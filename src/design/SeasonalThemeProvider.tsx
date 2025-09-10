/**
 * SeasonalThemeProvider
 * 
 * Provides Norwegian seasonal theming context with automatic season detection
 * and cultural context awareness. Integrates with the base theme system.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTheme } from './theme';
import { 
  norwegianColors, 
  norwegianSpacing, 
  norwegianRadius, 
  getNorwegianSeason,
  type NorwegianSeason,
  norwegianTimePeriods 
} from './norwegianTokens';
import {
  norwegianGreetings,
  norwegianCultural,
  norwegianEvents,
  norwegianTime,
  norwegianSchool,
  norwegianSeasonal,
  getGreetingStyle,
  getSeasonalActivityStyle,
  getSeasonalGreetingStyle,
  type NorwegianTextStyle
} from './norwegianTypography';

// Norwegian theme extension interface
export interface NorwegianTheme {
  // Current season and cultural context
  season: NorwegianSeason;
  isQuietHours: boolean;
  isWorkHours: boolean;
  isSchoolHours: boolean;
  currentHour: number;
  
  // Extended color palette
  norwegianColors: typeof norwegianColors;
  
  // Seasonal theming
  seasonal: {
    colors: typeof norwegianColors.seasonal;
    spacing: typeof norwegianSpacing;
    radius: typeof norwegianRadius.seasonal[NorwegianSeason];
    typography: typeof norwegianSeasonal[NorwegianSeason];
  };
  
  // Typography extensions
  typography: {
    greetings: typeof norwegianGreetings;
    cultural: typeof norwegianCultural;
    events: typeof norwegianEvents;
    time: typeof norwegianTime;
    school: typeof norwegianSchool;
    seasonal: typeof norwegianSeasonal;
  };
  
  // Cultural helpers
  helpers: {
    getGreetingStyle: (hour?: number) => NorwegianTextStyle;
    getSeasonalActivityStyle: (season?: NorwegianSeason) => NorwegianTextStyle;
    getSeasonalGreetingStyle: (season?: NorwegianSeason) => NorwegianTextStyle;
    getCurrentGreeting: () => string;
    getSeasonalGreeting: () => string;
    getSeasonalActivities: () => string[];
    isQuietTime: (date?: Date) => boolean;
    shouldShowCulturalNote: (context: string) => boolean;
  };
  
  // Theme utilities
  resolveSeasonalColor: (colorPath: string) => string;
  getSeasonalSpacing: (baseSpacing: number) => number;
}

// Norwegian cultural context
interface NorwegianCulturalContext {
  greetings: {
    morning: string[];
    day: string[];
    evening: string[];
    night: string[];
  };
  seasonal: {
    winter: {
      activities: string[];
      greeting: string;
      culturalNote?: string;
    };
    spring: {
      activities: string[];
      greeting: string;
      culturalNote?: string;
    };
    summer: {
      activities: string[];
      greeting: string;
      culturalNote?: string;
    };
    autumn: {
      activities: string[];
      greeting: string;
      culturalNote?: string;
    };
  };
}

const norwegianCulturalContext: NorwegianCulturalContext = {
  greetings: {
    morning: [
      'God morgen!',
      'Morgen!',
      'Ha en fin dag!',
    ],
    day: [
      'Hei!',
      'God dag!',
      'Hyggelig å se deg!',
    ],
    evening: [
      'God kveld!',
      'Kveld!',
      'Ha en fin kveld!',
    ],
    night: [
      'God natt!',
      'Sov godt!',
    ],
  },
  seasonal: {
    winter: {
      activities: [
        'Skitur i marka',
        'Kos med varm kakao',
        'Bygge snømann',
        'Hjemmelaget gløgg',
        'Vinterferie på hytta',
      ],
      greeting: 'Fin vintervær i dag!',
      culturalNote: 'Vintermørketid - perfekt for koselige hjemmeaktiviteter',
    },
    spring: {
      activities: [
        'Tur til påskefjellet',
        'Påskeegg i hagen',
        '17. mai forberedelser',
        'Rydde på hytta',
        'Planlegge sommerferie',
      ],
      greeting: 'Våren kommer!',
      culturalNote: 'Påsketid - familie og tradisjon',
    },
    summer: {
      activities: [
        'Grilling på hytta',
        'Bading i sjøen',
        'Midsommerfeiring',
        'Bærtur i skogen',
        'Campingtur',
      ],
      greeting: 'Deilig sommervær!',
      culturalNote: 'Sommerferie - tid for familieopplevelser',
    },
    autumn: {
      activities: [
        'Sopptur i skogen',
        'Høstmarka på sitt beste',
        'Forberede jul',
        'Kosekveld hjemme',
        'Skolestart forberedelser',
      ],
      greeting: 'Vakre høstfarger!',
      culturalNote: 'Skolestart - tilbake til rutinene',
    },
  },
};

const NorwegianThemeContext = createContext<NorwegianTheme | null>(null);

// Time-based calculation helpers
const calculateTimeContext = (date: Date = new Date()) => {
  const hour = date.getHours();
  
  return {
    currentHour: hour,
    isQuietHours: hour >= norwegianTimePeriods.quietHours.start || hour < norwegianTimePeriods.quietHours.end,
    isWorkHours: hour >= norwegianTimePeriods.workHours.start && hour < norwegianTimePeriods.workHours.end,
    isSchoolHours: hour >= norwegianTimePeriods.schoolHours.start && hour < norwegianTimePeriods.schoolHours.end,
  };
};

// Color resolution helper
const resolveColor = (theme: any, colorPath: string): string => {
  const paths = colorPath.split('.');
  let current = { ...theme.colors, ...norwegianColors };
  
  for (const path of paths) {
    current = current[path];
    if (!current) break;
  }
  
  return typeof current === 'string' ? current : '#000000';
};

export interface SeasonalThemeProviderProps {
  children: ReactNode;
  forceSeason?: NorwegianSeason;
  forceTime?: Date;
}

export function SeasonalThemeProvider({ 
  children, 
  forceSeason,
  forceTime 
}: SeasonalThemeProviderProps) {
  const baseTheme = useTheme();
  const [currentTime, setCurrentTime] = useState(forceTime || new Date());
  const [season, setSeason] = useState<NorwegianSeason>(
    forceSeason || getNorwegianSeason(currentTime)
  );

  // Update time every minute if not forced
  useEffect(() => {
    if (forceTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setSeason(forceSeason || getNorwegianSeason(now));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [forceSeason, forceTime]);

  // Calculate time context
  const timeContext = calculateTimeContext(currentTime);

  // Create Norwegian theme extension
  const norwegianTheme: NorwegianTheme = {
    season,
    ...timeContext,
    
    norwegianColors,
    
    seasonal: {
      colors: norwegianColors.seasonal,
      spacing: norwegianSpacing,
      radius: norwegianRadius.seasonal[season],
      typography: norwegianSeasonal[season],
    },
    
    typography: {
      greetings: norwegianGreetings,
      cultural: norwegianCultural,
      events: norwegianEvents,
      time: norwegianTime,
      school: norwegianSchool,
      seasonal: norwegianSeasonal,
    },
    
    helpers: {
      getGreetingStyle: (hour = timeContext.currentHour) => getGreetingStyle(hour),
      
      getSeasonalActivityStyle: (targetSeason = season) => getSeasonalActivityStyle(targetSeason),
      
      getSeasonalGreetingStyle: (targetSeason = season) => getSeasonalGreetingStyle(targetSeason),
      
      getCurrentGreeting: () => {
        const { currentHour } = timeContext;
        const greetings = norwegianCulturalContext.greetings;
        
        if (currentHour >= 6 && currentHour < 10) {
          return greetings.morning[Math.floor(Math.random() * greetings.morning.length)];
        }
        if (currentHour >= 10 && currentHour < 17) {
          return greetings.day[Math.floor(Math.random() * greetings.day.length)];
        }
        if (currentHour >= 17 && currentHour < 20) {
          return greetings.evening[Math.floor(Math.random() * greetings.evening.length)];
        }
        return greetings.night[Math.floor(Math.random() * greetings.night.length)];
      },
      
      getSeasonalGreeting: () => {
        return norwegianCulturalContext.seasonal[season].greeting;
      },
      
      getSeasonalActivities: () => {
        return norwegianCulturalContext.seasonal[season].activities;
      },
      
      isQuietTime: (date = currentTime) => {
        const hour = date.getHours();
        return hour >= norwegianTimePeriods.quietHours.start || hour < norwegianTimePeriods.quietHours.end;
      },
      
      shouldShowCulturalNote: (context: string) => {
        // Show cultural notes during specific contexts
        if (context === 'invitation' && timeContext.isQuietHours) return true;
        if (context === 'school' && timeContext.isSchoolHours) return true;
        if (context === 'seasonal') return true;
        return false;
      },
    },
    
    resolveSeasonalColor: (colorPath: string) => resolveColor(baseTheme, colorPath),
    
    getSeasonalSpacing: (baseSpacing: number) => {
      const multiplier = norwegianSpacing.seasonal[season];
      return Math.round(baseSpacing * multiplier);
    },
  };

  return (
    <NorwegianThemeContext.Provider value={norwegianTheme}>
      {children}
    </NorwegianThemeContext.Provider>
  );
}

// Hook to use Norwegian theme
export function useNorwegianTheme(): NorwegianTheme {
  const context = useContext(NorwegianThemeContext);
  
  if (!context) {
    throw new Error('useNorwegianTheme must be used within a SeasonalThemeProvider');
  }
  
  return context;
}

// Helper hook for common Norwegian theme operations
export function useNorwegianGreeting() {
  const theme = useNorwegianTheme();
  
  return {
    greeting: theme.helpers.getCurrentGreeting(),
    seasonalGreeting: theme.helpers.getSeasonalGreeting(),
    greetingStyle: theme.helpers.getGreetingStyle(),
    shouldShowQuietHours: theme.isQuietHours,
  };
}

// Helper hook for seasonal activities
export function useSeasonalActivities() {
  const theme = useNorwegianTheme();
  
  return {
    activities: theme.helpers.getSeasonalActivities(),
    season: theme.season,
    activityStyle: theme.helpers.getSeasonalActivityStyle(),
    culturalNote: norwegianCulturalContext.seasonal[theme.season].culturalNote,
  };
}

// Helper hook for school context
export function useSchoolContext() {
  const theme = useNorwegianTheme();
  
  return {
    isSchoolHours: theme.isSchoolHours,
    schoolColors: theme.norwegianColors.school,
    schoolTypography: theme.typography.school,
    shouldShowSchoolNote: theme.helpers.shouldShowCulturalNote('school'),
  };
}