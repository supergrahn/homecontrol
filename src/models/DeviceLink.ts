/**
 * Norwegian Family Device Linking Models
 * Secure parent-child device connection with Norwegian cultural values
 * Emphasizes trust, transparency, and family autonomy
 */

export type DeviceType = "smartphone" | "smartwatch" | "tablet" | "laptop";
export type DevicePlatform = "ios" | "android" | "windows" | "macos" | "web";
export type LinkingMethod = "qr_code" | "sms_invite" | "email_invite" | "manual";

export type DeviceLinkStatus = 
  | "pending" // Linking in progress
  | "active" // Successfully linked and active
  | "suspended" // Temporarily disabled
  | "revoked" // Permanently disconnected
  | "expired"; // Link expired

export type SecurityEventType = 
  | "DEVICE_LINKED" // Successful device linking
  | "DEVICE_REVOKED" // Device access removed
  | "FAILED_LINKING" // Failed linking attempt
  | "SUSPICIOUS_ACTIVITY" // Unusual activity detected
  | "PERMISSIONS_UPDATED" // Device permissions changed
  | "MESSAGE_SENT" // Secure message sent
  | "UNAUTHORIZED_ACCESS"; // Blocked unauthorized access

export interface DevicePermissions {
  // Communication
  sendMessages: boolean;
  receiveMessages: boolean;
  emergencyContact: boolean; // Always allowed for safety
  
  // Task Management
  addTasks: boolean;
  editTasks: boolean;
  markTasksComplete: boolean;
  viewTaskHistory: boolean;
  
  // Reward System
  viewRewards: boolean;
  addRewards: boolean;
  redeemRewards: boolean;
  
  // Schedule Access
  viewSchedule: boolean;
  addAppointments: boolean;
  editAppointments: boolean;
  receiveReminders: boolean;
  
  // Family Coordination
  viewFamilyCalendar: boolean;
  participateInPolls: boolean;
  accessFamilyPhotos: boolean;
  
  // Norwegian Cultural Features
  accessCulturalContent: boolean; // Norwegian traditions, seasonal activities
  viewWeatherIntegration: boolean; // Weather-based activity suggestions
  cabinModeAccess: boolean; // Special hytte/cabin functionality
  
  // Advanced Features (require explicit consent)
  locationSharing: boolean; // For safety and coordination
  screenTimeReporting: boolean; // Usage monitoring
  appUsageReports: boolean; // What apps are being used
  contactSync: boolean; // Sync family contacts
  
  // Parental Controls
  contentFiltering: boolean; // Age-appropriate content filtering
  timeRestrictions: boolean; // Limit usage hours
  emergencyOverride: boolean; // Parent can override restrictions
}

export interface DeviceInfo {
  type: DeviceType;
  platform: DevicePlatform;
  model?: string; // "iPhone 15", "Samsung Galaxy", etc.
  osVersion?: string; // Operating system version
  appVersion: string; // Our app version
  deviceId: string; // Unique device identifier
  deviceName?: string; // User-friendly name "Emma's iPhone"
  pushToken?: string; // For notifications
  
  // Norwegian localization
  preferredLanguage: "norwegian" | "english";
  timezone: string; // Should be "Europe/Oslo" for Norway
  
  // Last activity tracking
  lastSeen: Date;
  lastIPAddress?: string; // For security auditing
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
}

export interface DeviceLink {
  id: string;
  householdId: string;
  childId: string;
  parentId: string;
  
  // Device Information
  deviceInfo: DeviceInfo;
  
  // Security Configuration
  linkingMethod: LinkingMethod;
  verified: boolean;
  verifiedAt?: Date;
  status: DeviceLinkStatus;
  
  // Permissions
  permissions: DevicePermissions;
  permissionsUpdatedAt?: Date;
  permissionsUpdatedBy?: string; // Which parent updated permissions
  
  // Security Keys (for encryption)
  encryptionKey?: string; // AES-256 key for message encryption
  deviceFingerprint: string; // Unique device security fingerprint
  
  // Norwegian Cultural Context
  norwegianContext: {
    relationshipToChild: "parent" | "guardian" | "grandparent" | "caregiver";
    trustLevel: "full" | "supervised" | "limited"; // Based on child age and maturity
    culturalConsiderations: {
      respectQuietHours: boolean; // 20:00-07:00 quiet time
      allowCulturalReminders: boolean; // Norwegian traditions and holidays
      seasonalAdjustments: boolean; // Adjust features based on season
      familyValues: string[]; // Specific family values to respect
    };
  };
  
  // Activity Monitoring
  activityTracking: {
    lastMessageSent?: Date;
    lastAppointmentReceived?: Date;
    totalMessagesExchanged: number;
    averageResponseTime?: number; // In minutes
    mostActiveHours: number[]; // Hours of day when most active
  };
  
