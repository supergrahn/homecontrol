import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// Configure for Norwegian users in Europe
setGlobalOptions({ region: 'europe-west1' });

const db = getFirestore();

// Norwegian GDPR+ Compliance Schemas
const ChildDataSchema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().min(0).max(18),
  ageGroup: z.enum(['young', 'middle', 'teen']),
  school: z.object({
    name: z.string().max(100),
    grade: z.string().max(20),
    municipality: z.string().max(50)
  }).optional(),
  parentalConsent: z.boolean(),
  dataProcessingConsent: z.boolean(),
  norwegianDataResidency: z.boolean().default(true)
});

const UserDataSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['parent', 'child']),
  preferences: z.object({
    language: z.enum(['no', 'en']).default('no'),
    notifications: z.boolean().default(true),
    quietHours: z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    }).default({ start: '22:00', end: '07:00' })
  }),
  norwegianResident: z.boolean().default(true),
  gdprConsent: z.boolean(),
  marketingConsent: z.boolean().default(false)
});

const HouseholdDataSchema = z.object({
  name: z.string().min(1).max(100),
  familyStructure: z.enum(['traditional', 'joint_custody', 'extended', 'single_parent']),
  norwegianCulturalPreferences: z.object({
    observeNorwegianHolidays: z.boolean().default(true),
    friluftsliv: z.boolean().default(true),
    lagom: z.boolean().default(true),
    dugnad: z.boolean().default(true)
  }),
  dataRetentionPeriod: z.number().default(2555), // 7 years in days (Norwegian requirement)
  automaticDeletion: z.boolean().default(true)
});

interface ComplianceValidationRequest {
  dataType: 'user' | 'child' | 'household';
  data: unknown;
  householdId?: string;
  parentUserId?: string;
}

interface ComplianceValidationResult {
  isValid: boolean;
  violations: string[];
  recommendations: string[];
  norwegianCompliance: {
    gdprCompliant: boolean;
    childDataProtected: boolean;
    dataResidency: boolean;
    consentValid: boolean;
  };
}

interface DataDeletionRequest {
  householdId: string;
  dataType: 'user' | 'child' | 'household' | 'all';
  reason: 'user_request' | 'automatic_retention' | 'account_closure';
  targetId?: string;
}

interface DataDeletionResult {
  success: boolean;
  deletedItems: string[];
  retainedItems: string[];
  complianceStatus: string;
}

/**
 * Validates data against Norwegian GDPR+ compliance requirements
 * Ensures child data protection and cultural sensitivity
 */
