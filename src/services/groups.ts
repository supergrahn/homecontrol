/**
 * Groups Service
 * Handles Norwegian community groups with Firebase integration
 */

import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import { 
  Group, 
  GroupInvitation, 
  GroupJoinRequest, 
  GroupMember,
  GroupType,
  createGroupFromTemplate,
  generateGroupInviteCode,
  isUserAllowedToJoin,
  calculateGroupEngagement,
} from "../models/Group";
import { refreshNextUpWidget } from "./widgets";
import { appEvents } from "../events";

/**
 * Create a new Norwegian community group
 */
export async function createGroup(
  householdId: string,
  groupType: GroupType,
  name: string,
  description?: string,
  schoolContext?: Group['norwegianSchoolContext']
): Promise<{ id: string; group: Group }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const groupTemplate = createGroupFromTemplate(groupType, name, user.uid, schoolContext);
  const groupData = {
    ...groupTemplate,
    description: description || groupTemplate.description,
    inviteCode: generateGroupInviteCode(),
  };

  // Add creator as admin member
  const creatorMember: GroupMember = {
    userId: user.uid,
    displayName: user.displayName || "User",
    role: "admin",
    joinedAt: new Date(),
    norwegianContext: {
      relationshipToChildren: "parent" as const,
      childrenInGroup: [], // Will be populated if connected to school
      communicationPreference: "norwegian" as const,
      quietHoursRespect: true,
    },
    privacy: {
      shareContactInfo: false,
      shareScheduleConflicts: true,
      allowDirectMessages: true,
    },
  };

  const finalGroupData = {
    ...groupData,
    members: [creatorMember],
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = collection(db, "groups");
  const docRef = await addDoc(ref, finalGroupData);
  
  // Track group creation for household
  await updateDoc(doc(db, `households/${householdId}`), {
    [`groupMemberships.${docRef.id}`]: {
      groupId: docRef.id,
      role: "admin",
      joinedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  const createdGroup = { id: docRef.id, ...groupData, members: [creatorMember] } as Group;
  
  // Emit event for real-time updates
  appEvents.emit("group:created", { groupId: docRef.id, group: createdGroup });

  return { id: docRef.id, group: createdGroup };
}

/**
 * Fetch groups for a user/household
 */
export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const groupsRef = collection(db, "groups");
  const q = query(
    groupsRef,
    where("members", "array-contains-any", [{ userId }]),
    where("isArchived", "==", false),
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Group));
}

/**
 * Fetch groups by school context for automatic joining
 */
export async function fetchSchoolGroups(
  schoolId: string,
  grade?: number,
  className?: string
): Promise<Group[]> {
  const groupsRef = collection(db, "groups");
  let q = query(
    groupsRef,
    where("norwegianSchoolContext.schoolId", "==", schoolId),
    where("isArchived", "==", false),
    orderBy("memberCount", "desc")
  );

  if (grade) {
    q = query(q, where("norwegianSchoolContext.grade", "==", grade));
  }

  if (className) {
    q = query(q, where("norwegianSchoolContext.className", "==", className));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Group));
}

/**
 * Join a group (request or direct join based on privacy)
 */
export async function joinGroup(
  groupId: string,
  userId: string,
  householdId: string,
  relationshipContext?: {
    childrenConnection: string[];
    relationshipExplanation: string;
    whyJoining: string;
  }
): Promise<{ success: boolean; requiresApproval: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  // Fetch group details
  const groupDoc = await getDoc(doc(db, `groups/${groupId}`));
  if (!groupDoc.exists()) throw new Error("Group not found");

  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
  
  // Check if user is already a member
  if (group.members.some(m => m.userId === userId)) {
    return { success: false, requiresApproval: false, message: "Already a member" };
  }

  // Check eligibility based on privacy rules
  const eligibility = isUserAllowedToJoin(group, user, []); // TODO: Pass user children
  if (!eligibility.allowed && group.privacyLevel !== "invite_only" && group.privacyLevel !== "private") {
    return { success: false, requiresApproval: false, message: eligibility.reason };
  }

  // Handle different privacy levels
  switch (group.privacyLevel) {
    case "public":
    case "school_only":
    case "grade_only":
      // Direct join allowed
      return await addMemberToGroup(groupId, userId, householdId, "member", relationshipContext);

    case "invite_only":
    case "private":
      // Create join request
      return await createJoinRequest(groupId, userId, relationshipContext);

    default:
      return { success: false, requiresApproval: false, message: "Unknown privacy level" };
  }
}

