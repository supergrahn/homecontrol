/**
 * Norwegian Community Groups Data Models
 * Supporting school class groups, parent networks, and community coordination
 */

export type GroupType = 
  | "school_class" // Class-based groups (1. klasse, 2. klasse, etc.)
  | "school_grade" // Grade-level groups across classes  
  | "sfo_group" // SFO after-school program groups
  | "aks_group" // AKS activity school groups
  | "parent_network" // Informal parent groups
  | "hobby_group" // Interest-based groups (sports, music, etc.)
  | "neighborhood" // Geographic community groups
  | "custom"; // User-created groups

export type GroupMemberRole = 
  | "admin" // Can manage group settings and members
  | "moderator" // Can moderate discussions and create events
  | "member" // Regular participation
  | "observer"; // Read-only access

export type GroupPrivacyLevel = 
  | "public" // Discoverable by all users
  | "school_only" // Only parents from same school
  | "grade_only" // Only parents from same grade
  | "invite_only" // Invitation required
  | "private"; // Admin approval required

export interface GroupMember {
  userId: string;
  displayName: string;
  role: GroupMemberRole;
  joinedAt: Date;
  lastActiveAt?: Date;
  
  // Norwegian family context
  norwegianContext: {
    relationshipToChildren: "parent" | "guardian" | "grandparent" | "caregiver";
    childrenInGroup: string[]; // Child IDs that connect this parent to group
    communicationPreference: "norwegian" | "english" | "both";
    quietHoursRespect: boolean; // Respect 20:00-07:00 quiet hours
  };
  
