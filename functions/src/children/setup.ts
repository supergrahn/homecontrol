import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateNorwegianCompliance } from '../security/dataValidation';

// Configure for Norwegian users in Europe
setGlobalOptions({ region: 'europe-west1' });

const db = getFirestore();

interface ChildSetupRequest {
  householdId: string;
  parentUserId: string;
  childData: {
    name: string;
    age: number;
    dateOfBirth?: string;
    school?: {
      name: string;
      grade: string;
      municipality: string;
      class?: string;
      hasAfterSchool?: boolean; // SFO/AKS
    };
    deviceAccess?: {
      hasDevice: boolean;
      deviceType?: 'phone' | 'smartwatch' | 'tablet' | 'computer';
      parentalControls: boolean;
      allowedHours?: {
        weekday: { start: string; end: string };
        weekend: { start: string; end: string };
      };
    };
    norwegianPreferences?: {
      language: 'no' | 'en';
      culturalActivities: string[];
      outdoorActivities: boolean; // Friluftsliv
    };
    parentalConsent: boolean;
    dataProcessingConsent: boolean;
  };
}

interface ChildSetupResult {
  childId: string;
  ageGroup: 'young' | 'middle' | 'teen';
  deviceSetup: boolean;
  schoolIntegration: boolean;
  rewardSystemEnabled: boolean;
  norwegianCompliance: boolean;
}

interface DeviceSetupRequest {
  childId: string;
  householdId: string;
  parentUserId: string;
  deviceConfig: {
    deviceType: 'phone' | 'smartwatch' | 'tablet' | 'computer';
    parentalControls: boolean;
    allowedApps?: string[];
    timeRestrictions?: {
      weekday: { start: string; end: string };
      weekend: { start: string; end: string };
      bedtimeMode: boolean;
    };
    locationTracking?: boolean;
    emergencyContacts?: string[];
  };
}

interface DeviceSetupResult {
  deviceId: string;
  setupComplete: boolean;
  parentalControlsActive: boolean;
  norwegianPrivacyCompliant: boolean;
}

interface SchoolIntegrationRequest {
  childId: string;
  householdId: string;
  schoolData: {
    name: string;
    municipality: string;
    grade: string;
    class?: string;
    teacherContact?: string;
    hasAfterSchool: boolean;
    schoolPlatforms?: string[]; // Which Norwegian platforms they use
  };
  parentConsent: boolean;
}

interface SchoolIntegrationResult {
  integrationId: string;
  supportedPlatforms: string[];
  dataAccessEnabled: boolean;
  norwegianPrivacyCompliant: boolean;
}

/**
 * Determines age group based on Norwegian school system and child development
 */
function determineAgeGroup(age: number): 'young' | 'middle' | 'teen' {
  if (age <= 7) return 'young';    // Barneskole early years
  if (age <= 12) return 'middle';  // Barneskole later years
  return 'teen';                   // Ungdomsskole + VGS
}

/**
 * Creates child account with Norwegian cultural context and privacy compliance
 */
