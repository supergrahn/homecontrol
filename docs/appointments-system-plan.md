# Appointments System - Project Plan

## Executive Summary

This document outlines the comprehensive appointments system with parent-child device linking functionality for the Norwegian family management app. The system emphasizes Norwegian cultural integration, security-first device linking, and intelligent notification management.

## Core Requirements

### Appointments System
- **Intuitive and modern appointment creation** for both kids and parents
- **Smart notification system** - minimum 2 notifications per appointment
- **Simple configuration** - "days before" and "hours before" for each notification  
- **Norwegian cultural integration** with seasonal activities and school system

### Parent-Child Device Linking
- **Secure connection** of parents to kids with smartphones/smartwatches
- **Communication capabilities** - messages, tasks, rewards, and useful actions
- **Simple connection methods** - QR code scanning with SMS/email verification
- **Account management** - seamless user creation and linking process

## Strategic Architecture

### 1. Appointments Data Model

```typescript
interface Appointment {
  id: string;
  householdId: string;
  childId?: string; // Optional - can be family-wide
  title: string;
  description?: string;
  
  // Norwegian Cultural Context
  type: 'school' | 'health' | 'family' | 'activities' | 'cultural' | 'personal';
  culturalContext?: {
    season: 'winter' | 'spring' | 'summer' | 'autumn';
    norwegianTradition?: string; // '17mai', 'lucia', 'cabin-weekend'
    weatherDependent: boolean;
  };
  
  // Timing
  startTime: Date;
  endTime?: Date;
  allDay: boolean;
  timezone: string; // Norwegian timezone handling
  
  // Notifications
  notifications: {
    id: string;
    type: 'days' | 'hours' | 'minutes';
    amount: number; // e.g., 2 days, 3 hours
    title: string;
    message: string;
    sent: boolean;
    sentAt?: Date;
  }[];
  
  // Coordination
  participants: string[]; // User IDs
  coordinationNeeded: boolean;
  familyImpact: 'low' | 'medium' | 'high';
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'cancelled';
}
```

### 2. Device Linking Data Model

```typescript
interface DeviceLink {
  id: string;
  householdId: string;
  childId: string;
  parentId: string;
  
  // Security
  linkingMethod: 'qr_code' | 'sms_invite';
  verificationCode: string;
  verified: boolean;
  verifiedAt?: Date;
  expiresAt: Date;
  
  // Device Information
  deviceInfo: {
    type: 'smartphone' | 'smartwatch' | 'tablet';
    platform: 'ios' | 'android' | 'other';
    deviceId: string;
    lastSeen: Date;
    pushToken?: string;
  };
  
  // Permissions
  permissions: {
    sendMessages: boolean;
    addTasks: boolean;
    manageRewards: boolean;
    viewSchedule: boolean;
    emergencyContact: boolean;
  };
  
  // Status
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}
```

## Norwegian Cultural Integration

### 1. Cultural Appointment Types

**School & Education:**
- Foreldremøter (Parent meetings)
- Skoleavslutning (School ending ceremonies)
- Innmeldingsdager (Enrollment days)
- Leksehjelp (Homework help sessions)

**Norwegian Traditions:**
- 17. mai preparation and celebration
- Lucia celebration (13. desember)  
- Juleforberedelser (Christmas preparations)
- Påskeferie planning (Easter vacation)
- Sommerferie koordinering (Summer vacation coordination)

**Family & Seasonal:**
- Hytteturer (Cabin trips)
- Skiturer (Ski trips)
- Bærplukking (Berry picking)
- Friluftsliv activities
- Dugnad (Community work days)

### 2. Cultural Timing Intelligence

**Norwegian Work-Life Balance:**
- Avoid scheduling during traditional dinner time (17:00-19:00)
- Respect Friday afternoon family time
- Consider Norwegian vacation periods (Påske, Summer, Christmas)
- Account for early school start times

**Seasonal Considerations:**
- Winter: Earlier appointments due to darkness
- Summer: Later appointments utilizing bright nights
- Weather-dependent outdoor activities
- Cabin weekend coordination

### 3. Norwegian Language Integration

All appointment interfaces must support:
- Norwegian bokmål as primary language
- Cultural terminology (hyttetur, friluftsliv, etc.)
- Norwegian date/time formatting
- Cultural context explanations

## Security Framework

### 1. Research Findings

**Norwegian Children's Smartwatch Market Analysis:**
- High vulnerability to SMS-based attacks
- Parents concerned about privacy and data protection
- Need for transparent security communication
- GDPR compliance requirements

### 2. Security-First Linking Strategy

**QR Code + Verification Approach:**
1. Parent initiates device linking from kid's profile
2. Generate secure QR code with embedded verification token
3. Child scans QR code on their device
4. System sends verification code via SMS/email to parent
5. Parent enters verification code to complete linking
6. Device registered with permissions and monitoring

