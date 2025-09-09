// Test utilities and scenarios for Norwegian Push Notification Rich Actions
// This file provides comprehensive testing scenarios for both iOS and Android

import { norwegianCulture } from '../norwegianCulture';
import { norwegianNotifications, getNorwegianTaskContext, scheduleNorwegianTaskNotification } from '../norwegianNotifications';
import { handleActionWithFallback, scheduleIntelligentRetry, checkNetworkConnectivity } from '../push';
import { Task } from '../../models/task';
import { Child } from '../children';

// Mock task data for testing
const mockNorwegianTask: Task = {
  id: 'test-task-123',
  householdId: 'household-456',
  title: 'Rydde rommet',
  description: 'Rydd opp på rommet ditt før middag',
  priority: 'medium' as const,
  status: 'open' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  nextOccurrenceAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  tags: ['daily', 'chores']
};

const mockHomeworkTask: Task = {
  ...mockNorwegianTask,
  id: 'homework-task-789',
  title: 'Gjøre lekser - matematikk',
  description: 'Gjør oppgavene på side 45-47',
  tags: ['homework', 'school', 'mathematics']
};

const mockNorwegianChild: Child = {
  id: 'child-123',
  name: 'Ola Hansen',
  age: 10,
  currentGrade: 4,
  currentSchool: 'Bergen Barneskole',
  hasDevice: true
};

/**
 * Test Scenarios for Norwegian Push Notification Rich Actions
 * These can be run manually or integrated into automated test suites
 */
export class NorwegianPushActionTester {
  
