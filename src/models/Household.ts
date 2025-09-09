// Enhanced Household Model with Norwegian Family Structure Support
// Supporting traditional families, joint custody, and extended families

export type NorwegianFamilyStructure = "traditional" | "joint_custody" | "extended" | "single_parent";

export type HouseholdMember = {
  userId: string;
  role: "admin" | "parent" | "child" | "guardian" | "temporary";
  displayName: string | null;
  joinedAt: Date;
  permissions: {
    canManageTasks: boolean;
    canManageChildren: boolean;
    canManageSettings: boolean;
    canInviteMembers: boolean;
  };
  norwegianContext?: {
    relationshipToChildren: "biological_parent" | "step_parent" | "guardian" | "grandparent" | "other";
    custodyRights?: "full" | "shared" | "visitation" | "none";
  };
};

export type JointCustodySettings = {
  enabled: boolean;
  partnerHouseholdId?: string;
  partnerPrimaryParent?: string;
  custodySchedule?: {
    type: "weekly" | "biweekly" | "custom";
    schedule: {
      startDate: string;
      pattern: ("A" | "B")[];
    };
  };
  sharedChildren: string[]; // Child IDs
  communicationPreferences: {
    autoSync: boolean;
    notifyPartner: boolean;
    conflictResolution: "manual" | "first_scheduled" | "primary_decides";
  };
};

export type HouseholdMergeRequest = {
  id: string;
  requesterId: string;
  requesterHouseholdId: string;
  targetHouseholdId: string;
  targetPrimaryParent: string;
  mergeType: "full_merge" | "joint_custody" | "temporary_access";
  status: "pending" | "approved" | "rejected" | "expired";
  message?: string;
  conflicts: MergeConflict[];
  createdAt: Date;
  expiresAt: Date;
  norwegianContext?: {
    reason: "separation" | "remarriage" | "grandparent_help" | "temporary_care" | "other";
    legalDocumentation?: boolean;
    mediationRequired?: boolean;
  };
};

export type MergeConflict = {
  type: "duplicate_child" | "conflicting_schedule" | "permission_overlap" | "custody_dispute";
  description: string;
  affectedItems: string[]; // IDs of tasks, children, etc.
  severity: "low" | "medium" | "high";
  suggestedResolution: string;
  requiresManualIntervention: boolean;
};

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Enhanced Norwegian family structure
  familyStructure: {
    type: NorwegianFamilyStructure;
    primaryParent?: string;
    description?: string;
  };
  
  // Household settings
  settings: {
    timezone: string;
    language: "no" | "en";
    digestHour: number;
    escalationEnabled: boolean;
    norwegianCulturalPreferences: {
      useNorwegianHolidays: boolean;
      respectQuietHours: boolean;
      includeFriluftsliv: boolean;
      norwegianLanguageFirst: boolean;
    };
  };
  
  // Joint custody support
  jointCustody?: JointCustodySettings;
  
  // Privacy and security
  privacy: {
    allowSchoolDataSharing: boolean;
    enableLocationSharing: boolean;
    childDataProtection: "strict" | "moderate" | "basic";
    norwegianGDPRCompliance: boolean;
  };
  
  // Statistics and insights
  statistics?: {
    totalTasks: number;
    completionRate: number;
    activeMembers: number;
    lastActivity: Date;
    norwegianFamilyHealthScore: number; // 0-100
  };
  
  // Metadata
  inviteCode?: string;
  isArchived: boolean;
  mergeHistory: string[]; // IDs of previous merge requests
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  inviterId: string;
  inviterName: string;
  householdName: string;
  inviteCode: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Date;
  expiresAt: Date;
  message?: string;
  targetRole: "parent" | "child" | "guardian";
  norwegianContext?: {
    relationshipType: "family_member" | "caregiver" | "temporary_help";
    expectedDuration?: "permanent" | "temporary" | "seasonal";
  };
}