**Security Features:**
- Time-limited QR codes (5 minutes expiration)
- Encrypted verification tokens
- Audit log of all linking activities
- Revocation capabilities for parents
- Emergency unlinking procedures

### 3. Privacy Protection

**Data Minimization:**
- Only collect necessary device information
- No location tracking without explicit consent
- Message history limited to essential coordination
- Regular data cleanup procedures

**Parental Controls:**
- Complete visibility into child's device activities
- Granular permission management
- Usage time monitoring and limits
- Emergency contact override capabilities

## Technical Implementation Strategy

### 1. Database Schema (Firestore)

```
households/{householdId}/
├── appointments/{appointmentId}
├── deviceLinks/{linkId}
├── children/{childId}/
│   ├── linkedDevices/{deviceId}
│   └── appointmentNotifications/{notificationId}
└── users/{userId}/
    ├── deviceTokens/{tokenId}
    └── linkingRequests/{requestId}
```

### 2. Firebase Functions

**Appointment Management:**
- `createAppointment(householdId, appointmentData)`
- `updateAppointment(appointmentId, updates)`
- `deleteAppointment(appointmentId)`
- `scheduleNotifications(appointmentId)`
- `sendNotification(notificationId)`

**Device Linking:**
- `generateLinkingQR(childId, parentId)`
- `verifyDeviceLinking(qrToken, verificationCode)`
- `revokeDeviceLink(linkId)`
- `sendMessageToChild(linkId, message)`
- `addTaskToChild(linkId, taskData)`

**Cultural Intelligence:**
- `getCulturalAppointmentSuggestions(season, location)`
- `getOptimalNotificationTiming(appointmentType, culturalContext)`
- `generateNorwegianAppointmentTemplates()`

### 3. Real-time Capabilities

**Live Updates:**
- Appointment status changes
- Device connection status
- Notification delivery confirmation
- Emergency communication channels

**Offline Support:**
- Cache critical appointment information
- Queue notifications for delivery when online
- Sync appointment changes when connectivity restored

## Integration Points

### 1. Kids Screen Enhancement

**Individual Kid Tabs:**
- Add "Appointments" section with today's schedule
- "Link Device" button in profile header
- Device status indicator (connected/disconnected)
- Quick appointment creation button

**Family Overview (Oversikt):**
- Today's family appointments summary
- Upcoming coordination needs
- Device connectivity status for all kids
- Cultural event reminders

### 2. Existing Component Integration

**Leverage Current Architecture:**
- Extend existing card-based layout system
- Use established Norwegian seasonal theming
- Integrate with current notification infrastructure
- Maintain cultural context patterns

**Enhanced Components:**
- AddEditChildModal: Add device linking option
- ChildDetailDrawer: Add appointment management section  
- Notification system: Extend for appointment reminders
- Calendar integration: Norwegian cultural events

## Norwegian Cultural Features

### 1. Seasonal Intelligence

**Winter Appointments:**
- Suggest indoor alternatives for weather-dependent events
- Account for early darkness in scheduling
- Ski and winter sports coordination
- Christmas preparation reminders

**Spring Appointments:**
- 17. mai celebration planning
- Outdoor activity resumption
- School year ending coordination
- Cabin opening preparations

**Summer Appointments:**
- Vacation period scheduling conflicts
- Midnight sun activity planning
- Ferry and cabin booking reminders
- Extended outdoor activity opportunities

**Autumn Appointments:**
- School year startup coordination  
- Winter preparation activities
- Harvest season family activities
- Indoor activity planning resumption

### 2. Cultural Event Calendar

**Automatic Integration:**
- Norwegian national holidays and observances
- School vacation periods by region
- Traditional celebration dates
- Local community event coordination

**Smart Suggestions:**
- Preparation time recommendations for major holidays
- Family coordination opportunities
- Cultural learning activities
- Community participation reminders

## Success Metrics

### 1. User Adoption Metrics

**Appointments Usage:**
- Time to create appointment: < 2 minutes
- Notification accuracy: > 95% delivered on time
- Cultural feature adoption: > 70% use seasonal suggestions
- Family coordination success: > 80% participants attend

**Device Linking Success:**
- Linking completion rate: > 95% within 5 minutes
- Security verification success: > 98%
- Ongoing connectivity: > 90% uptime
- Parent satisfaction with controls: > 4.5/5

### 2. Cultural Integration Success

**Norwegian Context Usage:**
- Seasonal appointment templates used: > 60%
- Cultural timing suggestions accepted: > 70%
- Norwegian language preference: > 85%
- Cultural event participation: > 50% family engagement

**Family Coordination Improvement:**
- Reduced scheduling conflicts: > 40% improvement
- Increased advance planning: > 60% appointments scheduled 24h+ ahead
- Enhanced communication: > 3x increase in family coordination messages
- Cultural activity participation: > 30% increase

This comprehensive plan provides the foundation for implementing a culturally-authentic, security-conscious appointments and device linking system that enhances Norwegian family coordination while maintaining the app's core values of cultural integration and family-focused functionality.