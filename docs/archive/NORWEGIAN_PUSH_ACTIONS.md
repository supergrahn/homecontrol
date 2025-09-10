# Norwegian Push Notification Rich Actions

## Overview

The Norwegian Push Notification Rich Actions system provides culturally-aware, intelligent push notification management specifically designed for Norwegian families using the POTY app. This system respects Norwegian cultural values, time preferences, and family dynamics while providing superior user experience through rich notification actions.

## Key Features

### ✅ Core Rich Actions Implemented
- **Mark Complete** (✅ Ferdig) - One-tap task completion
- **Snooze Options** - Norwegian time preferences:
  - 30 minutes (30 min)
  - 2 hours (2 timer) 
  - Tomorrow morning (I morgen - 08:00)
  - Next week (Neste uke - Monday 08:00)
- **Accept Task** (👥 Jeg tar den) - Family member accepts responsibility
- **Reassign** (🔄 Gi til annen) - Transfer to another family member
- **Quick Add Related** (➕ Legg til lignende) - Add similar task

### 🇳🇴 Norwegian Cultural Integration
- **Quiet Hours Respect** (20:00-07:00) - No disturbing notifications during Norwegian quiet time
- **Friluftsliv Context** - Reduced notifications during outdoor family time (weekends 10:00-16:00)
- **Norwegian Language Support** - Full translation of actions and messages
- **Family Hierarchy Respect** - Parent vs child permission considerations
- **Seasonal Awareness** - Context-aware messaging for Norwegian seasons

### 📱 Technical Excellence
- **Offline Capability** - Actions queue when offline and sync when connection restored
- **Error Handling** - Comprehensive retry logic with exponential backoff
- **Cross-platform** - Works seamlessly on both iOS and Android
- **Performance Optimized** - Intelligent delivery scheduling

## Architecture

```
┌─────────────────────────────────────┐
│        Norwegian Push Actions       │
├─────────────────────────────────────┤
│  🇳🇴 Cultural Context Service      │
│  📱 Push Notification Manager      │ 
│  📤 Outbox Queue System            │
│  ⚡ Rich Action Handlers           │
│  🔄 Intelligent Retry Logic        │
└─────────────────────────────────────┘
```

## Implementation Guide

### 1. Basic Setup

The system is automatically configured when the app starts. Ensure these services are initialized:

```typescript
import { configureNotificationCategories, registerNotificationResponseHandler } from './services/push';
import { norwegianCulture } from './services/norwegianCulture';
import { norwegianNotifications } from './services/norwegianNotifications';

// In your app initialization
await configureNotificationCategories();
registerNotificationResponseHandler();
```

### 2. Scheduling Norwegian-Aware Notifications

```typescript
import { scheduleNorwegianTaskNotification, getNorwegianTaskContext } from './services/norwegianNotifications';

// Schedule a notification with Norwegian cultural context
const context = getNorwegianTaskContext(task, child);
const notificationId = await scheduleNorwegianTaskNotification(task, context, child);
```

### 3. Cultural Preferences Management

```typescript
import { norwegianCulture } from './services/norwegianCulture';

// Update user's cultural preferences
await norwegianCulture.updateCulturalPreferences({
  preferNorwegianLanguage: true,
  respectQuietHours: true,
  includeFriluftsliv: true,
  useNorwegianTimeFormat: true
});
```

## Norwegian Cultural Considerations

### Quiet Hours (Stilletid)
- **Time**: 20:00-07:00 (8 PM - 7 AM)
- **Behavior**: Notifications are delivered through silent channel
- **Rationale**: Respects Norwegian cultural norm of not disturbing evening/morning family time

### Friluftsliv (Outdoor Life)
- **Time**: Weekends 10:00-16:00
- **Behavior**: Reduced notification frequency, gentler delivery
- **Rationale**: Recognizes Norwegian cultural importance of outdoor family activities

### Norwegian Time Format
- **24-hour format** preferred (14:30 instead of 2:30 PM)
- **Date format**: DD.MM.YYYY
- **Week starts**: Monday

### Family Hierarchy
- **Parents**: Full access to all actions
- **Children**: Age-appropriate action limitations
- **Respect**: Norwegian democratic family values while maintaining structure

## Rich Action Categories

### 1. Standard Task Actions (norwegian_task_actions)
```typescript
- ✅ Ferdig (Complete)
- ⏰ 30 min (Snooze 30 minutes)
- ⏰ 2 timer (Snooze 2 hours)
```

### 2. Extended Actions (norwegian_extended_actions)
```typescript
- 👥 Jeg tar den (I'll take it)
- 📅 I morgen (Tomorrow)
- 📅 Neste uke (Next week)
```

### 3. Family Actions (norwegian_family_actions)
```typescript
- 🔄 Gi til annen (Reassign)
- ➕ Legg til lignende (Add similar)
- ✅ Ferdig (Complete)
```

## Offline Support

The system includes robust offline support for Norwegian network conditions:

### Automatic Queueing
- Actions automatically queue when network is unavailable
- User receives feedback in Norwegian about offline status
- Background sync attempts when connectivity resumes

### Intelligent Retry
```typescript
import { scheduleIntelligentRetry } from './services/push';

// Manually trigger sync attempt
await scheduleIntelligentRetry();
```

### Queue Management
```typescript
import { getOutboxCount, flushOutbox } from './services/outbox';

const pendingCount = await getOutboxCount();
const result = await flushOutbox(); // { ok: number, fail: number }
```