// Norwegian family structure templates
export const NORWEGIAN_FAMILY_TEMPLATES: Record<NorwegianFamilyStructure, {
  displayName: string;
  description: string;
  icon: string;
  defaultRoles: string[];
  supportsCustody: boolean;
  culturalNotes: string[];
}> = {
  traditional: {
    displayName: "Vanlig familie",
    description: "To foreldre med barn i samme husholdning",
    icon: "👨‍👩‍👧‍👦",
    defaultRoles: ["parent", "parent", "child"],
    supportsCustody: false,
    culturalNotes: [
      "Vanligste familiestruktur i Norge",
      "Delt ansvar for husarbeid og barneomsorg",
      "Fokus på likestilling mellom foreldre"
    ]
  },
  joint_custody: {
    displayName: "Delt omsorg",
    description: "Separerte foreldre med delt omsorgsansvar",
    icon: "👨‍👧‍👦👩‍👧‍👦",
    defaultRoles: ["parent"],
    supportsCustody: true,
    culturalNotes: [
      "Stadig mer vanlig i Norge",
      "Barnas beste står i fokus",
      "Samarbeid mellom ekspartnere er viktig",
      "Fleksible løsninger tilpasses familien"
    ]
  },
  extended: {
    displayName: "Storfamilie",
    description: "Flere voksne i samme husholdning (besteforeldre, tanter/onkler)",
    icon: "👴👵👨‍👩‍👧‍👦",
    defaultRoles: ["parent", "parent", "guardian", "child"],
    supportsCustody: false,
    culturalNotes: [
      "Tradisjonelt i mange norske familier",
      "Besteforeldre spiller aktiv rolle",
      "Delt ansvar for barnepass og husarbeid",
      "Sterk familienettverk og støtte"
    ]
  },
  single_parent: {
    displayName: "Enslig forelder",
    description: "En forelder med hovedansvar for barn",
    icon: "👩‍👧‍👦",
    defaultRoles: ["parent", "child"],
    supportsCustody: false,
    culturalNotes: [
      "Får mye støtte fra det norske velferdssystemet",
      "Ofte tett familienettverk for støtte",
      "Fokus på balanse mellom jobb og familie",
      "Samfunnet gir praktisk og økonomisk støtte"
    ]
  }
};

// Utility functions for household management
export function isValidFamilyStructure(structure: string): structure is NorwegianFamilyStructure {
  return ["traditional", "joint_custody", "extended", "single_parent"].includes(structure);
}

export function getFamilyStructureTemplate(structure: NorwegianFamilyStructure) {
  return NORWEGIAN_FAMILY_TEMPLATES[structure];
}

export function canMergeHouseholds(
  sourceStructure: NorwegianFamilyStructure,
  targetStructure: NorwegianFamilyStructure
): boolean {
  // Business rules for when households can be merged
  const mergeCompatibility: Record<NorwegianFamilyStructure, NorwegianFamilyStructure[]> = {
    traditional: ["single_parent", "extended"],
    joint_custody: ["joint_custody", "single_parent"],
    extended: ["traditional", "extended"],
    single_parent: ["traditional", "joint_custody", "extended"]
  };
  
  return mergeCompatibility[sourceStructure]?.includes(targetStructure) || false;
}

export function calculateNorwegianFamilyHealthScore(household: Household): number {
  let score = 50; // Base score
  
  // Family structure bonus
  const structureBonus = {
    traditional: 10,
    joint_custody: 15, // Bonus for managing complexity well
    extended: 12,
    single_parent: 8
  };
  score += structureBonus[household.familyStructure.type];
  
  // Cultural preferences bonus
  if (household.settings.norwegianCulturalPreferences.useNorwegianHolidays) score += 8;
  if (household.settings.norwegianCulturalPreferences.respectQuietHours) score += 6;
  if (household.settings.norwegianCulturalPreferences.includeFriluftsliv) score += 10;
  if (household.settings.norwegianCulturalPreferences.norwegianLanguageFirst) score += 6;
  
  // Activity and engagement
  if (household.statistics) {
    score += Math.min(household.statistics.completionRate * 20, 20);
    if (household.statistics.lastActivity) {
      const daysSinceActivity = (Date.now() - household.statistics.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 1) score += 10;
      else if (daysSinceActivity < 7) score += 5;
    }
  }
  
  return Math.min(Math.max(score, 0), 100);
}