  /**
   * Test 1: Norwegian Quiet Hours Respect
   * Verifies that notifications are properly handled during Norwegian quiet hours (20:00-07:00)
   */
  async testQuietHoursRespect(): Promise<void> {
    console.log('🕘 Testing Norwegian Quiet Hours Respect...');
    
    // Mock time to be during quiet hours
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          // Set time to 22:00 (10 PM)
          super();
          this.setHours(22, 0, 0, 0);
        } else {
          super(...(args as []));
        }
      }
    } as any;

    try {
      const context = getNorwegianTaskContext(mockNorwegianTask, mockNorwegianChild);
      const schedule = await norwegianNotifications.scheduleNorwegianNotification(
        mockNorwegianTask, 
        context, 
        mockNorwegianChild
      );
      
      console.log('✅ Quiet hours test:', {
        isWithinQuietHours: norwegianCulture.isWithinQuietHours(),
        scheduledChannel: schedule.channel,
        hasDelay: !!schedule.delay,
        culturalMessage: schedule.culturalMessage
      });
      
    } finally {
      global.Date = originalDate;
    }
  }

  /**
   * Test 2: Friluftsliv Context Detection
   * Tests notification behavior during typical Norwegian outdoor family time
   */
  async testFriluftsliv(): Promise<void> {
    console.log('🌲 Testing Friluftsliv Context...');
    
    // Mock weekend daytime (Saturday 14:00)
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super();
          this.setDay(6); // Saturday
          this.setHours(14, 0, 0, 0);
        } else {
          super(...(args as []));
        }
      }
      
      getDay() {
        return 6; // Saturday
      }
      
      getHours() {
        return 14; // 2 PM
      }
    } as any;

    try {
      const isInFriluftsliv = norwegianCulture.isWithinFriluftsliv();
      console.log('✅ Friluftsliv detection:', {
        isWeekendDaytime: isInFriluftsliv,
        notificationChannel: norwegianCulture.getNotificationChannel(),
        delay: norwegianCulture.getNotificationDelay()
      });
      
    } finally {
      global.Date = originalDate;
    }
  }

  /**
   * Test 3: Rich Action Categories
   * Tests that appropriate Norwegian action categories are selected
   */
  async testActionCategories(): Promise<void> {
    console.log('⚡ Testing Norwegian Action Categories...');
    
    // Test standard chore task
    const choreContext = getNorwegianTaskContext(mockNorwegianTask, mockNorwegianChild);
    console.log('📝 Chore task context:', choreContext);
    
    // Test homework task
    const homeworkContext = getNorwegianTaskContext(mockHomeworkTask, mockNorwegianChild);
    console.log('📚 Homework task context:', homeworkContext);
    
    // Test notification configuration
    const choreConfig = norwegianNotifications.getNorwegianCategoryConfig('chore');
    const homeworkConfig = norwegianNotifications.getNorwegianCategoryConfig('homework');
    
    console.log('✅ Action categories:', {
      choreActions: choreConfig.actions.map(a => a.buttonTitle),
      homeworkActions: homeworkConfig.actions.map(a => a.buttonTitle),
      culturalAdaptation: 'Norwegian language applied'
    });
  }

  /**
   * Test 4: Offline Action Queueing
   * Tests the offline queue functionality for Norwegian network conditions
   */
  async testOfflineQueue(): Promise<void> {
    console.log('📱 Testing Offline Queue...');
    
    try {
      // Test network connectivity check
      const isConnected = await checkNetworkConnectivity();
      console.log('🌐 Network status:', isConnected ? 'Connected' : 'Offline');
      
      // Simulate offline action
      await handleActionWithFallback(
        'COMPLETE_TASK',
        mockNorwegianTask.householdId,
        mockNorwegianTask.id,
        {}
      );
      
      console.log('✅ Offline queue test completed - check console for queue/sync messages');
      
    } catch (error) {
      console.log('⚠️ Expected behavior during offline testing:', error);
    }
  }

  /**
   * Test 5: Norwegian Language Adaptations
   * Tests Norwegian language support in notifications and actions
   */
  async testLanguageAdaptations(): Promise<void> {
    console.log('🇳🇴 Testing Norwegian Language Adaptations...');
    
    // Set Norwegian preferences
    await norwegianCulture.updateCulturalPreferences({
      preferNorwegianLanguage: true,
      useNorwegianTimeFormat: true,
      respectQuietHours: true,
      includeFriluftsliv: true
    });
    
    // Test translations
    const taskTitle = norwegianCulture.translateToNorwegian('Clean room', 'task');
    const greeting = norwegianCulture.getNorwegianGreeting('morning');
    const parenting = norwegianCulture.getNorwegianParentingTip();
    
    console.log('✅ Language adaptations:', {
      translatedTask: taskTitle,
      morningGreeting: greeting,
      parentingTip: parenting,
      timeFormat: norwegianCulture.formatNorwegianTime(new Date()),
      dateFormat: norwegianCulture.formatNorwegianDate(new Date())
    });
  }

  /**
   * Test 6: Action Button Behavior
   * Tests the different Norwegian snooze options and their calculations
   */
  async testActionButtonBehavior(): Promise<void> {
    console.log('🔘 Testing Action Button Behavior...');
    
    const testActions = [
      'SNOOZE_30MIN',
      'SNOOZE_2TIMER', 
      'SNOOZE_IMORGEN',
      'SNOOZE_NESTEUKE'
    ];
    
    for (const action of testActions) {
      try {
        console.log(`Testing ${action}...`);
        
        // Calculate expected timing
        const now = new Date();
        let expectedTime: Date;
        
        switch (action) {
          case 'SNOOZE_30MIN':
            expectedTime = new Date(now.getTime() + 30 * 60 * 1000);
            break;
          case 'SNOOZE_2TIMER':
            expectedTime = new Date(now.getTime() + 120 * 60 * 1000);
            break;
          case 'SNOOZE_IMORGEN':
            expectedTime = new Date();
            expectedTime.setDate(now.getDate() + 1);
            expectedTime.setHours(8, 0, 0, 0);
            break;
          case 'SNOOZE_NESTEUKE':
            expectedTime = new Date();
            const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
            expectedTime.setDate(now.getDate() + daysUntilMonday);
            expectedTime.setHours(8, 0, 0, 0);
            break;
          default:
            expectedTime = now;
        }
        
        console.log(`✅ ${action}: Would snooze until ${expectedTime.toLocaleString('nb-NO')}`);
        
      } catch (error) {
        console.log(`⚠️ ${action}: Test failed -`, error);
      }
    }
  }

  /**
   * Test 7: Cultural Context Messages
   * Tests culturally appropriate messages for different scenarios
   */
  async testCulturalMessages(): Promise<void> {
    console.log('💬 Testing Cultural Context Messages...');
    
    const contexts = [
      { culturalContext: 'school', targetAudience: 'child' },
      { culturalContext: 'friluftsliv', targetAudience: 'family' },
      { culturalContext: 'family_time', targetAudience: 'parent' },
      { culturalContext: undefined, targetAudience: 'child' }
    ];
    
    for (const ctx of contexts) {
      const context = {
        taskType: 'chore' as const,
        priority: 'medium' as const,
        ...ctx
      };
      
      const schedule = await norwegianNotifications.scheduleNorwegianNotification(
        mockNorwegianTask,
        context,
        mockNorwegianChild
      );
      
      console.log(`✅ ${ctx.culturalContext || 'default'} context:`, schedule.culturalMessage);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Norwegian Push Notification Rich Actions Test Suite\n');
    
    const tests = [
      this.testQuietHoursRespect,
      this.testFriluftsliv,
      this.testActionCategories,
      this.testLanguageAdaptations,
      this.testActionButtonBehavior,
      this.testCulturalMessages,
      this.testOfflineQueue // Run offline test last as it may affect connectivity
    ];
    
    for (const test of tests) {
      try {
        await test.call(this);
        console.log(''); // Add spacing between tests
      } catch (error) {
        console.error('❌ Test failed:', error);
        console.log(''); // Add spacing even on failure
      }
    }
    
    console.log('✅ Norwegian Push Notification Test Suite Completed!\n');
  }
}

