# Implementation Checklist - Appointments & Device Linking

## Quick Reference

This checklist provides specific, actionable tasks for implementing the appointments and device linking system. Each task includes file locations, code examples, and acceptance criteria.

---

## 🔧 Pre-Implementation Setup

### Environment & Dependencies
- [ ] **Verify Firebase Functions v2** - Check `functions/package.json` has `"engines": {"node": "18"}`
- [ ] **Install QR Code Dependencies** - Add to main `package.json`:
  ```bash
  npm install react-native-qrcode-svg react-native-svg
  expo install expo-barcode-scanner
  ```
- [ ] **Verify Push Notifications** - Confirm FCM working in `src/services/push.ts`
- [ ] **Test Norwegian Localization** - Verify `src/locales/no.json` loading correctly

### Database Preparation
- [ ] **Update Firestore Rules** - Add to `firestore.rules`:
  ```javascript
  match /households/{householdId}/appointments/{appointmentId} {
    allow read, write: if isHouseholdMember(householdId);
  }
  match /households/{householdId}/deviceLinks/{linkId} {
    allow read, write: if isHouseholdMember(householdId);
  }
  ```
- [ ] **Add Firestore Indexes** - Update `firestore.indexes.json` with appointment queries
- [ ] **Deploy Rules** - Run `firebase deploy --only firestore:rules`

---

## 📅 Phase 1: Appointments Foundation (Weeks 1-2)

### Week 1: Backend Infrastructure

#### Task 1.1: Firebase Functions Setup
**File: `functions/src/appointments.ts`**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createAppointment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('UNAUTHENTICATED');
  
  const appointment = {
    ...data,
    householdId: data.householdId,
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active'
  };
  
  const appointmentRef = await admin.firestore()
    .collection('households')
    .doc(data.householdId)
    .collection('appointments')
    .add(appointment);
    
  // Schedule notifications
  await scheduleAppointmentNotifications(appointmentRef.id, data.notifications);
  
  return { appointmentId: appointmentRef.id };
});
```

**Acceptance Criteria:**
- [ ] Function deploys without errors: `firebase deploy --only functions:createAppointment`
- [ ] Creates appointment in correct Firestore location
- [ ] Schedules notifications successfully
- [ ] Returns appointment ID

#### Task 1.2: Norwegian Cultural Intelligence
**File: `functions/src/norwegianCultural.ts`**
```typescript
export const getCulturalTimingAdvice = (appointmentTime: Date, type: string) => {
  const hour = appointmentTime.getHours();
  const warnings = [];
  
  // Norwegian dinner time warning (17:00-19:00)
  if (hour >= 17 && hour <= 19) {
    warnings.push({
      type: 'DINNER_TIME',
      message: 'Dette overlapper med vanlig middag tid i Norge (17:00-19:00)',
      suggestion: 'Foreslår 16:30 eller 19:30 i stedet'
    });
  }
  
  // Early morning consideration
  if (hour < 8) {
    warnings.push({
      type: 'EARLY_MORNING', 
      message: 'Tidlig morgen - husk norske mørke vintre',
      suggestion: 'Sjekk at alle kan komme seg trygt frem'
    });
  }
  
  return warnings;
};
```

**Acceptance Criteria:**
- [ ] Returns appropriate warnings for Norwegian cultural timing
- [ ] Integrates with appointment creation flow
- [ ] Provides helpful suggestions in Norwegian

#### Task 1.3: Notification Scheduling System
**File: `functions/src/notifications.ts`**
```typescript
export const scheduleAppointmentNotifications = async (
  appointmentId: string, 
  notifications: Array<{type: 'days' | 'hours', amount: number, message: string}>
) => {
  for (const notification of notifications) {
    const scheduledTime = calculateNotificationTime(appointmentId, notification);
    
    await admin.firestore()
      .collection('scheduledNotifications')
      .add({
        appointmentId,
        scheduledFor: scheduledTime,
        message: notification.message,
        type: notification.type,
        status: 'pending'
      });
  }
};
```

**Acceptance Criteria:**
- [ ] Correctly calculates notification timing based on "days before" and "hours before"
- [ ] Creates scheduled notification records in Firestore
- [ ] Handles multiple notifications per appointment
- [ ] Supports both Norwegian and English messages

### Week 2: Frontend Components

#### Task 2.1: Appointment Creation Modal
**File: `src/components/appointments/AppointmentCreationModal.tsx`**
```typescript
interface AppointmentCreationModalProps {
  visible: boolean;
  onClose: () => void;
  childId?: string;
  householdId: string;
  onSave: (appointment: AppointmentData) => Promise<void>;
}