  // Privacy settings
  privacy: {
    shareContactInfo: boolean;
    shareScheduleConflicts: boolean;
    allowDirectMessages: boolean;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  privacyLevel: GroupPrivacyLevel;
  
  // Norwegian school integration
  norwegianSchoolContext?: {
    schoolId: string;
    schoolName: string;
    kommune: string;
    grade?: number; // 1-10 for specific grade groups
    className?: string; // "1A", "2B", etc.
    schoolYear: string; // "2025-2026"
    teacherContacts?: {
      name: string;
      role: string;
      email?: string;
    }[];
  };
  
  // Group management
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  members: GroupMember[];
  memberCount: number; // Cached for performance
  
  // Norwegian cultural settings
  norwegianSettings: {
    primaryLanguage: "norwegian" | "english";
    respectQuietHours: boolean; // 20:00-07:00 communication pause
    includeNorwegianHolidays: boolean;
    democraticDecisions: boolean; // Use Norwegian consensus approach
    lagomPrinciple: boolean; // Balanced, not too much communication
  };
  
  // Communication settings
  communicationChannels: {
    allowAnnouncements: boolean;
    allowDiscussions: boolean;
    allowDirectMessages: boolean;
    allowEventCoordination: boolean;
    moderationEnabled: boolean;
  };
  
  // Metadata and statistics
  statistics?: {
    totalMessages: number;
    totalEvents: number;
    activeMembers: number; // Members active in last 30 days
    lastActivity?: Date;
    engagementScore: number; // 0-100 based on participation
  };
  
  // Group lifecycle
  isArchived: boolean;
  inviteCode?: string; // For joining via link
  tags: string[]; // For search and categorization
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  inviterId: string;
  inviterName: string;
  targetUserId?: string; // For direct invitations
  inviteCode?: string; // For link-based invitations
  
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Date;
  expiresAt: Date;
  
  message?: string;
  suggestedRole: GroupMemberRole;
  
  // Norwegian context
  norwegianContext?: {
    relationshipExplanation: string; // How inviter knows invitee
    childrenConnection: string[]; // Child IDs that connect them
    schoolClassContext?: string; // "Vi er i samme klasse"
  };
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  requesterId: string;
  requesterName: string;
  
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  
  requestMessage?: string;
  
  // Norwegian context
  norwegianContext: {
    childrenInSchool: string[]; // Child IDs in same school/grade
    parentRelationship: string; // How they're connected
    whyJoining: string; // Motivation for joining
  };
}

// Norwegian Group Templates for quick creation
export const NORWEGIAN_GROUP_TEMPLATES: Record<GroupType, {
  displayName: string;
  description: string;
  icon: string;
  suggestedPrivacy: GroupPrivacyLevel;
  norwegianContext: string[];
  defaultChannels: Partial<Group['communicationChannels']>;
}> = {
  school_class: {
    displayName: "Skoleklasse",
    description: "Koordinering for foreldre i samme klasse",
    icon: "🏫",
    suggestedPrivacy: "grade_only",
    norwegianContext: [
      "Praktisk koordinering av skoleaktiviteter",
      "Deling av informasjon om lekser og prøver",
      "Organisering av foreldredugnad",
      "Bursdagsfester og sosiale arrangementer"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false
    }
  },
  
  school_grade: {
    displayName: "Årstrinn",
    description: "Alle foreldre på samme trinn på skolen",
    icon: "📚",
    suggestedPrivacy: "school_only",
    norwegianContext: [
      "Koordinering på tvers av klasser",
      "Deling av læringsstøtte og ressurser",
      "Felles sosiale aktiviteter for trinnet",
      "Informasjonsutveksling mellom klasser"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: false,
      allowEventCoordination: true,
      moderationEnabled: true
    }
  },
  
  sfo_group: {
    displayName: "SFO-gruppe",
    description: "Foreldre med barn i SkoleFritidsOrdning",
    icon: "⚽",
    suggestedPrivacy: "invite_only",
    norwegianContext: [
      "Koordinering av henting og bringing",
      "Deling av aktivitetsinformasjon",
      "Organisering av ekstraaktiviteter",
      "Praktisk støtte for arbeidende foreldre"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false
    }
  },
  
  aks_group: {
    displayName: "AKS-gruppe", 
    description: "Foreldre med barn i Aktivitetsskolen",
    icon: "🎨",
    suggestedPrivacy: "invite_only",
    norwegianContext: [
      "Koordinering av aktivitetsoppmøte",
      "Deling av utstyr og transport",
      "Organisering av oppvisninger og konkurranser",
      "Støtte for barnas interesser"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false
    }
  },
  
  parent_network: {
    displayName: "Foreldregruppe",
    description: "Uformell gruppe for støtte og sosialisering",
    icon: "👥",
    suggestedPrivacy: "invite_only",
    norwegianContext: [
      "Støtte og erfaringsutveksling",
      "Sosiale sammenkomster for foreldre",
      "Deling av barnepass og praktisk hjelp",
      "Vennskap og fellesskap"
    ],
    defaultChannels: {
      allowAnnouncements: false,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false
    }
  },
  
  hobby_group: {
    displayName: "Interessegruppe",
    description: "Gruppe basert på felles interesser eller hobbyer",
    icon: "🎯", 
    suggestedPrivacy: "public",
    norwegianContext: [
      "Koordinering av aktiviteter og treninger",
      "Deling av kunnskap og tips",
      "Organisering av konkurranser og arrangementer",
      "Støtte for barnas utvikling"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: false,
      allowEventCoordination: true,
      moderationEnabled: true
    }
  },
  
  neighborhood: {
    displayName: "Nabolag",
    description: "Lokalt fellesskap i nærområdet",
    icon: "🏘️",
    suggestedPrivacy: "public",
    norwegianContext: [
      "Koordinering av nabolagshjelp",
      "Organisering av fellesaktiviteter",
      "Trygghet og nabovakt",
      "Lokale initiativer og dugnad"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: false,
      allowEventCoordination: true,
      moderationEnabled: true
    }
  },
  
  custom: {
    displayName: "Egen gruppe",
    description: "Egendefinert gruppe for spesielle formål",
    icon: "⚙️",
    suggestedPrivacy: "private",
    norwegianContext: [
      "Tilpasset deres spesifikke behov",
      "Fleksibel organisering",
      "Egendefinerte regler og formål"
    ],
    defaultChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false
    }
  }
};