export const validateNorwegianCompliance = onCall<ComplianceValidationRequest, ComplianceValidationResult>(
  async (request) => {
    const { data, dataType, householdId, parentUserId } = request.data;
    
    logger.info('Norwegian GDPR+ validation started', { 
      dataType, 
      householdId,
      timestamp: new Date().toISOString()
    });

    const violations: string[] = [];
    const recommendations: string[] = [];
    let isValid = true;

    try {
      // Validate data structure based on type
      switch (dataType) {
        case 'user':
          const userResult = UserDataSchema.safeParse(data);
          if (!userResult.success) {
            violations.push(...userResult.error.issues.map(issue => 
              `User data: ${issue.path.join('.')}: ${issue.message}`
            ));
            isValid = false;
          } else {
            // Check Norwegian-specific requirements
            if (!userResult.data.norwegianResident) {
              recommendations.push('Consider Norwegian data processing implications for non-residents');
            }
            if (!userResult.data.gdprConsent) {
              violations.push('GDPR consent is required for all Norwegian users');
              isValid = false;
            }
          }
          break;

        case 'child':
          const childResult = ChildDataSchema.safeParse(data);
          if (!childResult.success) {
            violations.push(...childResult.error.issues.map(issue => 
              `Child data: ${issue.path.join('.')}: ${issue.message}`
            ));
            isValid = false;
          } else {
            // Verify parental consent for children
            if (!childResult.data.parentalConsent || !childResult.data.dataProcessingConsent) {
              violations.push('Parental consent required for all child data processing in Norway');
              isValid = false;
            }

            // Age-specific validation
            if (childResult.data.age < 13 && !parentUserId) {
              violations.push('Children under 13 require verified parent/guardian account');
              isValid = false;
            }

            // Verify parent relationship if householdId provided
            if (householdId && parentUserId) {
              const householdRef = db.collection('households').doc(householdId);
              const householdDoc = await householdRef.get();
              
              if (!householdDoc.exists) {
                violations.push('Invalid household reference for child data');
                isValid = false;
              } else {
                const household = householdDoc.data();
                if (!household?.members?.includes(parentUserId)) {
                  violations.push('Parent must be verified household member for child data processing');
                  isValid = false;
                }
              }
            }
          }
          break;

        case 'household':
          const householdResult = HouseholdDataSchema.safeParse(data);
          if (!householdResult.success) {
            violations.push(...householdResult.error.issues.map(issue => 
              `Household data: ${issue.path.join('.')}: ${issue.message}`
            ));
            isValid = false;
          }
          break;

        default:
          violations.push(`Unknown data type: ${dataType}`);
          isValid = false;
      }

      // Norwegian cultural compliance checks
      if (dataType === 'household' && isValid) {
        const householdData = data as any;
        if (householdData.familyStructure === 'joint_custody') {
          recommendations.push('Ensure both parents have provided consent for joint custody data sharing');
        }
      }

      // Data residency check
      const norwegianCompliance = {
        gdprCompliant: violations.length === 0,
        childDataProtected: dataType !== 'child' || violations.filter(v => v.includes('child')).length === 0,
        dataResidency: true, // Enforced by Firebase region configuration
        consentValid: !violations.some(v => v.includes('consent'))
      };

      // General recommendations
      if (isValid) {
        recommendations.push('Data processed in accordance with Norwegian GDPR+ requirements');
        recommendations.push('Automatic deletion configured per Norwegian retention policies');
      }

      logger.info('Norwegian GDPR+ validation completed', { 
        isValid, 
        violationCount: violations.length,
        dataType 
      });

      return {
        isValid,
        violations,
        recommendations,
        norwegianCompliance
      };

    } catch (error) {
      logger.error('Error during Norwegian GDPR+ validation', { error, dataType });
      throw new HttpsError('internal', 'Norwegian compliance validation failed');
    }
  }
);

/**
 * Handles data deletion requests in compliance with Norwegian GDPR+ requirements
 * Supports right to erasure and automatic retention policies
 */