export default function AppointmentCreationModal({ 
  visible, 
  onClose, 
  childId, 
  householdId,
  onSave 
}: AppointmentCreationModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [appointmentType, setAppointmentType] = useState<'school' | 'health' | 'family' | 'activities' | 'cultural' | 'personal'>('family');
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [notifications, setNotifications] = useState([
    { type: 'days', amount: 1, message: '' },
    { type: 'hours', amount: 2, message: '' }
  ]);
  
  // Component implementation with Norwegian cultural suggestions
  // Form validation and cultural timing warnings
  // Notification setup with preview
}
```

**Acceptance Criteria:**
- [ ] Modal opens and closes properly
- [ ] Form validation prevents invalid appointments
- [ ] Norwegian cultural warnings appear for timing conflicts
- [ ] Notification setup allows "days before" and "hours before" configuration
- [ ] Saves appointments to Firebase successfully

#### Task 2.2: Kids Screen Integration
**File: `src/screens/KidsScreen.tsx` (Modify existing)**

**Add to individual child tab render function:**
```typescript
// Add after existing child profile header
{/* Today's Appointments */}
<View style={{
  backgroundColor: theme.colors.card,
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  marginHorizontal: 16,
}}>
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
    <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
    <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
      {(t("todaysAppointments") as string) || "Dagens avtaler"}
    </Text>
  </View>
  
  {todaysAppointments.length > 0 ? (
    todaysAppointments.map((appointment, idx) => (
      <AppointmentCard key={idx} appointment={appointment} compact />
    ))
  ) : (
    <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
      {(t("noAppointmentsToday") as string) || "Ingen avtaler i dag"}
    </Text>
  )}
  
  <TouchableOpacity
    style={{
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
    }}
    onPress={() => setShowAppointmentModal(true)}
  >
    <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
    <Text style={{ color: theme.colors.onPrimary, marginLeft: 4, fontWeight: "600" }}>
      {(t("addAppointment") as string) || "Legg til avtale"}
    </Text>
  </TouchableOpacity>
</View>
```

**Acceptance Criteria:**
- [ ] Appointment card appears in each child's individual tab
- [ ] "Add Appointment" button opens creation modal
- [ ] Today's appointments display correctly
- [ ] Family overview (Oversikt) shows all family appointments

#### Task 2.3: Norwegian Localization Updates
**File: `src/locales/no.json` (Add to existing)**
```json
{
  "appointments": {
    "newAppointment": "Ny avtale",
    "todaysAppointments": "Dagens avtaler", 
    "upcomingAppointments": "Kommende avtaler",
    "noAppointmentsToday": "Ingen avtaler i dag",
    "addAppointment": "Legg til avtale",
    "appointmentCreated": "Avtale opprettet",
    
    "types": {
      "school": "Skole",
      "health": "Helse", 
      "family": "Familie",
      "activities": "Aktiviteter",
      "cultural": "Kulturell",
      "personal": "Personlig"
    },
    
    "notifications": {
      "dayseBefore": "dager før",
      "hoursBefore": "timer før", 
      "notificationSettings": "Varslingsinnstillinger",
      "preview": "Forhåndsvis"
    },
    
    "cultural": {
      "dinnerTimeWarning": "Dette overlapper med vanlig middag tid i Norge (17:00-19:00)",
      "earlyMorningWarning": "Tidlig morgen - husk norske mørke vintre", 
      "schoolHoursWarning": "Dette er i skoletid - sjekk at skolen er informert",
      "suggestions": "Norske anbefalinger"
    }
  }
}
```

**Acceptance Criteria:**
- [ ] All appointment UI text displays in Norwegian
- [ ] Cultural warnings show Norwegian-specific guidance
- [ ] Translations feel natural to Norwegian families
- [ ] Fallback to English works if Norwegian translation missing

---

## 🔗 Phase 2: Device Linking Security (Weeks 3-4)

### Week 3: Security Infrastructure

#### Task 3.1: QR Code Generation System
**File: `functions/src/deviceLinking.ts`**
```typescript
import * as crypto from 'crypto';