// Utility functions for Norwegian group management
export function createGroupFromTemplate(
  template: GroupType,
  name: string,
  createdBy: string,
  schoolContext?: Group['norwegianSchoolContext']
): Omit<Group, 'id'> {
  const templateData = NORWEGIAN_GROUP_TEMPLATES[template];
  
  return {
    name,
    description: templateData.description,
    type: template,
    privacyLevel: templateData.suggestedPrivacy,
    norwegianSchoolContext: schoolContext,
    createdBy,
    createdAt: new Date(),
    members: [],
    memberCount: 0,
    norwegianSettings: {
      primaryLanguage: "norwegian",
      respectQuietHours: true,
      includeNorwegianHolidays: true,
      democraticDecisions: true,
      lagomPrinciple: true
    },
    communicationChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false,
      ...templateData.defaultChannels
    },
    isArchived: false,
    tags: [template, schoolContext?.kommune || ""].filter(Boolean)
  };
}

export function isUserAllowedToJoin(
  group: Group,
  userProfile: any, // UserProfile from your existing models
  userChildren: any[] // Child[] from your existing models
): {
  allowed: boolean;
  reason?: string;
} {
  // Check privacy level restrictions
  switch (group.privacyLevel) {
    case "public":
      return { allowed: true };
      
    case "school_only":
      if (!group.norwegianSchoolContext) return { allowed: false, reason: "No school context" };
      const hasChildInSchool = userChildren.some(child => 
        child.school?.id === group.norwegianSchoolContext?.schoolId
      );
      return hasChildInSchool 
        ? { allowed: true }
        : { allowed: false, reason: "No children in this school" };
        
    case "grade_only":
      if (!group.norwegianSchoolContext?.grade) return { allowed: false, reason: "No grade specified" };
      const hasChildInGrade = userChildren.some(child =>
        child.school?.id === group.norwegianSchoolContext?.schoolId &&
        child.currentGrade === group.norwegianSchoolContext?.grade
      );
      return hasChildInGrade
        ? { allowed: true }
        : { allowed: false, reason: "No children in this grade" };
        
    case "invite_only":
      return { allowed: false, reason: "Invitation required" };
      
    case "private":
      return { allowed: false, reason: "Admin approval required" };
      
    default:
      return { allowed: false, reason: "Unknown privacy level" };
  }
}

export function calculateGroupEngagement(group: Group): number {
  const { statistics } = group;
  if (!statistics) return 0;
  
  let score = 0;
  
  // Member activity (40% of score)
  if (group.memberCount > 0) {
    const activeRatio = statistics.activeMembers / group.memberCount;
    score += activeRatio * 40;
  }
  
  // Recent activity (30% of score)
  if (statistics.lastActivity) {
    const daysAgo = (Date.now() - statistics.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 1) score += 30;
    else if (daysAgo < 7) score += 20;
    else if (daysAgo < 30) score += 10;
  }
  
  // Communication volume (20% of score) 
  if (statistics.totalMessages > 0) {
    const avgMessagesPerMember = statistics.totalMessages / group.memberCount;
    score += Math.min(avgMessagesPerMember / 10, 1) * 20;
  }
  
  // Event coordination (10% of score)
  if (statistics.totalEvents > 0) {
    const avgEventsPerMember = statistics.totalEvents / group.memberCount;
    score += Math.min(avgEventsPerMember / 5, 1) * 10;
  }
  
  return Math.round(Math.min(score, 100));
}

export function formatGroupType(type: GroupType): string {
  return NORWEGIAN_GROUP_TEMPLATES[type].displayName;
}

export function generateGroupInviteCode(): string {
  // Generate Norwegian-friendly invite code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function isWithinQuietHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  // Norwegian quiet hours: 20:00 - 07:00
  return hour >= 20 || hour < 7;
}