  // Emergency Protocols
  emergencySettings: {
    alwaysReachable: boolean; // Can contact even during quiet hours
    emergencyContacts: string[]; // Additional people who can reach child
    panicButtonEnabled: boolean; // Quick emergency alert
    locationSharingInEmergency: boolean; // Share location in emergencies
  };
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  lastActiveAt: Date;
  
  // Parental Notes
  parentNotes?: string; // Private notes about this device link
  childConsent?: boolean; // If child has explicitly consented (for older children)
  consentDate?: Date;
}

export interface LinkingRequest {
  id: string;
  householdId: string;
  childId: string;
  parentId: string;
  
  // Security Tokens
  qrToken: string; // 256-bit encrypted token for QR code
  verificationCode: string; // 6-digit SMS/email verification code
  
  // Timing
  createdAt: Date;
  expiresAt: Date; // 5 minutes from creation
  status: "pending" | "expired" | "completed" | "failed";
  
  // Security Tracking
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  
  // Failure Tracking
  failureReason?: "EXPIRED" | "INVALID_VERIFICATION" | "SECURITY_VIOLATION" | "TECHNICAL_ERROR";
  attemptCount: number;
}

export interface SecureMessage {
  id: string;
  deviceLinkId: string;
  
  // Message Content (encrypted)
  encryptedPayload: string; // AES-256 encrypted message content
  messageType: "text" | "task" | "reward" | "appointment" | "emergency" | "cultural";
  
  // Norwegian Cultural Context
  culturalContext?: {
    isUrgent: boolean;
    respectsQuietHours: boolean;
    culturalRelevance?: string; // Why this message relates to Norwegian culture
    seasonalContext?: string; // How this relates to current season
  };
  
  // Metadata
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  status: "pending" | "delivered" | "read" | "failed";
  
  // Security Verification
  messageHash: string; // SHA-256 hash for integrity verification
  senderFingerprint: string; // Device fingerprint of sender
  
  // Delivery Tracking
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  failureReason?: string;
  
  // Norwegian Timing Respect
  respectsNorwegianQuietHours: boolean;
  scheduledDeliveryAt?: Date; // If delayed due to quiet hours
}

export interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  deviceLinkId?: string;
  householdId: string;
  
  // Event Details
  parentId: string;
  childId?: string;
  timestamp: Date;
  success: boolean;
  
  // Security Information
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // Event Specific Data
  eventData?: {
    [key: string]: any; // Flexible data structure for different event types
  };
  
  // Risk Assessment
  riskLevel: "low" | "medium" | "high" | "critical";
  automaticResponse?: string; // What automated action was taken
  requiresParentAttention: boolean;
  
  // Investigation
  investigated: boolean;
  investigatedBy?: string;
  investigationNotes?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

// Norwegian Device Linking Templates for different family contexts
export const NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES = {
  // Young child (5-8 years) - Very supervised
  young_child: {
    name: "Ung barn (5-8 år)",
    description: "Grunnleggende tilkobling med høy foreldrekontroll",
    permissions: {
      sendMessages: false,
      receiveMessages: true,
      emergencyContact: true,
      addTasks: false,
      editTasks: false,
      markTasksComplete: true,
      viewTaskHistory: false,
      viewRewards: true,
      addRewards: false,
      redeemRewards: false,
      viewSchedule: true,
      addAppointments: false,
      editAppointments: false,
      receiveReminders: true,
      viewFamilyCalendar: false,
      participateInPolls: false,
      accessFamilyPhotos: false,
      accessCulturalContent: true,
      viewWeatherIntegration: true,
      cabinModeAccess: false,
      locationSharing: true,
      screenTimeReporting: true,
      appUsageReports: true,
      contactSync: false,
      contentFiltering: true,
      timeRestrictions: true,
      emergencyOverride: true
    } as DevicePermissions,
    norwegianGuidance: [
      "Grunnleggende kommunikasjon og påminnelser",
      "Høy sikkerhet og foreldrekontroll", 
      "Fokus på læring og rutiner",
      "Norske kulturelle elementer inkludert"
    ]
  },
  
  // School age child (9-12 years) - Moderate supervision
  school_child: {
    name: "Skolebarn (9-12 år)",
    description: "Balansert tilkobling med moderat selvstendighet",
    permissions: {
      sendMessages: true,
      receiveMessages: true,
      emergencyContact: true,
      addTasks: false,
      editTasks: false,
      markTasksComplete: true,
      viewTaskHistory: true,
      viewRewards: true,
      addRewards: false,
      redeemRewards: true,
      viewSchedule: true,
      addAppointments: false,
      editAppointments: false,
      receiveReminders: true,
      viewFamilyCalendar: true,
      participateInPolls: true,
      accessFamilyPhotos: true,
      accessCulturalContent: true,
      viewWeatherIntegration: true,
      cabinModeAccess: true,
      locationSharing: true,
      screenTimeReporting: true,
      appUsageReports: false,
      contactSync: true,
      contentFiltering: true,
      timeRestrictions: true,
      emergencyOverride: true
    } as DevicePermissions,
    norwegianGuidance: [
      "Toveis kommunikasjon med familien",
      "Kan delta i familieaktiviteter og avstemninger",
      "Tilgang til norsk kultur og tradisjoner",
      "Begrenset selvstendighet med sikkerhet"
    ]
  },
  
  // Teenager (13-16 years) - Higher independence
  teenager: {
    name: "Tenåring (13-16 år)", 
    description: "Høy selvstendighet med respekt for familieverdier",
    permissions: {
      sendMessages: true,
      receiveMessages: true,
      emergencyContact: true,
      addTasks: true,
      editTasks: true,
      markTasksComplete: true,
      viewTaskHistory: true,
      viewRewards: true,
      addRewards: false,
      redeemRewards: true,
      viewSchedule: true,
      addAppointments: true,
      editAppointments: true,
      receiveReminders: true,
      viewFamilyCalendar: true,
      participateInPolls: true,
      accessFamilyPhotos: true,
      accessCulturalContent: true,
      viewWeatherIntegration: true,
      cabinModeAccess: true,
      locationSharing: false, // Optional for older teens
      screenTimeReporting: false,
      appUsageReports: false,
      contactSync: true,
      contentFiltering: false,
      timeRestrictions: false,
      emergencyOverride: true
    } as DevicePermissions,
    norwegianGuidance: [
      "Høy grad av selvstendighet og tillit",
      "Kan bidra til familieplanlegging",
      "Respekterer norske verdier om tillit og ansvar",
      "Fokus på forberedelse til voksenliv"
    ]
  }
};

