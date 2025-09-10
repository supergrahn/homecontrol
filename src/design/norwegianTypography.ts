/**
 * Norwegian Typography Extensions
 * 
 * Typography styles specifically designed for Norwegian cultural context,
 * including greetings, cultural notes, and seasonal variations.
 */

import { TextStyle } from 'react-native';
import { typography } from './tokens';

export interface NorwegianTextStyle extends TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  color?: string;
  letterSpacing?: number;
  textTransform?: TextStyle['textTransform'];
  fontStyle?: TextStyle['fontStyle'];
}

// Norwegian greeting styles for different times of day
export const norwegianGreetings = {
  // Morning greeting (06:00-10:00)
  morning: {
    fontSize: typography.scale.subtitle.size,
    lineHeight: typography.scale.subtitle.lh,
    fontWeight: '600' as const,
    color: 'fjordBlue.500',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Day greeting (10:00-17:00)
  day: {
    fontSize: typography.scale.subtitle.size,
    lineHeight: typography.scale.subtitle.lh,
    fontWeight: '600' as const,
    color: 'auroraGreen.500',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Evening greeting (17:00-20:00)
  evening: {
    fontSize: typography.scale.subtitle.size,
    lineHeight: typography.scale.subtitle.lh,
    fontWeight: '600' as const,
    color: 'seasonal.autumnOrange',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Night greeting (20:00-06:00)
  night: {
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lh,
    fontWeight: '500' as const,
    color: 'textSecondary',
    letterSpacing: 0.1,
    fontStyle: 'italic' as const,
  } as NorwegianTextStyle,
} as const;

// Cultural context typography
export const norwegianCultural = {
  // Cultural explanations and notes
  culturalNote: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    color: 'textSecondary',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
  
  // Holiday and celebration text
  celebration: {
    fontSize: typography.scale.title.size,
    lineHeight: typography.scale.title.lh,
    fontWeight: '700' as const,
    color: 'cultural.flagRed',
    letterSpacing: 0.5,
  } as NorwegianTextStyle,
  
  // Traditional/folk context
  traditional: {
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lh,
    fontWeight: '600' as const,
    color: 'cultural.rosemallingBlue',
    letterSpacing: 0.3,
  } as NorwegianTextStyle,
  
  // Family/cozy context
  familyCozy: {
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lh + 2, // Slightly more line height for readability
    fontWeight: '500' as const,
    color: 'text',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
} as const;

// Event and group typography
export const norwegianEvents = {
  // Event type labels
  eventType: {
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lh,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.0,
    color: 'primary',
  } as NorwegianTextStyle,
  
  // Event title for Norwegian context
  eventTitle: {
    fontSize: typography.scale.title.size,
    lineHeight: typography.scale.title.lh,
    fontWeight: '700' as const,
    color: 'text',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Group name
  groupName: {
    fontSize: typography.scale.subtitle.size,
    lineHeight: typography.scale.subtitle.lh,
    fontWeight: '600' as const,
    color: 'fjordBlue.600',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
  
  // Location with Norwegian context awareness
  location: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '500' as const,
    color: 'textSecondary',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // RSVP status
  rsvpStatus: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'capitalize' as const,
  } as NorwegianTextStyle,
} as const;

// Norwegian time and date formatting
export const norwegianTime = {
  // Standard Norwegian time format
  time: {
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lh,
    fontWeight: '600' as const,
    color: 'text',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Date with Norwegian format
  date: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '500' as const,
    color: 'textSecondary',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
  
  // Duration
  duration: {
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lh,
    fontWeight: '600' as const,
    color: 'textSecondary',
    fontVariant: ['tabular-nums'] as any,
  } as NorwegianTextStyle,
  
  // Quiet hours indicator
  quietHours: {
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lh,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    color: 'warning',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
} as const;

// School system typography
export const norwegianSchool = {
  // School name
  schoolName: {
    fontSize: typography.scale.subtitle.size,
    lineHeight: typography.scale.subtitle.lh,
    fontWeight: '600' as const,
    color: 'school.schoolRed.600',
    letterSpacing: 0.2,
  } as NorwegianTextStyle,
  
  // Grade level
  gradeLevel: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '700' as const,
    color: 'school.gradeGold.600',
    letterSpacing: 0.5,
  } as NorwegianTextStyle,
  
  // SFO context
  sfo: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '600' as const,
    color: 'school.sfoBlue.600',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  } as NorwegianTextStyle,
  
  // AKS context
  aks: {
    fontSize: typography.scale.label.size,
    lineHeight: typography.scale.label.lh,
    fontWeight: '600' as const,
    color: 'school.aksViolet.600',
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  } as NorwegianTextStyle,
  
  // Teacher/staff context
  staff: {
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lh,
    fontWeight: '500' as const,
    color: 'text',
    letterSpacing: 0.1,
  } as NorwegianTextStyle,
} as const;

// Seasonal typography variations
export const norwegianSeasonal = {
  winter: {
    // Softer, more intimate styles for winter
    activity: {
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lh + 2,
      fontWeight: '500' as const,
      color: 'seasonal.winterBlue',
      letterSpacing: 0.2,
    } as NorwegianTextStyle,
    
    greeting: {
      fontSize: typography.scale.subtitle.size,
      lineHeight: typography.scale.subtitle.lh,
      fontWeight: '600' as const,
      color: 'seasonal.winterSilver',
      letterSpacing: 0.3,
    } as NorwegianTextStyle,
  },
  
  summer: {
    // Bright, energetic styles for summer
    activity: {
      fontSize: typography.scale.body.size + 1,
      lineHeight: typography.scale.body.lh,
      fontWeight: '600' as const,
      color: 'seasonal.summerSun',
      letterSpacing: 0.1,
    } as NorwegianTextStyle,
    
    greeting: {
      fontSize: typography.scale.title.size,
      lineHeight: typography.scale.title.lh,
      fontWeight: '700' as const,
      color: 'seasonal.summerGreen',
      letterSpacing: 0.2,
    } as NorwegianTextStyle,
  },
  
  spring: {
    // Fresh, optimistic styles for spring
    activity: {
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lh,
      fontWeight: '500' as const,
      color: 'seasonal.springGreen',
      letterSpacing: 0.15,
    } as NorwegianTextStyle,
    
    greeting: {
      fontSize: typography.scale.subtitle.size,
      lineHeight: typography.scale.subtitle.lh,
      fontWeight: '600' as const,
      color: 'auroraGreen.500',
      letterSpacing: 0.25,
    } as NorwegianTextStyle,
  },
  
  autumn: {
    // Warm, contemplative styles for autumn
    activity: {
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lh + 1,
      fontWeight: '500' as const,
      color: 'seasonal.autumnOrange',
      letterSpacing: 0.1,
    } as NorwegianTextStyle,
    
    greeting: {
      fontSize: typography.scale.subtitle.size,
      lineHeight: typography.scale.subtitle.lh,
      fontWeight: '600' as const,
      color: 'seasonal.autumnGold',
      letterSpacing: 0.2,
    } as NorwegianTextStyle,
  },
} as const;

// Helper function to get greeting style based on time
export const getGreetingStyle = (hour: number): NorwegianTextStyle => {
  if (hour >= 6 && hour < 10) return norwegianGreetings.morning;
  if (hour >= 10 && hour < 17) return norwegianGreetings.day;
  if (hour >= 17 && hour < 20) return norwegianGreetings.evening;
  return norwegianGreetings.night;
};

// Helper function to get seasonal activity style
export const getSeasonalActivityStyle = (season: 'winter' | 'spring' | 'summer' | 'autumn'): NorwegianTextStyle => {
  return norwegianSeasonal[season].activity;
};

// Helper function to get seasonal greeting style
export const getSeasonalGreetingStyle = (season: 'winter' | 'spring' | 'summer' | 'autumn'): NorwegianTextStyle => {
  return norwegianSeasonal[season].greeting;
};