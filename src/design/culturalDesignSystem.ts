/**
 * Cultural Design System
 * 
 * Scalable design tokens that adapt to different cultural contexts while maintaining
 * Norwegian excellence as the default. This system enables authentic local experiences
 * in each market rather than generic international design.
 */

import { SupportedCulture } from '../services/norwegianCulture';

// Base color palette that works across cultures
export const baseColors = {
  // Neutral colors - universal
  neutral: {
    white: "#FFFFFF",
    black: "#000000",
    gray50: "#F9FAFB",
    gray100: "#F3F4F6",
    gray200: "#E5E7EB",
    gray300: "#D1D5DB",
    gray400: "#9CA3AF",
    gray500: "#6B7280",
    gray600: "#4B5563",
    gray700: "#374151",
    gray800: "#1F2937",
    gray900: "#111827",
  },
  
  // Semantic colors - culturally adaptable
  semantic: {
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
} as const;

// Cultural color schemes
export interface CulturalColors {
  // Primary brand colors inspired by cultural elements
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string; // Primary brand color
    600: string;
    700: string;
    800: string;
    900: string;
  };
  
  // Secondary accent colors
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string; // Secondary accent
    600: string;
    700: string;
    800: string;
    900: string;
  };
  
  // Seasonal palette
  seasonal: {
    season1: string; // Winter/Cold season
    season2: string; // Spring/Growing season  
    season3: string; // Summer/Warm season
    season4: string; // Autumn/Harvest season
  };
  
  // Cultural context colors
  cultural: {
    heritage: string;    // Cultural heritage color (flag, tradition)
    celebration: string; // Celebration and joy
    wisdom: string;      // Education and wisdom
    nature: string;      // Connection to nature/outdoors
    family: string;      // Family and community
  };
  
  // Functional colors that vary by culture
  functional: {
    school: string;      // School-related features
    afterSchool: string; // After-school programs
    health: string;      // Health and wellness
    community: string;   // Community features
  };
}