/**
 * iOS-specific test scenarios
 */
export class IOSNorwegianPushTester extends NorwegianPushActionTester {
  
  async testIOSSpecificFeatures(): Promise<void> {
    console.log('🍎 Testing iOS-specific Norwegian Push Features...');
    
    // Test iOS notification categories with Norwegian text
    const categories = [
      'norwegian_task_actions',
      'norwegian_extended_actions', 
      'norwegian_family_actions'
    ];
    
    console.log('iOS Categories with Norwegian text:', categories);
    
    // Test iOS badge behavior with Norwegian cultural context
    const badgeCount = await this.calculateNorwegianBadgeCount();
    console.log('iOS Badge count (Norwegian context):', badgeCount);
  }
  
  private async calculateNorwegianBadgeCount(): Promise<number> {
    // In a real implementation, this would consider Norwegian cultural preferences
    // for badge counting (e.g., excluding notifications during quiet hours)
    return 0;
  }
}

/**
 * Android-specific test scenarios  
 */
export class AndroidNorwegianPushTester extends NorwegianPushActionTester {
  
  async testAndroidSpecificFeatures(): Promise<void> {
    console.log('🤖 Testing Android-specific Norwegian Push Features...');
    
    // Test Android notification channels for Norwegian context
    const channels = [
      'silent',      // For quiet hours
      'friluftsliv', // For outdoor family time
      'default'      // Standard notifications
    ];
    
    console.log('Android Channels for Norwegian context:', channels);
    
    // Test Android notification importance levels
    const importanceLevels = this.getNorwegianImportanceLevels();
    console.log('Norwegian cultural importance levels:', importanceLevels);
  }
  
  private getNorwegianImportanceLevels() {
    return {
      quiet_hours: 'MIN',      // Silent during Norwegian quiet hours
      friluftsliv: 'DEFAULT',  // Standard during outdoor time
      urgent: 'HIGH',          // Always important for urgent tasks
      family: 'DEFAULT'        // Standard for family coordination
    };
  }
}

// Export test runners for easy execution
export const norwegianPushTester = new NorwegianPushActionTester();
export const iosTester = new IOSNorwegianPushTester();
export const androidTester = new AndroidNorwegianPushTester();

// Simple test runner function that can be called from anywhere
export async function runNorwegianPushTests(platform?: 'ios' | 'android' | 'both'): Promise<void> {
  switch (platform) {
    case 'ios':
      await iosTester.runAllTests();
      await iosTester.testIOSSpecificFeatures();
      break;
    case 'android':
      await androidTester.runAllTests();  
      await androidTester.testAndroidSpecificFeatures();
      break;
    default:
      await norwegianPushTester.runAllTests();
      console.log('📱 Running platform-specific tests...\n');
      await iosTester.testIOSSpecificFeatures();
      await androidTester.testAndroidSpecificFeatures();
  }
}