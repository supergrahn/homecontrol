/**
 * Norwegian Cultural Design Tokens
 * 
 * Colors inspired by Norwegian nature, culture, and design traditions.
 * These tokens extend the base design system with Norwegian cultural elements.
 */

export const norwegianColors = {
  // Primary Norwegian colors inspired by fjords and nature
  fjordBlue: {
    50: "#F0F8FF",
    100: "#E6F3FF", 
    200: "#BFE4FF",
    300: "#80CCFF",
    400: "#4DA8FF",
    500: "#1E7ADB", // Primary fjord blue
    600: "#1A65B8",
    700: "#144F96",
  },
  
  // Aurora green inspired by northern lights
  auroraGreen: {
    50: "#F0FDF8",
    100: "#E6FFED",
    200: "#CCFFD9",
    300: "#99FFB8",
    400: "#4DFF85", // Aurora green accent
    500: "#1EDB5A",
    600: "#16A34A",
    700: "#15803D",
  },

  // Seasonal color palette reflecting Norwegian seasons
  seasonal: {
    // Winter colors - crisp whites and cool blues
    winterWhite: "#FEFEFE",
    winterBlue: "#E8F4F8",
    winterSilver: "#F1F5F9",
    
    // Summer colors - warm and bright
    summerSun: "#FFF59D", 
    summerGreen: "#A5D6A7",
    summerBlue: "#81C784",
    
    // Autumn colors - warm oranges and deep reds
    autumnOrange: "#FFB74D",
    autumnRed: "#F44336",
    autumnGold: "#FFC107",
    
    // Spring colors - fresh greens and soft pastels  
    springGreen: "#C8E6C9",
    springPink: "#F8BBD9",
    springYellow: "#FFECB3",
  },

  // Norwegian school system colors
  school: {
    // Traditional red for important school events
    schoolRed: {
      50: "#FEF2F2",
      100: "#FEE2E2", 
      200: "#FECACA",
      300: "#FCA5A5",
      400: "#F87171",
      500: "#DC2626", // Primary school red
      600: "#B91C1C",
      700: "#991B1B",
    },
    
    // Gold for achievements and grades
    gradeGold: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A", 
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B", // Primary grade gold
      600: "#D97706",
      700: "#B45309",
    },
    
    // SFO (after-school program) blue
    sfoBlue: {
      50: "#EFF6FF",
      100: "#DBEAFE",
      200: "#BFDBFE",
      300: "#93C5FD", 
      400: "#60A5FA",
      500: "#2563EB", // Primary SFO blue
      600: "#1D4ED8",
      700: "#1E40AF",
    },
    
    // AKS (activity school) violet
    aksViolet: {
      50: "#F5F3FF",
      100: "#EDE9FE",
      200: "#DDD6FE",
      300: "#C4B5FD",
      400: "#A78BFA", 
      500: "#8B5CF6", // Primary AKS violet
      600: "#7C3AED",
      700: "#6D28D9",
    },
  },

  // Cultural context colors
  cultural: {
    // Flag colors
    flagRed: "#EF2B2D",
    flagBlue: "#002868", 
    flagWhite: "#FFFFFF",
    
    // Traditional colors from Norwegian folk art
    rosemallingBlue: "#1E3A8A",
    rosemallingRed: "#DC2626",
    rosemallingGreen: "#16A34A",
    rosemallingYellow: "#F59E0B",
    
    // Cabin/hytte colors - warm earth tones
    hytteRed: "#8B0000",
    hytteBrown: "#8B4513",
    hytteGreen: "#228B22",
  },
} as const;

// Norwegian typography scale with cultural context
export const norwegianTypography = {
  // Greeting styles for time-based Norwegian greetings
  greeting: {
    size: 20,
    lineHeight: 28,
    weight: "600" as const,
    color: 'primary', // Will be resolved by theme
  },
  
  // Cultural note explanations
  culturalNote: {
    size: 14,
    lineHeight: 20, 
    weight: "500" as const,
    style: 'italic' as const,
  },
  
  // Event type labels with Norwegian context
  eventType: {
    size: 12,
    lineHeight: 16,
    weight: "700" as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  
  // Norwegian time formatting
  norwegianTime: {
    size: 16,
    lineHeight: 24,
    weight: "600" as const,
    fontVariant: ['tabular-nums'] as const,
  },
  
  // Seasonal activity suggestions
  seasonalActivity: {
    size: 15,
    lineHeight: 22,
    weight: "500" as const,
  },
  
  // School context labels
  schoolContext: {
    size: 13,
    lineHeight: 18,
    weight: "600" as const,
    color: 'schoolRed.500', // Will be resolved by theme
  },
} as const;

// Norwegian spacing for cultural layouts
export const norwegianSpacing = {
  // Cozy spacing for family-oriented layouts
  cozy: [0, 2, 6, 10, 14, 18, 22, 28, 36] as const,
  
  // Formal spacing for official/school contexts  
  formal: [0, 4, 8, 16, 24, 32, 40, 56, 72] as const,
  
  // Seasonal spacing adjustments
  seasonal: {
    winter: 1.1, // Slightly more spacious in winter
    summer: 0.9, // More compact in summer
    spring: 1.0, // Standard spacing
    autumn: 1.0, // Standard spacing
  },
} as const;

// Norwegian border radius for cultural design
export const norwegianRadius = {
  // Cozy, home-like radius
  cozy: { sm: 8, md: 12, lg: 16, xl: 20 },
  
  // Formal, institutional radius
  formal: { sm: 4, md: 8, lg: 12, xl: 16 },
  
  // Seasonal radius variations
  seasonal: {
    winter: { sm: 6, md: 10, lg: 14, xl: 18 }, // Softer in winter
    summer: { sm: 8, md: 16, lg: 24, xl: 32 }, // More rounded in summer
    spring: { sm: 6, md: 12, lg: 18, xl: 24 }, // Fresh and modern
    autumn: { sm: 4, md: 8, lg: 12, xl: 16 }, // More structured
  },
} as const;

// Season detection helper
export type NorwegianSeason = 'winter' | 'spring' | 'summer' | 'autumn';

export const getNorwegianSeason = (date: Date = new Date()): NorwegianSeason => {
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= 12 || month <= 2) return 'winter';   // Dec, Jan, Feb
  if (month >= 3 && month <= 5) return 'spring';    // Mar, Apr, May  
  if (month >= 6 && month <= 8) return 'summer';    // Jun, Jul, Aug
  return 'autumn';                                   // Sep, Oct, Nov
};

// Cultural time periods for Norwegian context
export const norwegianTimePeriods = {
  quietHours: {
    start: 20, // 20:00 (8 PM)
    end: 7,    // 07:00 (7 AM)
  },
  
  workHours: {
    start: 8,  // 08:00 (8 AM)
    end: 16,   // 16:00 (4 PM)
  },
  
  schoolHours: {
    start: 8,  // 08:00 (8 AM)  
    end: 14,   // 14:00 (2 PM)
  },
  
  sfoHours: {
    start: 14, // 14:00 (2 PM)
    end: 17,   // 17:00 (5 PM)
  },
} as const;