// Norwegian color scheme (default)
export const norwegianColors: CulturalColors = {
  primary: {
    50: "#F0F8FF",
    100: "#E6F3FF",
    200: "#BFE4FF", 
    300: "#80CCFF",
    400: "#4DA8FF",
    500: "#1E7ADB", // Fjord blue
    600: "#1A65B8",
    700: "#144F96",
    800: "#0F3B73",
    900: "#0A2B54",
  },
  
  secondary: {
    50: "#F0FDF8",
    100: "#E6FFED",
    200: "#CCFFD9",
    300: "#99FFB8",
    400: "#4DFF85", // Aurora green
    500: "#1EDB5A",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  
  seasonal: {
    season1: "#E8F4F8", // Winter blue
    season2: "#C8E6C9", // Spring green
    season3: "#FFF59D", // Summer yellow
    season4: "#FFB74D", // Autumn orange
  },
  
  cultural: {
    heritage: "#EF2B2D",  // Norwegian flag red
    celebration: "#FFC107", // Festive gold
    wisdom: "#002868",     // Norwegian flag blue
    nature: "#228B22",     // Forest green
    family: "#8B4513",     // Cabin brown
  },
  
  functional: {
    school: "#DC2626",     // School red
    afterSchool: "#2563EB", // SFO blue
    health: "#059669",     // Health green
    community: "#7C3AED",  // Community purple
  },
};

// Placeholder color schemes for other cultures (to be replaced with authentic cultural research)
export const swedishColors: CulturalColors = {
  ...norwegianColors, // Temporary - would be replaced with Swedish cultural colors
  cultural: {
    heritage: "#006AA7",  // Swedish blue
    celebration: "#FFCD00", // Swedish yellow
    wisdom: "#006AA7",
    nature: "#228B22",
    family: "#8B4513",
  },
};

export const danishColors: CulturalColors = {
  ...norwegianColors, // Temporary - would be replaced with Danish cultural colors
  cultural: {
    heritage: "#C8102E",  // Dannebrog red
    celebration: "#FFFFFF", // Dannebrog white
    wisdom: "#C8102E",
    nature: "#228B22", 
    family: "#8B4513",
  },
};

export const germanColors: CulturalColors = {
  ...norwegianColors, // Temporary - would be replaced with German cultural colors
  cultural: {
    heritage: "#000000",  // German black
    celebration: "#DD0000", // German red
    wisdom: "#FFCC00",    // German yellow
    nature: "#228B22",
    family: "#8B4513",
  },
};

export const americanColors: CulturalColors = {
  ...norwegianColors, // Temporary - would be replaced with American cultural colors
  cultural: {
    heritage: "#B22234",  // American red
    celebration: "#FFFFFF", // American white
    wisdom: "#3C3B6E",    // American blue
    nature: "#228B22",
    family: "#8B4513",
  },
};

// Cultural color registry
export const culturalColorSchemes: Record<SupportedCulture, CulturalColors> = {
  norwegian: norwegianColors,
  swedish: swedishColors,
  danish: danishColors,
  german: germanColors,
  american: americanColors,
};

// Cultural typography configurations
export interface CulturalTypography {
  // Font families that work well with the culture
  fontFamilies: {
    primary: string;   // Main UI font
    secondary: string; // Accent/display font
    mono: string;      // Monospace font
  };
  
  // Typography scales
  scales: {
    // Greeting styles for cultural greetings
    greeting: {
      size: number;
      lineHeight: number;
      weight: string;
    };
    
    // Cultural context text
    cultural: {
      size: number;
      lineHeight: number;
      weight: string;
      style?: string;
    };
    
    // Time/date formatting
    temporal: {
      size: number;
      lineHeight: number;
      weight: string;
      variant?: string[];
    };
    
    // Educational context
    educational: {
      size: number;
      lineHeight: number;
      weight: string;
    };
    
    // Family/community context
    community: {
      size: number;
      lineHeight: number;
      weight: string;
    };
  };
}

export const norwegianTypography: CulturalTypography = {
  fontFamilies: {
    primary: 'System', // Would use Norwegian-friendly fonts
    secondary: 'System',
    mono: 'Menlo',
  },
  
  scales: {
    greeting: {
      size: 20,
      lineHeight: 28,
      weight: "600",
    },
    
    cultural: {
      size: 14,
      lineHeight: 20,
      weight: "500",
      style: "italic",
    },
    
    temporal: {
      size: 16,
      lineHeight: 24,
      weight: "600",
      variant: ["tabular-nums"],
    },
    
    educational: {
      size: 13,
      lineHeight: 18,
      weight: "600",
    },
    
    community: {
      size: 15,
      lineHeight: 22,
      weight: "500",
    },
  },
};

// Cultural spacing configurations
export interface CulturalSpacing {
  // Base spacing units
  base: number[];
  
  // Context-specific spacing multipliers
  contexts: {
    cozy: number;    // Family/home contexts
    formal: number;  // School/official contexts
    festive: number; // Celebration contexts
  };
  
  // Seasonal adjustments
  seasonal: {
    winter: number;
    spring: number;
    summer: number;
    autumn: number;
  };
}

export const norwegianSpacing: CulturalSpacing = {
  base: [0, 2, 6, 10, 14, 18, 22, 28, 36, 48, 64],
  
  contexts: {
    cozy: 1.0,    // Standard for Norwegian hygge
    formal: 1.2,  // Slightly more formal
    festive: 0.9, // Slightly more compact for celebrations
  },
  
  seasonal: {
    winter: 1.1, // More spacious in dark season
    spring: 1.0, // Standard
    summer: 0.9, // More compact for active season
    autumn: 1.0, // Standard
  },
};

// Cultural border radius configurations
export interface CulturalRadius {
  base: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  
  contexts: {
    cozy: { sm: number; md: number; lg: number; xl: number };
    formal: { sm: number; md: number; lg: number; xl: number };
  };
  
  seasonal: {
    winter: { sm: number; md: number; lg: number; xl: number };
    spring: { sm: number; md: number; lg: number; xl: number };
    summer: { sm: number; md: number; lg: number; xl: number };
    autumn: { sm: number; md: number; lg: number; xl: number };
  };
}

export const norwegianRadius: CulturalRadius = {
  base: { sm: 4, md: 8, lg: 12, xl: 16 },
  
  contexts: {
    cozy: { sm: 8, md: 12, lg: 16, xl: 20 }, // Softer for home
    formal: { sm: 4, md: 8, lg: 12, xl: 16 }, // Standard for school
  },
  
  seasonal: {
    winter: { sm: 6, md: 10, lg: 14, xl: 18 }, // Softer in winter
    spring: { sm: 6, md: 12, lg: 18, xl: 24 }, // Fresh and modern
    summer: { sm: 8, md: 16, lg: 24, xl: 32 }, // More rounded in summer
    autumn: { sm: 4, md: 8, lg: 12, xl: 16 },  // More structured
  },
};

// Cultural time configurations
export interface CulturalTime {
  quietHours: { start: number; end: number };
  workHours: { start: number; end: number };
  schoolHours: { start: number; end: number };
  familyHours: { start: number; end: number }; // Prime family time
  timeFormat: '12h' | '24h';
}

export const norwegianTime: CulturalTime = {
  quietHours: { start: 20, end: 7 },   // 20:00-07:00
  workHours: { start: 8, end: 16 },    // 08:00-16:00
  schoolHours: { start: 8, end: 14 },  // 08:00-14:00
  familyHours: { start: 16, end: 20 }, // 16:00-20:00 after school/work
  timeFormat: '24h',
};

// Complete cultural design configuration
export interface CulturalDesignConfig {
  culture: SupportedCulture;
  colors: CulturalColors;
  typography: CulturalTypography;
  spacing: CulturalSpacing;
  radius: CulturalRadius;
  time: CulturalTime;
}

// Cultural design registry
export const culturalDesignConfigurations: Record<SupportedCulture, CulturalDesignConfig> = {
  norwegian: {
    culture: 'norwegian',
    colors: norwegianColors,
    typography: norwegianTypography,
    spacing: norwegianSpacing,
    radius: norwegianRadius,
    time: norwegianTime,
  },
  
  // Placeholder configurations - would be developed with native cultural experts
  swedish: {
    culture: 'swedish',
    colors: swedishColors,
    typography: norwegianTypography, // Temporary
    spacing: norwegianSpacing,       // Temporary
    radius: norwegianRadius,         // Temporary
    time: norwegianTime,             // Temporary
  },
  
  danish: {
    culture: 'danish',
    colors: danishColors,
    typography: norwegianTypography, // Temporary
    spacing: norwegianSpacing,       // Temporary
    radius: norwegianRadius,         // Temporary
    time: norwegianTime,             // Temporary
  },
  
  german: {
    culture: 'german',
    colors: germanColors,
    typography: norwegianTypography, // Temporary
    spacing: norwegianSpacing,       // Temporary
    radius: norwegianRadius,         // Temporary
    time: { ...norwegianTime, timeFormat: '24h' as const }, // Germans also use 24h
  },
  
  american: {
    culture: 'american',
    colors: americanColors,
    typography: norwegianTypography, // Temporary
    spacing: norwegianSpacing,       // Temporary
    radius: norwegianRadius,         // Temporary
    time: { 
      ...norwegianTime, 
      timeFormat: '12h' as const,    // Americans use 12h format
      workHours: { start: 9, end: 17 }, // Different work hours
      schoolHours: { start: 8, end: 15 }, // Different school hours
    },
  },
};

// Season detection helper (works across cultures)
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export const getCurrentSeason = (date: Date = new Date()): Season => {
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
};

// Cultural design service class
export class CulturalDesignService {
  private currentConfig: CulturalDesignConfig;
  
  constructor(culture: SupportedCulture = 'norwegian') {
    this.currentConfig = culturalDesignConfigurations[culture];
  }
  
  // Switch cultural design
  setCulture(culture: SupportedCulture): void {
    this.currentConfig = culturalDesignConfigurations[culture];
  }
  
  // Get current configuration
  getConfig(): CulturalDesignConfig {
    return this.currentConfig;
  }
  
  // Get colors for current culture
  getColors(): CulturalColors {
    return this.currentConfig.colors;
  }
  
  // Get seasonal colors
  getSeasonalColors(season?: Season): {
    primary: string;
    seasonal: string;
    cultural: string;
  } {
    const currentSeason = season || getCurrentSeason();
    const colors = this.currentConfig.colors;
    
    return {
      primary: colors.primary[500],
      seasonal: colors.seasonal[`season${this.getSeasonNumber(currentSeason)}` as keyof typeof colors.seasonal],
      cultural: colors.cultural.heritage,
    };
  }
  
  // Get contextual spacing
  getSpacing(context: 'cozy' | 'formal' | 'festive' = 'cozy', season?: Season): number[] {
    const currentSeason = season || getCurrentSeason();
    const spacing = this.currentConfig.spacing;
    const contextMultiplier = spacing.contexts[context];
    const seasonalMultiplier = spacing.seasonal[currentSeason];
    const finalMultiplier = contextMultiplier * seasonalMultiplier;
    
    return spacing.base.map(value => Math.round(value * finalMultiplier));
  }
  
  // Get contextual radius
  getRadius(context: 'base' | 'cozy' | 'formal' = 'base', season?: Season): { sm: number; md: number; lg: number; xl: number } {
    if (context === 'base') {
      return this.currentConfig.radius.base;
    }
    
    const currentSeason = season || getCurrentSeason();
    const contextRadius = this.currentConfig.radius.contexts[context];
    const seasonalRadius = this.currentConfig.radius.seasonal[currentSeason];
    
    // Blend context and seasonal preferences
    return {
      sm: Math.round((contextRadius.sm + seasonalRadius.sm) / 2),
      md: Math.round((contextRadius.md + seasonalRadius.md) / 2), 
      lg: Math.round((contextRadius.lg + seasonalRadius.lg) / 2),
      xl: Math.round((contextRadius.xl + seasonalRadius.xl) / 2),
    };
  }
  
  // Get time configuration
  getTimeConfig(): CulturalTime {
    return this.currentConfig.time;
  }
  
  // Helper methods
  private getSeasonNumber(season: Season): number {
    const seasonMap = { winter: 1, spring: 2, summer: 3, autumn: 4 };
    return seasonMap[season];
  }
  
  // Check if current time is within cultural context
  isWithinCulturalHours(context: 'quiet' | 'work' | 'school' | 'family', date: Date = new Date()): boolean {
    const hour = date.getHours();
    const config = this.currentConfig.time;
    
    switch (context) {
      case 'quiet':
        return hour >= config.quietHours.start || hour < config.quietHours.end;
      case 'work':
        return hour >= config.workHours.start && hour < config.workHours.end;
      case 'school':
        return hour >= config.schoolHours.start && hour < config.schoolHours.end;
      case 'family':
        return hour >= config.familyHours.start && hour < config.familyHours.end;
      default:
        return false;
    }
  }
}

// Export singleton instance with Norwegian as default
export const culturalDesignService = new CulturalDesignService('norwegian');

// Backwards compatibility exports
export const norwegianColors_Legacy = norwegianColors;
export const norwegianTypography_Legacy = norwegianTypography;
export const norwegianSpacing_Legacy = norwegianSpacing;
export const norwegianRadius_Legacy = norwegianRadius;
export const getNorwegianSeason_Legacy = getCurrentSeason;
export const norwegianTimePeriods_Legacy = norwegianTime;