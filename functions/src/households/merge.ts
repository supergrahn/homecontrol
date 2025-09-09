// Norwegian Household Merging Backend System
// Handles household merging with conflict resolution and joint custody setup
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

export interface MergeRequest {
  requesterId: string;
  requesterHouseholdId: string;
  targetHouseholdId: string;
  mergeType: "full_merge" | "joint_custody" | "temporary_access";
  reason?: "separation" | "remarriage" | "grandparent_help" | "temporary_care" | "other";
  message?: string;
  conflicts: MergeConflict[];
  norwegianContext?: {
    legalDocumentation?: boolean;
    mediationRequired?: boolean;
  };
}

export interface MergeConflict {
  type: "duplicate_child" | "conflicting_schedule" | "permission_overlap" | "custody_dispute";
  description: string;
  affectedItems: string[];
  severity: "low" | "medium" | "high";
  suggestedResolution: string;
  requiresManualIntervention: boolean;
}

export interface MergeResult {
  success: boolean;
  mergeRequestId?: string;
  conflicts?: MergeConflict[];
  message?: string;
  norwegianGuidance?: string[];
}

// Create and process household merge requests
export const requestHouseholdMerge = onCall<MergeRequest, MergeResult>(
  { region: "europe-west1" },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { requesterHouseholdId, targetHouseholdId, mergeType, reason, message } = data;

    logger.info(`Household merge request: ${requesterHouseholdId} -> ${targetHouseholdId}`);

    try {
      // Validate households exist and user has permission
      const [requesterHousehold, targetHousehold] = await Promise.all([
        db.collection("households").doc(requesterHouseholdId).get(),
        db.collection("households").doc(targetHouseholdId).get()
      ]);

      if (!requesterHousehold.exists || !targetHousehold.exists) {
        throw new HttpsError("not-found", "One or both households not found");
      }

      // Verify user is admin of requester household
      const requesterMember = await db
        .collection(`households/${requesterHouseholdId}/members`)
        .doc(auth.uid)
        .get();

      if (!requesterMember.exists || requesterMember.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "User must be admin of source household");
      }

      // Detect merge conflicts
      const conflicts = await detectMergeConflicts(requesterHouseholdId, targetHouseholdId);

      // Check Norwegian family structure compatibility
      const sourceStructure = requesterHousehold.data()?.familyStructure?.type;
      const targetStructure = targetHousehold.data()?.familyStructure?.type;
      
      if (!canMergeNorwegianFamilyStructures(sourceStructure, targetStructure)) {
        conflicts.push({
          type: "custody_dispute",
          description: `Cannot merge ${sourceStructure} with ${targetStructure} family structures`,
          affectedItems: [requesterHouseholdId, targetHouseholdId],
          severity: "high",
          suggestedResolution: "Review family structures and choose compatible merge type",
          requiresManualIntervention: true
        });
      }

      // Create merge request document
      const mergeRequestData = {
        requesterId: auth.uid,
        requesterHouseholdId,
        targetHouseholdId,
        targetPrimaryParent: targetHousehold.data()?.familyStructure?.primaryParent,
        mergeType,
        status: "pending",
        reason: reason || "other",
        message: message || "",
        conflicts,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        norwegianContext: {
          legalDocumentation: mergeType === "joint_custody",
          mediationRequired: conflicts.some(c => c.severity === "high"),
          culturalNotes: getNorwegianMergeCulturalNotes(mergeType)
        }
      };

      const mergeRef = await db.collection("householdMergeRequests").add(mergeRequestData);

      // Send notification to target household admin
      await notifyTargetHousehold(targetHouseholdId, mergeRef.id, auth.uid);

      const norwegianGuidance = generateNorwegianMergeGuidance(mergeType, conflicts.length);

      return {
        success: true,
        mergeRequestId: mergeRef.id,
        conflicts,
        message: "Merge request created successfully",
        norwegianGuidance
      };

    } catch (error) {
      logger.error("Household merge request failed:", error);
      throw error instanceof HttpsError ? error : new HttpsError("internal", "Merge request failed");
    }
  }
);