// Utility functions for Norwegian device linking
export function createDefaultDevicePermissions(childAge: number): DevicePermissions {
  if (childAge <= 8) {
    return { ...NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.young_child.permissions };
  } else if (childAge <= 12) {
    return { ...NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.school_child.permissions };
  } else {
    return { ...NORWEGIAN_DEVICE_PERMISSIONS_TEMPLATES.teenager.permissions };
  }
}

export function isWithinNorwegianQuietHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  // Norwegian quiet hours: 20:00 - 07:00
  return hour >= 20 || hour < 7;
}

export function shouldDelayMessageForQuietHours(
  message: SecureMessage,
  respectQuietHours: boolean = true
): { shouldDelay: boolean; scheduleFor?: Date } {
  if (!respectQuietHours || !message.culturalContext?.respectsQuietHours) {
    return { shouldDelay: false };
  }
  
  if (message.messageType === "emergency") {
    return { shouldDelay: false }; // Emergency messages always go through
  }
  
  if (isWithinNorwegianQuietHours()) {
    // Schedule for 07:00 the next morning
    const nextMorning = new Date();
    nextMorning.setDate(nextMorning.getDate() + 1);
    nextMorning.setHours(7, 0, 0, 0);
    
    return {
      shouldDelay: true,
      scheduleFor: nextMorning
    };
  }
  
  return { shouldDelay: false };
}

export function calculateDeviceTrustLevel(
  deviceLink: DeviceLink,
  childAge: number
): "full" | "supervised" | "limited" {
  // Norwegian approach: trust with verification
  if (childAge >= 16) return "full";
  if (childAge >= 10 && deviceLink.activityTracking.averageResponseTime && deviceLink.activityTracking.averageResponseTime < 30) {
    return "supervised"; // Responsive and mature
  }
  return "limited";
}

export function generateSecurityFingerprint(deviceInfo: DeviceInfo): string {
  // Create unique fingerprint based on device characteristics
  const data = `${deviceInfo.platform}-${deviceInfo.model}-${deviceInfo.osVersion}-${deviceInfo.deviceId}`;
  return btoa(data); // In production, use proper cryptographic hashing
}

export function formatDeviceType(type: DeviceType): string {
  const translations = {
    smartphone: "Smarttelefon",
    smartwatch: "Smartklokke", 
    tablet: "Nettbrett",
    laptop: "Bærbar PC"
  };
  return translations[type] || type;
}

export function getDeviceTypeIcon(type: DeviceType): string {
  const icons = {
    smartphone: "📱",
    smartwatch: "⌚", 
    tablet: "📱",
    laptop: "💻"
  };
  return icons[type] || "📱";
}

export function isHighRiskSecurityEvent(event: SecurityEvent): boolean {
  const highRiskEvents: SecurityEventType[] = [
    "SUSPICIOUS_ACTIVITY",
    "UNAUTHORIZED_ACCESS",
    "FAILED_LINKING"
  ];
  
  return highRiskEvents.includes(event.eventType) || 
         event.riskLevel === "high" || 
         event.riskLevel === "critical";
}