export const generateLinkingQR = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('UNAUTHENTICATED');
  
  // Generate secure tokens
  const qrToken = crypto.randomBytes(32).toString('hex');
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store linking request with 5-minute expiration
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  const requestRef = await admin.firestore()
    .collection('linkingRequests')
    .add({
      qrToken,
      verificationCode,
      parentId: context.auth.uid,
      childId: data.childId,
      householdId: data.householdId,
      expiresAt,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // Send verification code via SMS/email
  await sendVerificationCode(context.auth.uid, verificationCode);
  
  // Return QR data (without verification code for security)
  return {
    qrData: JSON.stringify({
      token: qrToken,
      requestId: requestRef.id,
      childName: data.childName,
      appVersion: '1.0.0'
    }),
    expiresAt: expiresAt.getTime()
  };
});
```

**Acceptance Criteria:**
- [ ] QR token is cryptographically secure (256-bit)
- [ ] Verification code sent via SMS/email
- [ ] Linking request expires in exactly 5 minutes
- [ ] QR data doesn't contain verification code
- [ ] Function properly handles authentication errors

#### Task 3.2: Device Verification System
**File: `functions/src/deviceLinking.ts` (Add to existing)**
```typescript
export const verifyDeviceLinking = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('UNAUTHENTICATED');
  
  // Get linking request
  const requestDoc = await admin.firestore()
    .collection('linkingRequests')
    .doc(data.requestId)
    .get();
    
  if (!requestDoc.exists()) {
    throw new Error('REQUEST_NOT_FOUND');
  }
  
  const request = requestDoc.data()!;
  
  // Check expiration
  if (request.expiresAt.toDate() < new Date()) {
    await requestDoc.ref.delete();
    throw new Error('REQUEST_EXPIRED');
  }
  
  // Verify codes match
  if (request.verificationCode !== data.verificationCode) {
    // Log failed attempt for security monitoring
    await logSecurityEvent({
      type: 'FAILED_VERIFICATION',
      parentId: context.auth.uid,
      requestId: data.requestId,
      timestamp: new Date()
    });
    throw new Error('VERIFICATION_FAILED');
  }
  
  // Create device link
  const deviceLinkRef = await admin.firestore()
    .collection('households')
    .doc(request.householdId)
    .collection('deviceLinks')
    .add({
      parentId: request.parentId,
      childId: request.childId,
      deviceInfo: data.deviceInfo,
      permissions: {
        sendMessages: true,
        addTasks: true,
        manageRewards: true,
        viewSchedule: true,
        emergencyContact: true
      },
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
  // Clean up request
  await requestDoc.ref.delete();
  
  // Log successful linking
  await logSecurityEvent({
    type: 'DEVICE_LINKED',
    parentId: request.parentId,
    childId: request.childId,
    deviceLinkId: deviceLinkRef.id,
    timestamp: new Date(),
    success: true
  });
  
  return {
    success: true,
    deviceLinkId: deviceLinkRef.id
  };
});
```

**Acceptance Criteria:**
- [ ] Properly validates QR token and verification code
- [ ] Handles expired requests gracefully
- [ ] Creates secure device link with appropriate permissions
- [ ] Logs all security events for audit trail
- [ ] Cleans up temporary linking request

### Week 4: Device Linking UI

#### Task 4.1: Device Linking Modal
**File: `src/components/deviceLinking/DeviceLinkingModal.tsx`**
```typescript
type LinkingStep = 'explanation' | 'qr' | 'verification' | 'success' | 'error';

interface DeviceLinkingModalProps {
  visible: boolean;
  onClose: () => void;
  child: Child;
  householdId: string;
}