export const createChildAccount = onCall<ChildSetupRequest, ChildSetupResult>(
  async (request) => {
    const { householdId, parentUserId, childData } = request.data;
    
    logger.info('Norwegian child account creation started', {
      householdId,
      childAge: childData.age,
      hasSchool: !!childData.school,
      timestamp: new Date().toISOString()
    });

    try {
      // Verify parent permissions
      const householdRef = db.collection('households').doc(householdId);
      const householdDoc = await householdRef.get();
      
      if (!householdDoc.exists) {
        throw new HttpsError('not-found', 'Household not found');
      }

      const householdData = householdDoc.data();
      if (!householdData?.members?.includes(parentUserId)) {
        throw new HttpsError('permission-denied', 'Parent must be household member');
      }

      // Determine age group
      const ageGroup = determineAgeGroup(childData.age);
      
      // Validate Norwegian GDPR+ compliance
      const complianceCheck = await validateNorwegianCompliance({
        data: {
          dataType: 'child',
          data: {
            ...childData,
            ageGroup,
            norwegianDataResidency: true
          },
          householdId,
          parentUserId
        }
      } as any);

      if (!complianceCheck.norwegianCompliance.childDataProtected) {
        throw new HttpsError('failed-precondition', 'Norwegian child data protection requirements not met');
      }

      // Create child document
      const childRef = db.collection('children').doc();
      const childId = childRef.id;

      const childDocument = {
        id: childId,
        name: childData.name,
        age: childData.age,
        ageGroup,
        dateOfBirth: childData.dateOfBirth || null,
        householdId,
        parentIds: [parentUserId],
        
        // Norwegian school integration
        school: childData.school ? {
          name: childData.school.name,
          grade: childData.school.grade,
          municipality: childData.school.municipality,
          class: childData.school.class || null,
          hasAfterSchool: childData.school.hasAfterSchool || false,
          integrationType: 'pending' // Will be set up separately
        } : null,

        // Device access based on age
        deviceAccess: childData.deviceAccess || {
          hasDevice: ageGroup === 'teen',
          parentalControls: true,
          allowedHours: ageGroup === 'young' ? null : {
            weekday: { start: '16:00', end: '19:00' },
            weekend: { start: '09:00', end: '20:00' }
          }
        },

        // Norwegian cultural preferences
        norwegianPreferences: {
          language: childData.norwegianPreferences?.language || 'no',
          culturalActivities: childData.norwegianPreferences?.culturalActivities || ['dugnad', 'friluftsliv'],
          outdoorActivities: childData.norwegianPreferences?.outdoorActivities ?? true,
          observeNorwegianHolidays: true,
          quietTimePreference: {
            start: '20:00',
            end: '07:00'
          }
        },

        // Reward system setup (age appropriate)
        rewards: {
          enabled: true,
          points: 0,
          level: ageGroup === 'young' ? 'Småtroll' : ageGroup === 'middle' ? 'Hjelper' : 'Ansvarlig',
          achievements: [],
          norwegianAchievements: {
            dugnadDeltaker: false,
            friluftsliv: false,
            hjelpsom: false,
            ansvarlig: false
          }
        },

        // Privacy and compliance
        privacy: {
          parentalConsent: childData.parentalConsent,
          dataProcessingConsent: childData.dataProcessingConsent,
          norwegianDataResidency: true,
          gdprCompliant: true,
          lastConsentUpdate: FieldValue.serverTimestamp()
        },

        // Metadata
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: parentUserId,
        norwegianCompliance: true
      };

      const batch = db.batch();
      
      // Create child document
      batch.set(childRef, childDocument);

      // Update household with new child
      batch.update(householdRef, {
        childrenIds: FieldValue.arrayUnion(childId),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Create initial reward system entry
      if (ageGroup !== 'young') {
        const rewardRef = db.collection('rewards').doc(`${childId}_system`);
        batch.set(rewardRef, {
          childId,
          householdId,
          totalPoints: 0,
          currentLevel: childDocument.rewards.level,
          norwegianAchievements: childDocument.rewards.norwegianAchievements,
          createdAt: FieldValue.serverTimestamp()
        });
      }

      await batch.commit();

      // Set up school integration if provided
      let schoolIntegration = false;
      if (childData.school) {
        try {
          await setupSchoolIntegration({
            data: {
              childId,
              householdId,
              schoolData: {
                name: childData.school.name,
                municipality: childData.school.municipality,
                grade: childData.school.grade,
                class: childData.school.class || '',
                hasAfterSchool: childData.school.hasAfterSchool || false,
                schoolPlatforms: [] // Will be detected automatically
              },
              parentConsent: true
            }
          } as any);
          schoolIntegration = true;
        } catch (error) {
          logger.warn('School integration setup failed', { childId, error });
        }
      }

      logger.info('Norwegian child account created successfully', {
        childId,
        ageGroup,
        hasSchool: !!childData.school,
        schoolIntegration
      });

      return {
        childId,
        ageGroup,
        deviceSetup: !!childData.deviceAccess?.hasDevice,
        schoolIntegration,
        rewardSystemEnabled: ageGroup !== 'young',
        norwegianCompliance: true
      };

    } catch (error) {
      logger.error('Error creating Norwegian child account', { error, householdId });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Child account creation failed');
    }
  }
);

/**
 * Sets up device access and parental controls for Norwegian children
 */
export const setupChildDevice = onCall<DeviceSetupRequest, DeviceSetupResult>(
  async (request) => {
    const { childId, householdId, parentUserId, deviceConfig } = request.data;
    
    logger.info('Norwegian child device setup started', { childId, deviceType: deviceConfig.deviceType });

    try {
      // Verify permissions
      const childRef = db.collection('children').doc(childId);
      const childDoc = await childRef.get();
      
      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found');
      }

      const childData = childDoc.data();
      if (childData?.householdId !== householdId || !childData?.parentIds?.includes(parentUserId)) {
        throw new HttpsError('permission-denied', 'Parent permission required');
      }

      // Age-appropriate device restrictions
      const ageGroup = childData.ageGroup;
      const ageAppropriateConfig = {
        young: {
          allowedDeviceTypes: ['tablet'],
          maxDailyHours: 2,
          requiresSupervision: true,
          allowedApps: ['educational', 'creative']
        },
        middle: {
          allowedDeviceTypes: ['tablet', 'computer', 'smartwatch'],
          maxDailyHours: 3,
          requiresSupervision: false,
          allowedApps: ['educational', 'creative', 'communication', 'games']
        },
        teen: {
          allowedDeviceTypes: ['phone', 'tablet', 'computer', 'smartwatch'],
          maxDailyHours: 5,
          requiresSupervision: false,
          allowedApps: ['all']
        }
      };

      const restrictions = ageAppropriateConfig[ageGroup as keyof typeof ageAppropriateConfig];
      
      if (!restrictions.allowedDeviceTypes.includes(deviceConfig.deviceType)) {
        throw new HttpsError('invalid-argument', `Device type ${deviceConfig.deviceType} not appropriate for age group ${ageGroup}`);
      }

      // Create device configuration
      const deviceRef = db.collection('childDevices').doc();
      const deviceId = deviceRef.id;

      const deviceDocument = {
        id: deviceId,
        childId,
        householdId,
        parentUserId,
        
        // Device configuration
        deviceType: deviceConfig.deviceType,
        parentalControls: {
          enabled: deviceConfig.parentalControls,
          ageAppropriate: true,
          maxDailyHours: restrictions.maxDailyHours,
          requiresSupervision: restrictions.requiresSupervision,
          
          // Norwegian quiet time compliance
          quietHours: {
            weekday: { start: '20:00', end: '07:00' },
            weekend: { start: '21:00', end: '08:00' }
          },
          
          // App restrictions
          allowedApps: deviceConfig.allowedApps || restrictions.allowedApps,
          blockedContent: ['adult', 'violence', 'inappropriate'],
          
          // Time restrictions
          timeRestrictions: deviceConfig.timeRestrictions || {
            weekday: { start: '16:00', end: '19:00' },
            weekend: { start: '09:00', end: '20:00' },
            bedtimeMode: true
          }
        },

        // Safety features
        safety: {
          locationTracking: deviceConfig.locationTracking ?? (ageGroup !== 'young'),
          emergencyContacts: deviceConfig.emergencyContacts || [],
          safetyMode: ageGroup === 'young',
          norwegianEmergencyNumbers: ['112', '113', '110', '116117']
        },

        // Norwegian privacy compliance
        privacy: {
          dataMinimization: true,
          norwegianDataResidency: true,
          parentalConsentRequired: ageGroup === 'young',
          automaticDataDeletion: true,
          thirdPartySharing: false
        },

        // Metadata
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        setupBy: parentUserId,
        norwegianCompliance: true
      };

      const batch = db.batch();

      // Create device document
      batch.set(deviceRef, deviceDocument);

      // Update child document with device info
      batch.update(childRef, {
        deviceAccess: {
          hasDevice: true,
          deviceType: deviceConfig.deviceType,
          deviceId,
          parentalControls: deviceConfig.parentalControls,
          setupDate: FieldValue.serverTimestamp()
        },
        updatedAt: FieldValue.serverTimestamp()
      });

      await batch.commit();

      logger.info('Norwegian child device setup completed', { childId, deviceId, deviceType: deviceConfig.deviceType });

      return {
        deviceId,
        setupComplete: true,
        parentalControlsActive: deviceConfig.parentalControls,
        norwegianPrivacyCompliant: true
      };

    } catch (error) {
      logger.error('Error setting up child device', { error, childId });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Child device setup failed');
    }
  }
);

/**
 * Sets up Norwegian school integration for a child
 */
export const setupSchoolIntegration = onCall<SchoolIntegrationRequest, SchoolIntegrationResult>(
  async (request) => {
    const { childId, householdId, schoolData, parentConsent } = request.data;
    
    logger.info('Norwegian school integration setup started', { 
      childId, 
      schoolName: schoolData.name,
      municipality: schoolData.municipality 
    });

    try {
      if (!parentConsent) {
        throw new HttpsError('permission-denied', 'Parent consent required for school integration');
      }

      // Verify child exists
      const childRef = db.collection('children').doc(childId);
      const childDoc = await childRef.get();
      
      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found');
      }

      // Check for existing school integration
      const existingIntegrationQuery = db.collection('norwegianSchoolIntegrations')
        .where('childId', '==', childId);
      const existingIntegrations = await existingIntegrationQuery.get();

      // Remove any existing integrations
      const batch = db.batch();
      existingIntegrations.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Detect supported Norwegian school platforms by municipality
      const municipalityPlatforms: Record<string, string[]> = {
        'oslo': ['vigilo', 'itslearning', 'klassekameraten'],
        'bergen': ['itslearning', 'showbie', 'teams'],
        'trondheim': ['itslearning', 'vigilo', 'teams'],
        'stavanger': ['itslearning', 'canvas', 'teams'],
        'kristiansand': ['itslearning', 'showbie'],
        'fredrikstad': ['itslearning', 'vigilo'],
        'default': ['itslearning', 'teams'] // Most common platforms
      };

      const supportedPlatforms = municipalityPlatforms[schoolData.municipality.toLowerCase()] || 
                                municipalityPlatforms.default;

      // Create school integration document
      const integrationRef = db.collection('norwegianSchoolIntegrations').doc();
      const integrationId = integrationRef.id;

      const integrationDocument = {
        id: integrationId,
        childId,
        householdId,
        
        // School information
        school: {
          name: schoolData.name,
          municipality: schoolData.municipality,
          grade: schoolData.grade,
          class: schoolData.class || null,
          teacherContact: schoolData.teacherContact || null,
          hasAfterSchool: schoolData.hasAfterSchool
        },

        // Platform integration
        platforms: {
          supported: supportedPlatforms,
          enabled: [], // Will be enabled when credentials are provided
          detectedPlatforms: schoolData.schoolPlatforms || [],
          syncStatus: 'pending_setup'
        },

        // Integration capabilities
        capabilities: {
          scheduleSync: true,
          homeworkTracking: true,
          gradeAccess: false, // Requires explicit consent
          attendanceTracking: schoolData.hasAfterSchool,
          parentTeacherCommunication: false // Requires teacher consent
        },

        // Norwegian educational context
        norwegianEducation: {
          schoolYear: new Date().getFullYear() + (new Date().getMonth() >= 8 ? 0 : -1),
          curriculum: 'LK20', // Norwegian curriculum
          language: 'no',
          culturalEvents: ['constitution_day', 'winter_break', 'easter_break', 'summer_break'],
          afterSchoolProgram: schoolData.hasAfterSchool ? (schoolData.grade <= '4' ? 'SFO' : 'AKS') : null
        },

        // Privacy and compliance
        privacy: {
          parentalConsent: parentConsent,
          dataAccessLevel: 'basic', // basic | extended | full
          norwegianPrivacyLaws: true,
          dataRetentionPeriod: 365, // 1 year
          thirdPartySharing: false,
          gdprCompliant: true
        },

        // Sync configuration
        sync: {
          frequency: 'daily',
          quietHours: { start: '20:00', end: '07:00' },
          norwegianHolidaySync: true,
          weekendSync: false,
          automaticTaskCreation: true
        },

        // Metadata
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        setupBy: 'parent',
        status: 'active',
        norwegianCompliance: true
      };

      batch.set(integrationRef, integrationDocument);

      // Update child document with school integration
      batch.update(childRef, {
        school: {
          name: schoolData.name,
          municipality: schoolData.municipality,
          grade: schoolData.grade,
          class: schoolData.class || null,
          integrationId,
          integrationType: 'automated',
          hasAfterSchool: schoolData.hasAfterSchool,
          lastSync: null,
          syncEnabled: true
        },
        updatedAt: FieldValue.serverTimestamp()
      });

      await batch.commit();

      logger.info('Norwegian school integration setup completed', { 
        integrationId, 
        supportedPlatforms: supportedPlatforms.length,
        municipality: schoolData.municipality
      });

      return {
        integrationId,
        supportedPlatforms,
        dataAccessEnabled: true,
        norwegianPrivacyCompliant: true
      };

    } catch (error) {
      logger.error('Error setting up Norwegian school integration', { error, childId });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'School integration setup failed');
    }
  }
);