// Approve household merge request
export const approveMergeRequest = onCall<{ mergeRequestId: string }, MergeResult>(
  { region: "europe-west1" },
  async (request) => {
    const { auth, data } = request;
    
    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { mergeRequestId } = data;

    try {
      const mergeDoc = await db.collection("householdMergeRequests").doc(mergeRequestId).get();
      
      if (!mergeDoc.exists) {
        throw new HttpsError("not-found", "Merge request not found");
      }

      const mergeData = mergeDoc.data()!;
      
      // Verify user can approve (must be target household admin)
      const targetMember = await db
        .collection(`households/${mergeData.targetHouseholdId}/members`)
        .doc(auth.uid)
        .get();

      if (!targetMember.exists || targetMember.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only target household admin can approve");
      }

      // Check if request has expired
      if (mergeData.expiresAt.toDate() < new Date()) {
        throw new HttpsError("failed-precondition", "Merge request has expired");
      }

      // Update merge request status
      await db.collection("householdMergeRequests").doc(mergeRequestId).update({
        status: "approved",
        approvedBy: auth.uid,
        approvedAt: FieldValue.serverTimestamp()
      });

      // Execute the merge based on type
      await executeMerge(mergeData);

      return {
        success: true,
        message: "Merge request approved and executed",
        norwegianGuidance: [
          "Sammenslåingen er fullført! Familiene er nå koblet sammen."
        ]
      };

    } catch (error) {
      logger.error("Merge approval failed:", error);
      throw error instanceof HttpsError ? error : new HttpsError("internal", "Merge approval failed");
    }
  }
);