/**
 * Add member directly to group
 */
async function addMemberToGroup(
  groupId: string,
  userId: string,
  householdId: string,
  role: GroupMember['role'] = "member",
  relationshipContext?: any
): Promise<{ success: boolean; requiresApproval: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authorized");

  const newMember: GroupMember = {
    userId,
    displayName: user.displayName || "User",
    role,
    joinedAt: new Date(),
    norwegianContext: {
      relationshipToChildren: "parent" as const,
      childrenInGroup: relationshipContext?.childrenConnection || [],
      communicationPreference: "norwegian" as const,
      quietHoursRespect: true,
    },
    privacy: {
      shareContactInfo: false,
      shareScheduleConflicts: true,
      allowDirectMessages: true,
    },
  };

  // Update group with new member
  await updateDoc(doc(db, `groups/${groupId}`), {
    members: arrayUnion(newMember),
    memberCount: arrayUnion(1), // Firestore will increment
    updatedAt: serverTimestamp(),
  });

  // Update household membership tracking
  await updateDoc(doc(db, `households/${householdId}`), {
    [`groupMemberships.${groupId}`]: {
      groupId,
      role,
      joinedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("group:member:joined", { groupId, userId, member: newMember });
  
  return { success: true, requiresApproval: false };
}

/**
 * Create a join request for private/invite-only groups
 */
async function createJoinRequest(
  groupId: string,
  userId: string,
  relationshipContext?: any
): Promise<{ success: boolean; requiresApproval: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authorized");

  const joinRequest: Omit<GroupJoinRequest, 'id'> = {
    groupId,
    requesterId: userId,
    requesterName: user.displayName || "User",
    status: "pending",
    createdAt: new Date(),
    requestMessage: relationshipContext?.whyJoining || "",
    norwegianContext: {
      childrenInSchool: relationshipContext?.childrenConnection || [],
      parentRelationship: relationshipContext?.relationshipExplanation || "",
      whyJoining: relationshipContext?.whyJoining || "",
    },
  };

  const requestsRef = collection(db, "groupJoinRequests");
  await addDoc(requestsRef, {
    ...joinRequest,
    createdAt: serverTimestamp(),
  });

  appEvents.emit("group:join:requested", { groupId, userId, request: joinRequest });

  return { success: true, requiresApproval: true };
}

/**
 * Send group invitation
 */
export async function inviteToGroup(
  groupId: string,
  inviterId: string,
  targetUserId: string,
  message?: string,
  relationshipContext?: {
    relationshipExplanation: string;
    childrenConnection: string[];
    schoolClassContext?: string;
  }
): Promise<{ success: boolean; invitation: GroupInvitation }> {
  const user = auth.currentUser;
  if (!user || user.uid !== inviterId) throw new Error("Not authorized");

  const invitation: Omit<GroupInvitation, 'id'> = {
    groupId,
    inviterId,
    inviterName: user.displayName || "User",
    targetUserId,
    status: "pending",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    message,
    suggestedRole: "member",
    norwegianContext: relationshipContext,
  };

  const invitationsRef = collection(db, "groupInvitations");
  const docRef = await addDoc(invitationsRef, {
    ...invitation,
    createdAt: serverTimestamp(),
    expiresAt: serverTimestamp(), // TODO: Add 7 days
  });

  const fullInvitation = { id: docRef.id, ...invitation } as GroupInvitation;
  
  appEvents.emit("group:invitation:sent", { 
    groupId, 
    inviterId, 
    targetUserId, 
    invitation: fullInvitation 
  });

  return { success: true, invitation: fullInvitation };
}

/**
 * Accept group invitation
 */
export async function acceptGroupInvitation(
  invitationId: string,
  userId: string,
  householdId: string
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  // Fetch and update invitation
  const invitationDoc = await getDoc(doc(db, `groupInvitations/${invitationId}`));
  if (!invitationDoc.exists()) throw new Error("Invitation not found");

  const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as GroupInvitation;
  
  if (invitation.targetUserId !== userId) {
    throw new Error("Not authorized for this invitation");
  }

  if (invitation.status !== "pending") {
    return { success: false, message: "Invitation already processed" };
  }

  if (invitation.expiresAt < new Date()) {
    return { success: false, message: "Invitation has expired" };
  }

  // Update invitation status
  await updateDoc(doc(db, `groupInvitations/${invitationId}`), {
    status: "accepted",
  });

  // Add user to group
  const result = await addMemberToGroup(
    invitation.groupId,
    userId,
    householdId,
    invitation.suggestedRole
  );

  if (result.success) {
    appEvents.emit("group:invitation:accepted", { 
      invitationId, 
      groupId: invitation.groupId, 
      userId 
    });
  }

  return result;
}

/**
 * Leave a group
 */
export async function leaveGroup(
  groupId: string,
  userId: string,
  householdId: string
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  // Fetch group to check member status
  const groupDoc = await getDoc(doc(db, `groups/${groupId}`));
  if (!groupDoc.exists()) throw new Error("Group not found");

  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
  const memberToRemove = group.members.find(m => m.userId === userId);
  
  if (!memberToRemove) {
    return { success: false, message: "Not a member of this group" };
  }

  // Check if user is the last admin
  const admins = group.members.filter(m => m.role === "admin");
  if (memberToRemove.role === "admin" && admins.length === 1) {
    return { success: false, message: "Cannot leave - you are the last admin" };
  }

  // Remove member from group
  await updateDoc(doc(db, `groups/${groupId}`), {
    members: arrayRemove(memberToRemove),
    memberCount: group.memberCount - 1,
    updatedAt: serverTimestamp(),
  });

  // Remove from household tracking
  await updateDoc(doc(db, `households/${householdId}`), {
    [`groupMemberships.${groupId}`]: deleteDoc as any, // Remove field
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("group:member:left", { groupId, userId, member: memberToRemove });

  return { success: true };
}

/**
 * Update group settings (admin only)
 */
export async function updateGroup(
  groupId: string,
  userId: string,
  updates: Partial<Group>
): Promise<{ success: boolean; message?: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error("Not authorized");

  // Verify admin permissions
  const groupDoc = await getDoc(doc(db, `groups/${groupId}`));
  if (!groupDoc.exists()) throw new Error("Group not found");

  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
  const userMember = group.members.find(m => m.userId === userId);
  
  if (!userMember || userMember.role !== "admin") {
    return { success: false, message: "Admin permissions required" };
  }

  // Update group
  await updateDoc(doc(db, `groups/${groupId}`), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  appEvents.emit("group:updated", { groupId, updates, updatedBy: userId });

  return { success: true };
}

/**
 * Real-time subscription to user's groups
 */
export function subscribeToUserGroups(
  userId: string,
  callback: (groups: Group[]) => void
): () => void {
  const groupsRef = collection(db, "groups");
  const q = query(
    groupsRef,
    where("members", "array-contains-any", [{ userId }]),
    where("isArchived", "==", false),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Group));
    
    callback(groups);
  });
}

/**
 * Real-time subscription to specific group
 */
export function subscribeToGroup(
  groupId: string,
  callback: (group: Group | null) => void
): () => void {
  return onSnapshot(doc(db, `groups/${groupId}`), (snapshot) => {
    if (snapshot.exists()) {
      const group = { id: snapshot.id, ...snapshot.data() } as Group;
      callback(group);
    } else {
      callback(null);
    }
  });
}

/**
 * Calculate and update group engagement score
 */
export async function updateGroupEngagement(groupId: string): Promise<void> {
  const groupDoc = await getDoc(doc(db, `groups/${groupId}`));
  if (!groupDoc.exists()) return;

  const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
  const engagementScore = calculateGroupEngagement(group);

  await updateDoc(doc(db, `groups/${groupId}`), {
    'statistics.engagementScore': engagementScore,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Search for groups to join
 */
export async function searchGroups(
  searchTerm: string,
  filters?: {
    type?: GroupType;
    schoolId?: string;
    kommune?: string;
  }
): Promise<Group[]> {
  let q = query(
    collection(db, "groups"),
    where("isArchived", "==", false),
    where("privacyLevel", "in", ["public", "school_only"]),
    orderBy("memberCount", "desc")
  );

  if (filters?.type) {
    q = query(q, where("type", "==", filters.type));
  }

  if (filters?.schoolId) {
    q = query(q, where("norwegianSchoolContext.schoolId", "==", filters.schoolId));
  }

  if (filters?.kommune) {
    q = query(q, where("norwegianSchoolContext.kommune", "==", filters.kommune));
  }

  const snapshot = await getDocs(q);
  let groups = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Group));

  // Client-side filtering by name (Firestore doesn't support text search)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    groups = groups.filter(group => 
      group.name.toLowerCase().includes(term) ||
      group.description?.toLowerCase().includes(term) ||
      group.norwegianSchoolContext?.schoolName.toLowerCase().includes(term)
    );
  }

  return groups;
}