export default function DeviceLinkingModal({
  visible,
  onClose, 
  child,
  householdId
}: DeviceLinkingModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState<LinkingStep>('explanation');
  const [qrData, setQRData] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [verificationCode, setVerificationCode] = useState('');
  
  const startLinking = async () => {
    try {
      const result = await generateLinkingQR({
        childId: child.id,
        childName: child.displayName,
        householdId
      });
      
      setQRData(result.qrData);
      setExpiresAt(result.expiresAt);
      setCurrentStep('qr');
    } catch (error) {
      console.error('Failed to start linking:', error);
      setCurrentStep('error');
    }
  };
  
  // Step-by-step UI implementation
  // Norwegian security explanations
  // QR code display with countdown
  // Verification code input
  // Success confirmation
}
```

**Acceptance Criteria:**
- [ ] Modal guides user through each step of linking process
- [ ] QR code displays properly with countdown timer  
- [ ] Verification step accepts 6-digit code
- [ ] Error states handled gracefully with Norwegian explanations
- [ ] Success state confirms device is linked

#### Task 4.2: Kids Screen Device Status Integration  
**File: `src/screens/KidsScreen.tsx` (Modify existing individual child tab)**

**Add device status card after child profile header:**
```typescript
{/* Device Connection Status */}
{deviceLink ? (
  <View style={{
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Ionicons name="phone-portrait" size={20} color={theme.colors.success} />
      <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
        {(t("connectedDevice") as string) || "Tilkoblet enhet"}
      </Text>
    </View>
    
    <Text style={{ color: theme.colors.success, fontSize: 14, marginBottom: 8 }}>
      ✅ {deviceLink.deviceInfo.type} - {(t("lastSeen") as string) || "Sist sett"}: {formatTimeAgo(deviceLink.lastActiveAt)}
    </Text>
    
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TouchableOpacity
        style={{
          backgroundColor: theme.colors.primary,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          flexDirection: "row",
          alignItems: "center",
        }}
        onPress={() => openMessageComposer(child.id)}
      >
        <Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />
        <Text style={{ color: theme.colors.onPrimary, marginLeft: 4, fontSize: 12 }}>
          {(t("sendMessage") as string) || "Send melding"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
        onPress={() => openDeviceManagement(deviceLink.id)}
      >
        <Text style={{ color: theme.colors.text, fontSize: 12 }}>
          {(t("manage") as string) || "Administrer"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
) : (
  <View style={{
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  }}>
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.muted} />
      <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
        {(t("deviceLinking") as string) || "Enhetstilkobling"}
      </Text>
    </View>
    
    <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 12 }}>
      {(t("linkDeviceDescription") as string) || "Koble til enhet for å sende meldinger, oppgaver og belønninger"}
    </Text>
    
    <TouchableOpacity
      style={{
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
      onPress={() => setShowDeviceLinkingModal(true)}
    >
      <Ionicons name="link-outline" size={16} color={theme.colors.onPrimary} />
      <Text style={{ color: theme.colors.onPrimary, marginLeft: 4, fontWeight: "600" }}>
        {(t("linkDevice") as string) || "Koble enhet"}
      </Text>
    </TouchableOpacity>
  </View>
)}
```

**Acceptance Criteria:**
- [ ] Device status shows clearly if child's device is connected
- [ ] Connected state shows device type and last seen time
- [ ] "Link Device" button opens linking modal for unconnected devices
- [ ] "Send Message" and "Manage" buttons work for connected devices
- [ ] Visual indicators (icons, colors) clearly communicate connection status

---

## 🚀 Phase 3: Advanced Integration (Weeks 5-6)

### Week 5: Appointment-Device Synchronization

#### Task 5.1: Notification Delivery to Linked Devices
**File: `functions/src/notifications.ts` (Extend existing)**
```typescript
export const sendAppointmentNotificationToDevices = functions.firestore
  .document('households/{householdId}/appointments/{appointmentId}')
  .onUpdate(async (change, context) => {
    const appointment = change.after.data();
    const householdId = context.params.householdId;
    
    // Get linked devices for this child
    if (appointment.childId) {
      const deviceLinksSnapshot = await admin.firestore()
        .collection('households')
        .doc(householdId)
        .collection('deviceLinks')
        .where('childId', '==', appointment.childId)
        .where('status', '==', 'active')
        .get();
        
      // Send notification to each linked device
      for (const deviceLinkDoc of deviceLinksSnapshot.docs) {
        const deviceLink = deviceLinkDoc.data();
        
        if (deviceLink.deviceInfo.pushToken && deviceLink.permissions.viewSchedule) {
          await sendEncryptedNotification(
            deviceLink.deviceInfo.pushToken,
            {
              title: appointment.title,
              body: `Påminnelse: ${appointment.title} om ${getTimeUntilAppointment(appointment.startTime)}`,
              data: {
                type: 'appointment_reminder',
                appointmentId: context.params.appointmentId,
                encrypted: true
              }
            }
          );
          
          // Log notification delivery
          await admin.firestore()
            .collection('notificationLog')
            .add({
              deviceLinkId: deviceLinkDoc.id,
              appointmentId: context.params.appointmentId,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              type: 'appointment_reminder',
              status: 'sent'
            });
        }
      }
    }
  });
```

**Acceptance Criteria:**
- [ ] Appointment notifications automatically sent to linked child devices
- [ ] Notifications respect device permissions (viewSchedule must be enabled)
- [ ] All notifications logged for delivery tracking
- [ ] Encrypted notifications preserve privacy
- [ ] Norwegian language used in notification text

#### Task 5.2: Family Coordination Intelligence
**File: `src/services/familyCoordination.ts`**
```typescript
export interface ConflictDetection {
  hasConflicts: boolean;
  conflicts: Array<{
    appointmentId: string;
    conflictType: 'overlap' | 'travel_time' | 'cultural_timing';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestions: string[];
  }>;
}

export const detectSchedulingConflicts = async (
  householdId: string,
  newAppointment: {
    startTime: Date;
    endTime?: Date;
    childId?: string;
    type: string;
    location?: string;
  }
): Promise<ConflictDetection> => {
  const conflicts = [];
  
  // Get all family appointments for the same day
  const startOfDay = new Date(newAppointment.startTime);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(newAppointment.startTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existingAppointments = await getAppointmentsInRange(
    householdId, 
    startOfDay, 
    endOfDay
  );
  
  // Check for overlaps
  for (const existing of existingAppointments) {
    if (appointmentsOverlap(newAppointment, existing)) {
      conflicts.push({
        appointmentId: existing.id,
        conflictType: 'overlap',
        severity: 'high',
        description: `Overlapper med ${existing.title}`,
        suggestions: [
          'Flytt til 30 minutter tidligere',
          'Flytt til 30 minutter senere',
          'Velg en annen dag'
        ]
      });
    }
  }
  
  // Check Norwegian cultural timing
  const culturalConflicts = getCulturalTimingConflicts(newAppointment);
  conflicts.push(...culturalConflicts);
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
};
```

**Acceptance Criteria:**
- [ ] Detects overlapping appointments across all family members
- [ ] Identifies Norwegian cultural timing conflicts (dinner time, etc.)
- [ ] Provides helpful suggestions for resolving conflicts
- [ ] Integrates with appointment creation flow
- [ ] Shows conflict severity levels

### Week 6: Polish & Norwegian Features

#### Task 6.1: "Hyttemodus" (Cabin Mode) Implementation
**File: `src/components/appointments/CabinModeScheduling.tsx`**
```typescript
interface CabinModeProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  location?: string;
}

export default function CabinModeScheduling({ enabled, onToggle, location }: CabinModeProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <View style={{
      backgroundColor: enabled ? theme.colors.accentSeafoam + "15" : theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: enabled ? 2 : 1,
      borderColor: enabled ? theme.colors.accentSeafoam : theme.colors.border,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Ionicons 
          name={enabled ? "home" : "home-outline"} 
          size={20} 
          color={enabled ? theme.colors.accentSeafoam : theme.colors.text} 
        />
        <Text style={{ 
          marginLeft: 8, 
          ...theme.typography.h2, 
          color: enabled ? theme.colors.accentSeafoam : theme.colors.text 
        }}>
          {(t("cabinMode") as string) || "Hyttemodus"}
        </Text>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.accentSeafoam }}
          style={{ marginLeft: "auto" }}
        />
      </View>
      
      {enabled && (
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 14, marginBottom: 8 }}>
            {(t("cabinModeDescription") as string) || 
             "Justerer tidsplaner for hyttesemester og utendørs aktiviteter"}
          </Text>
          
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                🌲 {(t("outdoorFocus") as string) || "Utendørs fokus"}
              </Text>
            </View>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                🌤️ {(t("weatherAware") as string) || "Væravhengig"}
              </Text>
            </View>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                ⏰ {(t("flexibleTiming") as string) || "Fleksible tider"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

**Acceptance Criteria:**
- [ ] Toggle enables/disables cabin mode for appointment scheduling
- [ ] Cabin mode adjusts notification timing for vacation context
- [ ] Integration with weather data for outdoor activities
- [ ] Visual indicators show cabin mode is active
- [ ] Norwegian cultural elements (hytte culture) reflected in UI

#### Task 6.2: Accessibility & Error Handling
**Files to update: All appointment and device linking components**

**Add accessibility labels:**
```typescript
// Example for AppointmentCard component
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={`Avtale: ${appointment.title}, ${formatDateTime(appointment.startTime)}`}
  accessibilityHint="Trykk for å se detaljer eller redigere avtalen"
  onPress={() => openAppointmentDetails(appointment.id)}
>
  <AppointmentCard appointment={appointment} />
</TouchableOpacity>
```

**Error boundaries for all new components:**
```typescript
// Add to each major component
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <View style={{ padding: 16, alignItems: "center" }}>
    <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
    <Text style={{ color: theme.colors.error, marginTop: 8, textAlign: "center" }}>
      {(t("somethingWentWrong") as string) || "Noe gikk galt"}
    </Text>
    <TouchableOpacity onPress={resetErrorBoundary} style={{ marginTop: 16 }}>
      <Text style={{ color: theme.colors.primary }}>
        {(t("tryAgain") as string) || "Prøv igjen"}
      </Text>
    </TouchableOpacity>
  </View>
);
```

**Acceptance Criteria:**
- [ ] All interactive elements have proper accessibility labels in Norwegian
- [ ] Screen reader support for appointment and device management
- [ ] Error boundaries prevent app crashes
- [ ] Loading states provide clear feedback
- [ ] Offline handling gracefully degrades functionality

---

## 🧪 Testing & Validation

### Security Testing Checklist
- [ ] **QR Code Security**: Test token expiration, replay attacks, interception attempts
- [ ] **Device Verification**: Verify codes can't be guessed or brute-forced  
- [ ] **Message Encryption**: Confirm all parent-child messages are encrypted end-to-end
- [ ] **Permission Management**: Test granular permissions work as expected
- [ ] **Audit Logging**: Verify all security events are properly logged

### User Experience Testing
- [ ] **Norwegian Families**: Test complete flow with 5+ Norwegian families
- [ ] **Cultural Appropriateness**: Verify cultural timing suggestions feel natural
- [ ] **Language Quality**: Confirm Norwegian translations are accurate and natural
- [ ] **Accessibility**: Test with screen readers and motor accessibility needs
- [ ] **Error Handling**: Test all error scenarios with helpful Norwegian explanations

### Performance Testing  
- [ ] **Appointment Creation**: < 2 seconds from start to finish
- [ ] **Device Linking**: < 30 seconds including verification
- [ ] **Notification Delivery**: < 5 seconds to linked devices
- [ ] **Cultural Suggestions**: < 1 second response time
- [ ] **Database Queries**: All appointment queries < 500ms

### Integration Testing
- [ ] **Norwegian Cultural Features**: Seasonal suggestions work correctly
- [ ] **School Integration**: Appointments integrate with existing school schedules
- [ ] **Notification System**: Works with existing push notification infrastructure  
- [ ] **Kids Screen**: New components integrate seamlessly with existing UI
- [ ] **Theme System**: New components respect existing Norwegian seasonal theming

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] **Firebase Functions**: All functions deployed to staging environment
- [ ] **Database Rules**: Security rules tested and deployed
- [ ] **Indexes**: All Firestore indexes created and optimized
- [ ] **Push Notifications**: FCM configured for appointment notifications
- [ ] **Localization**: Norwegian translations verified by native speaker

### Production Deployment
- [ ] **Environment Variables**: Production Firebase config in place
- [ ] **Security Rules**: Production Firestore rules deployed
- [ ] **Functions**: Production functions deployed with proper HTTPS endpoints
- [ ] **Monitoring**: Error monitoring and performance tracking active
- [ ] **Rollback Plan**: Ability to quickly revert if issues arise

### Post-Deployment Monitoring
- [ ] **Success Metrics**: Track appointment creation and device linking rates
- [ ] **Error Rates**: Monitor for security incidents or technical failures
- [ ] **Performance**: Verify all response time targets met in production
- [ ] **User Feedback**: Collect Norwegian family feedback on cultural features
- [ ] **Security Monitoring**: Watch for suspicious device linking attempts

---

## 📚 Documentation Updates

### Developer Documentation
- [ ] **Update CLAUDE.md**: Add appointments and device linking context
- [ ] **API Documentation**: Document all new Firebase Functions
- [ ] **Component Documentation**: JSDoc comments for all new components
- [ ] **Security Procedures**: Document device linking security protocols

### User Documentation
- [ ] **Norwegian User Guide**: Complete guide for Norwegian families
- [ ] **Cultural Features Guide**: Explain Norwegian cultural integration
- [ ] **Security Guide**: Transparent explanation of device linking security
- [ ] **Troubleshooting Guide**: Common issues and solutions in Norwegian

This comprehensive checklist ensures every aspect of the appointments and device linking implementation is properly planned, executed, and tested while maintaining the highest standards of security, cultural authenticity, and user experience.