## Testing

### Running Tests

```typescript
import { runNorwegianPushTests } from './services/__tests__/norwegianPushActions.test';

// Test all functionality
await runNorwegianPushTests();

// Test specific platform
await runNorwegianPushTests('ios');
await runNorwegianPushTests('android');
```

### Manual Testing Checklist

#### ✅ Cultural Context
- [ ] Notifications respect quiet hours (20:00-07:00)
- [ ] Friluftsliv detection works (weekends 10:00-16:00)  
- [ ] Norwegian language appears in action buttons
- [ ] Time format uses 24-hour Norwegian style

#### ✅ Rich Actions
- [ ] ✅ Ferdig - Task marked complete
- [ ] ⏰ 30 min - Task snoozed 30 minutes
- [ ] ⏰ 2 timer - Task snoozed 2 hours  
- [ ] 📅 I morgen - Task snoozed until tomorrow 08:00
- [ ] 📅 Neste uke - Task snoozed until next Monday 08:00
- [ ] 👥 Jeg tar den - Task accepted by user
- [ ] 🔄 Gi til annen - Opens reassignment flow
- [ ] ➕ Legg til lignende - Opens new related task

#### ✅ Offline Functionality
- [ ] Actions queue when offline
- [ ] Norwegian feedback message appears
- [ ] Actions sync when connection restored
- [ ] Success/failure messages in Norwegian

#### ✅ Cross-platform
- [ ] iOS: Notification categories work correctly
- [ ] iOS: Actions don't require opening app (where appropriate)
- [ ] Android: Notification channels respect cultural context
- [ ] Android: Action buttons display Norwegian text

## Error Handling

The system includes comprehensive error handling:

### Retry Logic
- **Exponential backoff** with configurable parameters
- **Maximum retry attempts** (default: 3)
- **Fallback to offline queue** when all retries fail

### User Feedback
- **Norwegian language messages** for all error states
- **Toast notifications** with appropriate duration
- **Visual indicators** for pending sync status

### Monitoring
- **Console logging** for debugging
- **Error reporting** integration points
- **Analytics tracking** for Norwegian cultural adaptations

## Performance Considerations

### Delivery Optimization
- **Cultural timing** prevents unnecessary wake-ups during quiet hours
- **Intelligent scheduling** reduces notifications during friluftsliv time
- **Batch processing** for multiple queued actions

### Battery Efficiency  
- **Silent channels** during quiet hours (no sound/vibration)
- **Delayed delivery** instead of immediate rejection
- **Background sync** optimized for Norwegian usage patterns

## Integration with Firebase Functions

The client-side rich actions integrate with Firebase Cloud Functions for server-side processing:

### Function Triggers
- Task state changes trigger appropriate notifications
- Norwegian cultural context included in function calls
- Household member roles respected in notification routing

### Payload Structure
```typescript
{
  hid: "household-id",
  taskId: "task-id", 
  type: "task",
  culturalContext: "school" | "friluftsliv" | "family_time",
  targetAudience: "parent" | "child" | "family",
  language: "no" | "en"
}
```

## Troubleshooting

### Common Issues

1. **Actions not appearing**
   - Check notification permissions
   - Verify `configureNotificationCategories()` called
   - Ensure Norwegian preferences set correctly

2. **Quiet hours not working**
   - Verify timezone setting (Europe/Oslo)
   - Check `respectQuietHours` preference
   - Confirm current time detection

3. **Offline queue not syncing**
   - Check network connectivity
   - Verify Firebase configuration
   - Look for background app refresh settings

4. **Norwegian text not showing**
   - Confirm `preferNorwegianLanguage: true`
   - Check device language settings
   - Verify translation files loaded

### Debug Helpers

```typescript
// Check cultural preferences
const prefs = await norwegianCulture.getCulturalPreferences();
console.log('Norwegian preferences:', prefs);

// Test network connectivity
const isConnected = await checkNetworkConnectivity();
console.log('Network status:', isConnected);

// Check outbox status
const pendingCount = await getOutboxCount();
console.log('Pending actions:', pendingCount);
```

## Future Enhancements

### Planned Features
- **Location-based friluftsliv detection** using GPS
- **Calendar integration** for automatic quiet hours
- **Voice actions** in Norwegian for accessibility
- **Smart scheduling** based on family routines

### Norwegian Market Expansion
- **Regional dialects** support (Bokmål vs Nynorsk)
- **Kommune-specific** holiday recognition  
- **School system integration** for grade-appropriate actions
- **Weather-aware** notifications for outdoor activities

## Contributing

When contributing to Norwegian Push Actions:

1. **Test thoroughly** on both iOS and Android
2. **Respect cultural context** - understand Norwegian family values
3. **Maintain offline capability** - Norwegian network conditions vary
4. **Use appropriate Norwegian** - consult native speakers for translations
5. **Consider accessibility** - support for all family members

## Support

For issues specific to Norwegian Push Notification Rich Actions:

1. Check this documentation first
2. Run the test suite to identify specific failures
3. Review console logs for cultural context warnings
4. Test with different Norwegian cultural settings
5. Verify behavior during different times of day/week

The Norwegian Push Notification Rich Actions system represents a significant enhancement to POTY's Norwegian market readiness, providing families with a culturally-appropriate, technically robust notification experience that respects Norwegian values while delivering superior functionality.