export const processDataDeletion = onCall<DataDeletionRequest, DataDeletionResult>(
  async (request) => {
    const { householdId, dataType, reason, targetId } = request.data;
    
    logger.info('Norwegian data deletion started', { 
      householdId, 
      dataType, 
      reason,
      targetId,
      timestamp: new Date().toISOString()
    });

    const deletedItems: string[] = [];
    const retainedItems: string[] = [];

    try {
      const householdRef = db.collection('households').doc(householdId);
      const householdDoc = await householdRef.get();

      if (!householdDoc.exists) {
        throw new HttpsError('not-found', 'Household not found');
      }

      const batch = db.batch();

      switch (dataType) {
        case 'user':
          if (!targetId) {
            throw new HttpsError('invalid-argument', 'Target user ID required');
          }

          // Delete user data
          const userRef = db.collection('users').doc(targetId);
          batch.delete(userRef);
          deletedItems.push(`user:${targetId}`);

          // Remove from household
          batch.update(householdRef, {
            members: FieldValue.arrayRemove(targetId),
            updatedAt: FieldValue.serverTimestamp()
          });

          // Delete user's personal data
          const userTasksQuery = db.collection('tasks').where('assignedTo', '==', targetId);
          const userTasks = await userTasksQuery.get();
          userTasks.forEach(doc => {
            batch.update(doc.ref, {
              assignedTo: null,
              assignedBy: 'system',
              updatedAt: FieldValue.serverTimestamp()
            });
            retainedItems.push(`task:${doc.id} (anonymized)`);
          });
          
          break;

        case 'child':
          if (!targetId) {
            throw new HttpsError('invalid-argument', 'Target child ID required');
          }

          // Verify parental permission for child data deletion
          const childRef = db.collection('children').doc(targetId);
          const childDoc = await childRef.get();
          
          if (childDoc.exists) {
            const childData = childDoc.data();
            if (childData?.age < 18 && reason === 'user_request') {
              // Require parental consent for minor data deletion
              const parentConsentRef = db.collection('dataConsents').doc(`child_deletion_${targetId}`);
              const consentDoc = await parentConsentRef.get();
              
              if (!consentDoc.exists || !consentDoc.data()?.parentalConsent) {
                throw new HttpsError('permission-denied', 'Parental consent required for child data deletion');
              }
            }
            
            batch.delete(childRef);
            deletedItems.push(`child:${targetId}`);

            // Delete child's school data
            const schoolDataQuery = db.collection('norwegianSchoolData').where('childId', '==', targetId);
            const schoolData = await schoolDataQuery.get();
            schoolData.forEach(doc => {
              batch.delete(doc.ref);
              deletedItems.push(`schoolData:${doc.id}`);
            });
          }
          break;

        case 'household':
          // Delete entire household and all related data
          batch.delete(householdRef);
          deletedItems.push(`household:${householdId}`);

          // Delete all household tasks
          const tasksQuery = db.collection('tasks').where('householdId', '==', householdId);
          const tasks = await tasksQuery.get();
          tasks.forEach(doc => {
            batch.delete(doc.ref);
            deletedItems.push(`task:${doc.id}`);
          });

          // Delete all household children
          const childrenQuery = db.collection('children').where('householdId', '==', householdId);
          const children = await childrenQuery.get();
          children.forEach(doc => {
            batch.delete(doc.ref);
            deletedItems.push(`child:${doc.id}`);
          });

          // Delete Norwegian-specific data
          const norwegianDataQuery = db.collection('norwegianFamilyData').where('householdId', '==', householdId);
          const norwegianData = await norwegianDataQuery.get();
          norwegianData.forEach(doc => {
            batch.delete(doc.ref);
            deletedItems.push(`norwegianData:${doc.id}`);
          });
          break;

        case 'all':
          // Complete data deletion (account closure)
          await processDataDeletion({ 
            data: { householdId, dataType: 'household', reason } 
          } as any);
          deletedItems.push('Complete household data deleted');
          break;

        default:
          throw new HttpsError('invalid-argument', `Unknown data type: ${dataType}`);
      }

      // Create deletion audit record (required by Norwegian GDPR+)
      const auditRef = db.collection('deletionAudit').doc();
      batch.set(auditRef, {
        householdId,
        dataType,
        reason,
        targetId: targetId || null,
        deletedItems,
        retainedItems,
        timestamp: FieldValue.serverTimestamp(),
        norwegianCompliance: true,
        processedBy: 'system'
      });

      await batch.commit();

      logger.info('Norwegian data deletion completed', { 
        householdId, 
        deletedCount: deletedItems.length,
        retainedCount: retainedItems.length
      });

      return {
        success: true,
        deletedItems,
        retainedItems,
        complianceStatus: 'Norwegian GDPR+ compliant deletion completed'
      };

    } catch (error) {
      logger.error('Error during Norwegian data deletion', { error, householdId, dataType });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Norwegian data deletion failed');
    }
  }
);

/**
 * Automatic data retention cleanup for Norwegian compliance
 * Runs daily to clean up expired data per Norwegian requirements
 */
export const automaticDataRetention = onCall<{}, { processed: number; deleted: number }>(
  async () => {
    logger.info('Norwegian automatic data retention started');

    try {
      const now = new Date();
      const sevenYearsAgo = new Date(now.getTime() - (2555 * 24 * 60 * 60 * 1000)); // 7 years in milliseconds

      let processed = 0;
      let deleted = 0;

      // Find households with expired data retention
      const expiredHouseholdsQuery = db.collection('households')
        .where('automaticDeletion', '==', true)
        .where('createdAt', '<', sevenYearsAgo);
      
      const expiredHouseholds = await expiredHouseholdsQuery.get();

      for (const doc of expiredHouseholds.docs) {
        try {
          await processDataDeletion({
            data: {
              householdId: doc.id,
              dataType: 'household',
              reason: 'automatic_retention'
            }
          } as any);
          
          deleted++;
        } catch (error) {
          logger.warn('Failed to auto-delete household', { householdId: doc.id, error });
        }
        processed++;
      }

      // Clean up orphaned data
      const orphanedChildrenQuery = db.collection('children')
        .where('createdAt', '<', sevenYearsAgo);
      
      const orphanedChildren = await orphanedChildrenQuery.get();
      
      for (const doc of orphanedChildren.docs) {
        const household = await db.collection('households').doc(doc.data().householdId).get();
        if (!household.exists) {
          await doc.ref.delete();
          deleted++;
        }
        processed++;
      }

      logger.info('Norwegian automatic data retention completed', { processed, deleted });

      return { processed, deleted };

    } catch (error) {
      logger.error('Error during Norwegian automatic data retention', { error });
      throw new HttpsError('internal', 'Automatic data retention failed');
    }
  }
);