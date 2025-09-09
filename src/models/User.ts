/**
 * Enhanced User model for Norwegian family-focused authentication
 * Supports Norwegian cultural context and family structures
 */

export type UserRole = 'parent' | 'child';
export type AgeGroup = 'young' | 'middle' | 'teen';
export type Language = 'no' | 'en';

export interface UserPreferences {
  /** User's preferred language */
  language: Language;
  /** Whether to receive push notifications */
  notifications: boolean;
  /** Optional timezone preference (defaults to Europe/Oslo for Norwegian users) */
  timezone?: string;
}

export interface DeviceAccess {
  /** Whether the child has their own device */
  hasDevice: boolean;
  /** Type of device if they have one */
  deviceType?: 'phone' | 'smartwatch' | 'tablet';
  /** Whether parental controls are enabled */
  parentalControls: boolean;
}

/**
 * Enhanced user profile supporting Norwegian family structures
 * and cultural contexts
 */
export interface UserProfile {
  /** Unique identifier from Firebase Auth */
  id: string;
  /** User's email address */
  email: string;
  /** Display name shown to family members */
  name: string;
  /** User role in the family context */
  role: UserRole;
  
  // Child-specific properties
  /** Age group for children (used for age-appropriate features) */
  ageGroup?: AgeGroup;
  /** Device access settings for children */
  deviceAccess?: DeviceAccess;
  /** Actual age for children */
  age?: number;
  
  /** User preferences and settings */
  preferences: UserPreferences;
  
  /** List of household IDs the user belongs to */
  householdIds?: string[];
  
  // Metadata
  /** When the profile was created */
  createdAt?: Date;
  /** When the profile was last updated */
  updatedAt?: Date;
}

/**
 * Onboarding state tracking for new users
 */
export interface OnboardingState {
  /** Whether the user has completed initial setup */
  completed: boolean;
  /** Current step in onboarding process */
  currentStep: 'welcome' | 'family-structure' | 'children-setup' | 'reward-preview' | 'completed';
  /** Steps that have been completed */
  completedSteps: string[];
  /** When onboarding was started */
  startedAt?: Date;
  /** When onboarding was completed */
  completedAt?: Date;
}

/**
 * Age group determination based on child's age
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 7) return 'young';
  if (age <= 12) return 'middle';
  return 'teen';
}

/**
 * Default user preferences for Norwegian users
 */
export function getDefaultPreferences(): UserPreferences {
  return {
    language: 'no',
    notifications: true,
    timezone: 'Europe/Oslo'
  };
}

/**
 * Create a new user profile with defaults
 */
export function createUserProfile(
  id: string, 
  email: string, 
  name: string, 
  role: UserRole = 'parent'
): UserProfile {
  const profile: UserProfile = {
    id,
    email,
    name,
    role,
    preferences: getDefaultPreferences(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return profile;
}

/**
 * Check if user profile supports age-appropriate features
 */
export function hasAgeAppropriateFeatures(profile: UserProfile): boolean {
  return profile.role === 'child' && !!profile.ageGroup;
}

/**
 * Check if child can have device-specific features
 */
export function canHaveDeviceFeatures(profile: UserProfile): boolean {
  return profile.role === 'child' && 
         profile.ageGroup !== 'young' && 
         profile.deviceAccess?.hasDevice === true;
}