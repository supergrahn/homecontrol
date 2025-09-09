import { db, auth } from "../firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { 
  Household, 
  NorwegianFamilyStructure, 
  HouseholdMergeRequest,
  MergeConflict,
  canMergeHouseholds,
  calculateNorwegianFamilyHealthScore,
  NORWEGIAN_FAMILY_TEMPLATES
} from "../models/Household";

export async function createHousehold(
  name: string, 
  familyStructure: NorwegianFamilyStructure = "traditional",
  additionalSettings?: {
    language?: "no" | "en";
    timezone?: string;
    norwegianCulturalPreferences?: Partial<Household['settings']['norwegianCulturalPreferences']>;
  }
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  
  const template = NORWEGIAN_FAMILY_TEMPLATES[familyStructure];
  
  // Create enhanced household with Norwegian family structure
  const ref = collection(db, "households");
  const householdData = {
    name,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    
    familyStructure: {
      type: familyStructure,
      primaryParent: user.uid,
      description: template.description
    },
    
    settings: {
      timezone: additionalSettings?.timezone || "Europe/Oslo",
      language: additionalSettings?.language || "no",
      digestHour: 8, // 8 AM default for Norwegian families
      escalationEnabled: true,
      norwegianCulturalPreferences: {
        useNorwegianHolidays: true,
        respectQuietHours: true,
        includeFriluftsliv: true,
        norwegianLanguageFirst: true,
        ...additionalSettings?.norwegianCulturalPreferences
      }
    },
    
    privacy: {
      allowSchoolDataSharing: false, // Conservative default
      enableLocationSharing: false,
      childDataProtection: "strict" as const,
      norwegianGDPRCompliance: true
    },
    
    statistics: {
      totalTasks: 0,
      completionRate: 0,
      activeMembers: 1,
      lastActivity: serverTimestamp(),
      norwegianFamilyHealthScore: 50 // Will be calculated later
    },
    
    isArchived: false,
    mergeHistory: []
  };
  
  const docRef = await addDoc(ref, householdData);
  const hid = docRef.id;
  
  // Add member record for creator with Norwegian family context
  await setDoc(
    doc(db, `households/${hid}/members/${user.uid}`),
    {
      userId: user.uid,
      role: "admin",
      displayName: user.displayName ?? null,
      joinedAt: serverTimestamp(),
      permissions: {
        canManageTasks: true,
        canManageChildren: true,
        canManageSettings: true,
        canInviteMembers: true
      },
      norwegianContext: {
        relationshipToChildren: "biological_parent" as const,
        custodyRights: familyStructure === "joint_custody" ? "shared" : "full"
      }
    },
    { merge: true },
  );

  // Upsert users/{uid}.householdIds
  await setDoc(
    doc(db, `users/${user.uid}`),
    {
      householdIds: arrayUnion(hid),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return hid;
}

export async function updateHouseholdSettings(
  hid: string,
  patch: { timezone?: string; digestHour?: number; escalationEnabled?: boolean },
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  // Assume rules enforce admin-only write for these fields
  await updateDoc(doc(db, "households", hid), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

// Household merging functionality for Norwegian families
export async function requestHouseholdMerge(
  targetHouseholdId: string,
  mergeType: HouseholdMergeRequest['mergeType'] = "joint_custody",
  message?: string,
  reason?: "separation" | "remarriage" | "grandparent_help" | "temporary_care" | "other"
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  
  // Get current user's primary household
  const userHouseholds = await getUserHouseholds(user.uid);
  const sourceHousehold = userHouseholds.find(h => h.familyStructure.primaryParent === user.uid);
  
  if (!sourceHousehold) {
    throw new Error("No primary household found for user");
  }
  
  // Get target household to validate merge compatibility
  const targetHouseholdDoc = await getDoc(doc(db, "households", targetHouseholdId));
  if (!targetHouseholdDoc.exists()) {
    throw new Error("Target household not found");
  }
  
  const targetHousehold = { id: targetHouseholdDoc.id, ...targetHouseholdDoc.data() } as Household;
  
  // Check if households can be merged
  if (!canMergeHouseholds(sourceHousehold.familyStructure.type, targetHousehold.familyStructure.type)) {
    throw new Error(`Cannot merge ${sourceHousehold.familyStructure.type} with ${targetHousehold.familyStructure.type}`);
  }
  
  // Detect potential merge conflicts
  const conflicts = await detectMergeConflicts(sourceHousehold.id, targetHouseholdId);
  
  // Create merge request
  const mergeRequest: Omit<HouseholdMergeRequest, 'id'> = {
    requesterId: user.uid,
    requesterHouseholdId: sourceHousehold.id,
    targetHouseholdId,
    targetPrimaryParent: targetHousehold.familyStructure.primaryParent || "",
    mergeType,
    status: "pending",
    message,
    conflicts,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    norwegianContext: {
      reason: reason || "other",
      legalDocumentation: mergeType === "joint_custody",
      mediationRequired: conflicts.some(c => c.severity === "high")
    }
  };
  
  const mergeRef = await addDoc(collection(db, "householdMergeRequests"), {
    ...mergeRequest,
    createdAt: serverTimestamp(),
    expiresAt: serverTimestamp()
  });
  
  return mergeRef.id;
}

// Detect conflicts between households before merging
async function detectMergeConflicts(
  sourceHouseholdId: string, 
  targetHouseholdId: string
): Promise<MergeConflict[]> {
  const conflicts: MergeConflict[] = [];
  
  try {
    // Check for duplicate children (same name/age)
    const sourceChildren = await getDocs(collection(db, `households/${sourceHouseholdId}/children`));
    const targetChildren = await getDocs(collection(db, `households/${targetHouseholdId}/children`));
    
    const sourceChildNames = sourceChildren.docs.map(doc => doc.data().displayName?.toLowerCase());
    const targetChildNames = targetChildren.docs.map(doc => doc.data().displayName?.toLowerCase());
    
    const duplicateNames = sourceChildNames.filter(name => targetChildNames.includes(name));
    
    if (duplicateNames.length > 0) {
      conflicts.push({
        type: "duplicate_child",
        description: `Duplicate child names found: ${duplicateNames.join(", ")}`,
        affectedItems: duplicateNames,
        severity: "high",
        suggestedResolution: "Verify if these are the same children or need name disambiguation",
        requiresManualIntervention: true
      });
    }
    
    // Check for conflicting schedules (tasks at same time)
    // This would require more complex logic to compare task schedules
    
    // Check for permission overlaps
    const sourceMembers = await getDocs(collection(db, `households/${sourceHouseholdId}/members`));
    const targetMembers = await getDocs(collection(db, `households/${targetHouseholdId}/members`));
    
    const sharedMembers = sourceMembers.docs.filter(sourceDoc => 
      targetMembers.docs.some(targetDoc => targetDoc.id === sourceDoc.id)
    );
    
    if (sharedMembers.length > 0) {
      conflicts.push({
        type: "permission_overlap",
        description: "Users found in both households with potentially conflicting permissions",
        affectedItems: sharedMembers.map(doc => doc.id),
        severity: "medium",
        suggestedResolution: "Review and consolidate user permissions",
        requiresManualIntervention: false
      });
    }
    
  } catch (error) {
    console.error("Error detecting merge conflicts:", error);
    conflicts.push({
      type: "conflicting_schedule",
      description: "Unable to fully analyze conflicts - manual review recommended",
      affectedItems: [],
      severity: "medium",
      suggestedResolution: "Manual review of both households before proceeding",
      requiresManualIntervention: true
    });
  }
  
  return conflicts;
}

// Approve a household merge request
export async function approveMergeRequest(mergeRequestId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  
  const mergeDoc = await getDoc(doc(db, "householdMergeRequests", mergeRequestId));
  if (!mergeDoc.exists()) {
    throw new Error("Merge request not found");
  }
  
  const mergeRequest = { id: mergeDoc.id, ...mergeDoc.data() } as HouseholdMergeRequest;
  
  // Verify user has permission to approve
  if (mergeRequest.targetPrimaryParent !== user.uid) {
    throw new Error("Only the target household primary parent can approve merge requests");
  }
  
  // Update merge request status
  await updateDoc(doc(db, "householdMergeRequests", mergeRequestId), {
    status: "approved",
    updatedAt: serverTimestamp()
  });
  
  // Execute the merge based on type
  await executeMerge(mergeRequest);
}

// Execute the actual household merge
async function executeMerge(mergeRequest: HouseholdMergeRequest): Promise<void> {
  switch (mergeRequest.mergeType) {
    case "joint_custody":
      await executeJointCustodySetup(mergeRequest);
      break;
    case "full_merge":
      await executeFullMerge(mergeRequest);
      break;
    case "temporary_access":
      await executeTemporaryAccess(mergeRequest);
      break;
  }
}

// Set up joint custody between households
async function executeJointCustodySetup(mergeRequest: HouseholdMergeRequest): Promise<void> {
  // Add joint custody settings to both households
  const jointCustodySettings = {
    enabled: true,
    partnerHouseholdId: mergeRequest.targetHouseholdId,
    partnerPrimaryParent: mergeRequest.targetPrimaryParent,
    custodySchedule: {
      type: "weekly" as const,
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
        pattern: ["A", "B", "A", "B", "A", "B", "A"] as ("A" | "B")[]
      }
    },
    sharedChildren: [], // Will be populated as children are linked
    communicationPreferences: {
      autoSync: true,
      notifyPartner: true,
      conflictResolution: "manual" as const
    }
  };
  
  // Update source household
  await updateDoc(doc(db, "households", mergeRequest.requesterHouseholdId), {
    jointCustody: {
      ...jointCustodySettings,
      partnerHouseholdId: mergeRequest.targetHouseholdId
    },
    updatedAt: serverTimestamp()
  });
  
  // Update target household
  await updateDoc(doc(db, "households", mergeRequest.targetHouseholdId), {
    jointCustody: {
      ...jointCustodySettings,
      partnerHouseholdId: mergeRequest.requesterHouseholdId
    },
    updatedAt: serverTimestamp()
  });
  
  // Add requester as member of target household with limited permissions
  await setDoc(
    doc(db, `households/${mergeRequest.targetHouseholdId}/members/${mergeRequest.requesterId}`),
    {
      userId: mergeRequest.requesterId,
      role: "parent",
      displayName: null, // Will be filled from user profile
      joinedAt: serverTimestamp(),
      permissions: {
        canManageTasks: true,
        canManageChildren: true,
        canManageSettings: false, // Limited for joint custody
        canInviteMembers: false
      },
      norwegianContext: {
        relationshipToChildren: "biological_parent",
        custodyRights: "shared"
      }
    },
    { merge: true }
  );
}

// Execute full household merge (rare case)
async function executeFullMerge(mergeRequest: HouseholdMergeRequest): Promise<void> {
  // This is a complex operation that would involve:
  // 1. Moving all children from source to target household
  // 2. Moving all tasks with careful conflict resolution
  // 3. Updating all member permissions
  // 4. Archiving the source household
  console.log("Full merge not yet implemented - requires careful data migration");
}

// Execute temporary access setup
async function executeTemporaryAccess(mergeRequest: HouseholdMergeRequest): Promise<void> {
  // Add requester as temporary member with limited access
  await setDoc(
    doc(db, `households/${mergeRequest.targetHouseholdId}/members/${mergeRequest.requesterId}`),
    {
      userId: mergeRequest.requesterId,
      role: "temporary",
      displayName: null,
      joinedAt: serverTimestamp(),
      permissions: {
        canManageTasks: false,
        canManageChildren: false,
        canManageSettings: false,
        canInviteMembers: false
      },
      norwegianContext: {
        relationshipToChildren: "other",
        custodyRights: "none"
      }
    },
    { merge: true }
  );
}

// Get all households for a user
async function getUserHouseholds(userId: string): Promise<Household[]> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return [];
  
  const householdIds = userDoc.data().householdIds || [];
  const households: Household[] = [];
  
  for (const householdId of householdIds) {
    const householdDoc = await getDoc(doc(db, "households", householdId));
    if (householdDoc.exists()) {
      households.push({ id: householdDoc.id, ...householdDoc.data() } as Household);
    }
  }
  
  return households;
}

// Utility function to find potential household matches (same children/family names)
export async function findPotentialHouseholdMatches(
  childName: string,
  parentName: string
): Promise<{ householdId: string; householdName: string; confidence: number }[]> {
  // This would use Firestore queries to find households with similar child/parent names
  // For now, return empty array as this requires careful privacy considerations
  return [];
}