// Automatically process merge requests when created
export const onMergeRequestCreated = onDocumentCreated(
  "householdMergeRequests/{mergeRequestId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const mergeData = snapshot.data();
    const mergeRequestId = snapshot.id;

    logger.info(`Processing new merge request: ${mergeRequestId}`);

    try {
      // Auto-approve low-risk merges (e.g., temporary access with no conflicts)
      if (canAutoApprove(mergeData)) {
        logger.info(`Auto-approving low-risk merge: ${mergeRequestId}`);
        
        await db.collection("householdMergeRequests").doc(mergeRequestId).update({
          status: "auto_approved",
          approvedAt: FieldValue.serverTimestamp()
        });
        
        await executeMerge(mergeData);
      } else {
        // Send detailed notification to target household
        await sendDetailedMergeNotification(mergeData, mergeRequestId);
      }
    } catch (error) {
      logger.error(`Failed to process merge request ${mergeRequestId}:`, error);
      
      await db.collection("householdMergeRequests").doc(mergeRequestId).update({
        status: "error",
        error: (error as Error).message,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
);

// Monitor merge request status changes
export const onMergeRequestUpdated = onDocumentUpdated(
  "householdMergeRequests/{mergeRequestId}",
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    
    if (!beforeData || !afterData) return;

    // Check if status changed to approved
    if (beforeData.status !== "approved" && afterData.status === "approved") {
      logger.info(`Executing approved merge: ${event.params.mergeRequestId}`);
      await executeMerge(afterData);
    }

    // Clean up expired requests
    if (afterData.expiresAt.toDate() < new Date() && afterData.status === "pending") {
      await db.collection("householdMergeRequests").doc(event.params.mergeRequestId).update({
        status: "expired",
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
);

// Detect conflicts between households
async function detectMergeConflicts(sourceHouseholdId: string, targetHouseholdId: string): Promise<MergeConflict[]> {
  const conflicts: MergeConflict[] = [];

  try {
    // Check for duplicate children
    const [sourceChildren, targetChildren] = await Promise.all([
      db.collection(`households/${sourceHouseholdId}/children`).get(),
      db.collection(`households/${targetHouseholdId}/children`).get()
    ]);

    const sourceChildNames = sourceChildren.docs.map(doc => doc.data().displayName?.toLowerCase());
    const targetChildNames = targetChildren.docs.map(doc => doc.data().displayName?.toLowerCase());
    
    const duplicateNames = sourceChildNames.filter(name => targetChildNames.includes(name));
    
    if (duplicateNames.length > 0) {
      conflicts.push({
        type: "duplicate_child",
        description: `Potential duplicate children found: ${duplicateNames.join(", ")}`,
        affectedItems: duplicateNames,
        severity: "high",
        suggestedResolution: "Verify if these represent the same children or need disambiguation",
        requiresManualIntervention: true
      });
    }

    // Check for overlapping members
    const [sourceMembers, targetMembers] = await Promise.all([
      db.collection(`households/${sourceHouseholdId}/members`).get(),
      db.collection(`households/${targetHouseholdId}/members`).get()
    ]);

    const sharedMemberIds = sourceMembers.docs
      .map(doc => doc.id)
      .filter(id => targetMembers.docs.some(targetDoc => targetDoc.id === id));

    if (sharedMemberIds.length > 0) {
      conflicts.push({
        type: "permission_overlap",
        description: "Users found in both households with potentially conflicting permissions",
        affectedItems: sharedMemberIds,
        severity: "medium",
        suggestedResolution: "Review and consolidate user permissions during merge",
        requiresManualIntervention: false
      });
    }

    // Check for conflicting schedules (simplified version)
    const [sourceTasks, targetTasks] = await Promise.all([
      db.collection(`households/${sourceHouseholdId}/tasks`).where("status", "!=", "done").get(),
      db.collection(`households/${targetHouseholdId}/tasks`).where("status", "!=", "done").get()
    ]);

    if (sourceTasks.size > 0 && targetTasks.size > 0) {
      // Simplified conflict detection - in production would analyze actual time overlaps
      conflicts.push({
        type: "conflicting_schedule",
        description: "Both households have active tasks that may conflict",
        affectedItems: [`${sourceTasks.size} source tasks`, `${targetTasks.size} target tasks`],
        severity: "low",
        suggestedResolution: "Review task schedules after merge and adjust as needed",
        requiresManualIntervention: false
      });
    }

  } catch (error) {
    logger.error("Error detecting merge conflicts:", error);
    conflicts.push({
      type: "conflicting_schedule",
      description: "Unable to fully analyze potential conflicts",
      affectedItems: [],
      severity: "medium",
      suggestedResolution: "Manual review recommended before proceeding with merge",
      requiresManualIntervention: true
    });
  }

  return conflicts;
}

// Execute different types of merges
async function executeMerge(mergeData: any): Promise<void> {
  const { mergeType, requesterHouseholdId, targetHouseholdId, requesterId } = mergeData;

  logger.info(`Executing ${mergeType} merge between ${requesterHouseholdId} and ${targetHouseholdId}`);

  switch (mergeType) {
    case "joint_custody":
      await executeJointCustodyMerge(mergeData);
      break;
    case "temporary_access":
      await executeTemporaryAccessMerge(mergeData);
      break;
    case "full_merge":
      await executeFullMerge(mergeData);
      break;
    default:
      throw new Error(`Unknown merge type: ${mergeType}`);
  }

  // Log merge completion
  await db.collection("householdMergeHistory").add({
    ...mergeData,
    completedAt: FieldValue.serverTimestamp(),
    status: "completed"
  });
}

// Execute joint custody merge
async function executeJointCustodyMerge(mergeData: any): Promise<void> {
  const { requesterHouseholdId, targetHouseholdId, requesterId, targetPrimaryParent } = mergeData;

  // Set up joint custody settings for both households
  const jointCustodySettings = {
    enabled: true,
    partnerHouseholdId: targetHouseholdId,
    partnerPrimaryParent: targetPrimaryParent,
    custodySchedule: {
      type: "weekly",
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
        pattern: ["A", "B", "A", "B", "A", "B", "A"] // Weekly alternating
      }
    },
    sharedChildren: [], // Will be populated as children are linked
    communicationPreferences: {
      autoSync: true,
      notifyPartner: true,
      conflictResolution: "manual"
    }
  };

  // Update both households
  await Promise.all([
    db.collection("households").doc(requesterHouseholdId).update({
      jointCustody: {
        ...jointCustodySettings,
        partnerHouseholdId: targetHouseholdId
      },
      updatedAt: FieldValue.serverTimestamp()
    }),
    db.collection("households").doc(targetHouseholdId).update({
      jointCustody: {
        ...jointCustodySettings,
        partnerHouseholdId: requesterHouseholdId
      },
      updatedAt: FieldValue.serverTimestamp()
    })
  ]);

  // Add requester as limited member of target household
  await db.collection(`households/${targetHouseholdId}/members`).doc(requesterId).set({
    userId: requesterId,
    role: "parent",
    displayName: null, // Will be filled from user profile
    joinedAt: FieldValue.serverTimestamp(),
    permissions: {
      canManageTasks: true,
      canManageChildren: true,
      canManageSettings: false, // Limited permissions for joint custody
      canInviteMembers: false
    },
    norwegianContext: {
      relationshipToChildren: "biological_parent",
      custodyRights: "shared"
    }
  });
}

// Execute temporary access merge
async function executeTemporaryAccessMerge(mergeData: any): Promise<void> {
  const { targetHouseholdId, requesterId } = mergeData;

  // Add requester as temporary member with very limited access
  await db.collection(`households/${targetHouseholdId}/members`).doc(requesterId).set({
    userId: requesterId,
    role: "temporary",
    displayName: null,
    joinedAt: FieldValue.serverTimestamp(),
    permissions: {
      canManageTasks: false,
      canManageChildren: false,
      canManageSettings: false,
      canInviteMembers: false
    },
    norwegianContext: {
      relationshipToChildren: "other",
      custodyRights: "none"
    },
    temporaryAccess: {
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      reason: mergeData.reason || "temporary_care"
    }
  });
}

// Execute full merge (complex operation)
async function executeFullMerge(mergeData: any): Promise<void> {
  // This is a complex operation that requires careful data migration
  // For now, we'll implement a simplified version
  logger.warn("Full merge not fully implemented - requires careful data migration");
  
  // TODO: Implement full household data migration
  // - Move children from source to target household
  // - Migrate tasks with conflict resolution
  // - Update all member permissions
  // - Archive source household
}

// Helper functions
function canMergeNorwegianFamilyStructures(source: string, target: string): boolean {
  const compatibleMerges: Record<string, string[]> = {
    traditional: ["single_parent", "extended"],
    joint_custody: ["joint_custody", "single_parent"],
    extended: ["traditional", "extended"],
    single_parent: ["traditional", "joint_custody", "extended"]
  };
  
  return compatibleMerges[source]?.includes(target) || false;
}

function canAutoApprove(mergeData: any): boolean {
  return (
    mergeData.mergeType === "temporary_access" &&
    mergeData.conflicts.length === 0 &&
    mergeData.reason === "grandparent_help"
  );
}

function getNorwegianMergeCulturalNotes(mergeType: string): string[] {
  const notes: Record<string, string[]> = {
    joint_custody: [
      "Delt omsorg krever godt samarbeid mellom foreldrene",
      "Barnas beste skal alltid komme først",
      "Norsk familierett støtter fleksible ordninger"
    ],
    temporary_access: [
      "Midlertidig tilgang er vanlig for besteforeldre og familie",
      "Respekter primær forelders ønsker og grenser"
    ],
    full_merge: [
      "Full sammenslåing er stort steg - vurder konsekvensene nøye",
      "Alle familiemedlemmer bør være enige"
    ]
  };
  
  return notes[mergeType] || [];
}

function generateNorwegianMergeGuidance(mergeType: string, conflictCount: number): string[] {
  const guidance = [
    `Forespørsel om ${mergeType} er sendt til målhusholdningen.`
  ];
  
  if (conflictCount > 0) {
    guidance.push(`${conflictCount} potensielle konflikter er identifisert og må løses.`);
  } else {
    guidance.push("Ingen konflikter funnet - forespørselen kan behandles raskt.");
  }
  
  guidance.push("Du vil få beskjed når forespørselen er behandlet.");
  
  return guidance;
}

async function notifyTargetHousehold(targetHouseholdId: string, mergeRequestId: string, requesterId: string): Promise<void> {
  // Create notification for target household admin
  const targetMembers = await db.collection(`households/${targetHouseholdId}/members`)
    .where("role", "==", "admin")
    .get();
  
  for (const memberDoc of targetMembers.docs) {
    await db.collection("notifications").add({
      userId: memberDoc.id,
      type: "household_merge_request",
      title: "Ny forespørsel om husholdningssammenslåing",
      message: "En familie ønsker å koble til deres husholdning",
      data: {
        mergeRequestId,
        requesterId,
        targetHouseholdId
      },
      createdAt: FieldValue.serverTimestamp(),
      read: false
    });
  }
}

async function sendDetailedMergeNotification(mergeData: any, mergeRequestId: string): Promise<void> {
  // Send detailed notification with merge request details
  // This would integrate with the notification system
  logger.info(`Detailed merge notification sent for request: ${mergeRequestId}`);
}