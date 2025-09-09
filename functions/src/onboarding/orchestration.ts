// Norwegian Onboarding Orchestration Function
// Manages the complete Norwegian family-focused onboarding flow
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions";

const db = getFirestore();

export interface OnboardingStepData {
  step: "authentication" | "household_setup" | "children_setup" | "completion";
  userId: string;
  householdId?: string;
  data: any;
  norwegianContext: {
    language: "no" | "en";
    familyStructure?: "traditional" | "joint_custody" | "extended" | "single_parent";
    culturalPreferences?: {
      useNorwegianHolidays: boolean;
      respectQuietHours: boolean;
      includeFriluftsliv: boolean;
    };
  };
}

export interface OnboardingResult {
  success: boolean;
  nextStep?: string;
  householdId?: string;
  recommendations?: string[];
  errors?: string[];
  norwegianGuidance?: string[];
}

// Complete onboarding orchestration
export const completeNorwegianOnboarding = onCall<OnboardingStepData, OnboardingResult>(
  { region: "europe-west1" }, // Norwegian users - use EU region
  async (request) => {
    const { data } = request;
    const { step, userId, householdId, norwegianContext } = data;

    logger.info(`Norwegian onboarding step: ${step} for user: ${userId}`);

    try {
      // Verify user authentication
      const auth = getAuth();
      const userRecord = await auth.getUser(userId);
      if (!userRecord) {
        throw new HttpsError("unauthenticated", "User not found");
      }

      switch (step) {
        case "authentication":
          return await processAuthenticationStep(data);
        case "household_setup":
          return await processHouseholdSetupStep(data);
        case "children_setup":
          return await processChildrenSetupStep(data);
        case "completion":
          return await processCompletionStep(data);
        default:
          throw new HttpsError("invalid-argument", "Invalid onboarding step");
      }
    } catch (error) {
      logger.error("Norwegian onboarding error:", error);
      return {
        success: false,
        errors: [(error as Error).message],
        norwegianGuidance: [
          "Noe gikk galt under oppsettet. Prøv igjen eller kontakt støtte."
        ]
      };
    }
  }
);

// Process authentication step with Norwegian context
async function processAuthenticationStep(data: OnboardingStepData): Promise<OnboardingResult> {
  const { userId, norwegianContext } = data;
  
  // Create/update user profile with Norwegian preferences
  const userProfile = {
    id: userId,
    preferences: {
      language: norwegianContext.language || "no",
      timezone: "Europe/Oslo",
      notifications: true,
      norwegianCultural: {
        useNorwegianHolidays: true,
        respectQuietHours: true,
        includeFriluftsliv: true,
        norwegianLanguageFirst: norwegianContext.language === "no"
      }
    },
    onboardingStep: "household_setup",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection("users").doc(userId).set(userProfile, { merge: true });

  return {
    success: true,
    nextStep: "household_setup",
    norwegianGuidance: [
      norwegianContext.language === "no" 
        ? "Flott! Nå skal vi sette opp familien din."
        : "Great! Now let's set up your family."
    ]
  };
}

// Process household setup with Norwegian family structures
async function processHouseholdSetupStep(data: OnboardingStepData): Promise<OnboardingResult> {
  const { userId, norwegianContext } = data;
  const { householdName, familyStructure } = data.data;

  if (!householdName || !familyStructure) {
    throw new HttpsError("invalid-argument", "Missing household name or family structure");
  }

  // Create household with Norwegian family structure
  const householdData = {
    name: householdName,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    familyStructure: {
      type: familyStructure,
      primaryParent: userId,
      description: getFamilyStructureDescription(familyStructure, norwegianContext.language)
    },
    
    settings: {
      timezone: "Europe/Oslo",
      language: norwegianContext.language || "no",
      digestHour: 8, // 8 AM for Norwegian families
      escalationEnabled: true,
      norwegianCulturalPreferences: {
        useNorwegianHolidays: norwegianContext.culturalPreferences?.useNorwegianHolidays ?? true,
        respectQuietHours: norwegianContext.culturalPreferences?.respectQuietHours ?? true,
        includeFriluftsliv: norwegianContext.culturalPreferences?.includeFriluftsliv ?? true,
        norwegianLanguageFirst: norwegianContext.language === "no"
      }
    },
    
    privacy: {
      allowSchoolDataSharing: false, // Conservative default for Norwegian families
      enableLocationSharing: false,
      childDataProtection: "strict",
      norwegianGDPRCompliance: true
    },
    
    statistics: {
      totalTasks: 0,
      completionRate: 0,
      activeMembers: 1,
      lastActivity: new Date(),
      norwegianFamilyHealthScore: 50 // Will be calculated later
    },
    
    isArchived: false,
    mergeHistory: []
  };

  const householdRef = await db.collection("households").add(householdData);
  const householdId = householdRef.id;

  // Add creator as admin member with Norwegian context
  await db.collection(`households/${householdId}/members`).doc(userId).set({
    userId: userId,
    role: "admin",
    displayName: null, // Will be filled from user profile
    joinedAt: new Date(),
    permissions: {
      canManageTasks: true,
      canManageChildren: true,
      canManageSettings: true,
      canInviteMembers: true
    },
    norwegianContext: {
      relationshipToChildren: "biological_parent",
      custodyRights: familyStructure === "joint_custody" ? "shared" : "full"
    }
  });

  // Update user with household ID
  await db.collection("users").doc(userId).update({
    householdIds: [householdId],
    primaryHouseholdId: householdId,
    onboardingStep: "children_setup",
    updatedAt: new Date()
  });

  const recommendations = getHouseholdRecommendations(familyStructure, norwegianContext.language);

  return {
    success: true,
    nextStep: "children_setup",
    householdId: householdId,
    recommendations,
    norwegianGuidance: [
      norwegianContext.language === "no"
        ? `${householdName} er opprettet! Nå kan du legge til barn.`
        : `${householdName} is created! Now you can add children.`
    ]
  };
}

// Process children setup with Norwegian school integration
async function processChildrenSetupStep(data: OnboardingStepData): Promise<OnboardingResult> {
  const { userId, householdId, norwegianContext } = data;
  const { children } = data.data;

  if (!householdId) {
    throw new HttpsError("invalid-argument", "Missing household ID");
  }

  if (!children || !Array.isArray(children)) {
    // No children to add - skip to completion
    return {
      success: true,
      nextStep: "completion",
      householdId: householdId,
      norwegianGuidance: [
        norwegianContext.language === "no"
          ? "Du kan legge til barn senere i innstillingene."
          : "You can add children later in settings."
      ]
    };
  }

  // Create child profiles with Norwegian school integration
  for (const childData of children) {
    const childProfile = {
      displayName: childData.name,
      emoji: childData.emoji || null,
      color: childData.color || null,
      
      // Norwegian school integration
      currentGrade: childData.grade || null,
      schoolYear: getCurrentNorwegianSchoolYear(),
      school: childData.school || null,
      
      // Age-appropriate settings
      ageGroup: determineAgeGroup(childData.age || childData.grade),
      
      // SFO/AKS enrollment
      enrolledInSFO: childData.enrolledInSFO || false,
      enrolledInAKS: childData.enrolledInAKS || false,
      
      // Privacy and device settings
      deviceAccess: {
        hasDevice: childData.hasDevice || false,
        deviceType: childData.deviceType || null,
        parentalControls: true // Always enabled by default
      },
      
      // Parent contact preferences
      parentContactPreferences: {
        norwegianOnly: norwegianContext.language === "no",
        smsNotifications: false, // Conservative default
        emailNotifications: true
      },
      
      // Reward system initialization
      rewards: {
        points: 0,
        level: "beginner",
        achievements: []
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection(`households/${householdId}/children`).add(childProfile);
  }

  // Update household statistics
  await db.collection("households").doc(householdId).update({
    "statistics.activeMembers": 1 + children.length,
    updatedAt: new Date()
  });

  // Update user onboarding step
  await db.collection("users").doc(userId).update({
    onboardingStep: "completion",
    updatedAt: new Date()
  });

  return {
    success: true,
    nextStep: "completion",
    householdId: householdId,
    norwegianGuidance: [
      norwegianContext.language === "no"
        ? `${children.length} barn lagt til! Nå fullfører vi oppsettet.`
        : `${children.length} children added! Now let's complete the setup.`
    ]
  };
}

// Process completion step with Norwegian welcome
async function processCompletionStep(data: OnboardingStepData): Promise<OnboardingResult> {
  const { userId, householdId, norwegianContext } = data;

  if (!householdId) {
    throw new HttpsError("invalid-argument", "Missing household ID");
  }

  // Mark onboarding as complete
  await db.collection("users").doc(userId).update({
    onboardingStep: "completed",
    onboardingCompletedAt: new Date(),
    updatedAt: new Date()
  });

  // Calculate initial Norwegian family health score
  const familyHealthScore = await calculateInitialFamilyHealthScore(householdId);
  
  await db.collection("households").doc(householdId).update({
    "statistics.norwegianFamilyHealthScore": familyHealthScore,
    updatedAt: new Date()
  });

  // Generate Norwegian welcome recommendations
  const welcomeRecommendations = generateWelcomeRecommendations(norwegianContext.language);

  return {
    success: true,
    householdId: householdId,
    recommendations: welcomeRecommendations,
    norwegianGuidance: [
      norwegianContext.language === "no"
        ? "Velkommen til HomeControl! Din familie er nå klar til å organisere hverdagen sammen."
        : "Welcome to HomeControl! Your family is now ready to organize daily life together."
    ]
  };
}

// Trigger when household is created to initialize Norwegian-specific data
export const onNorwegianHouseholdCreate = onDocumentCreated(
  "households/{householdId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const householdData = snapshot.data();
    const householdId = snapshot.id;

    logger.info(`Initializing Norwegian household: ${householdId}`);

    try {
      // Initialize Norwegian holiday data
      await initializeNorwegianHolidays(householdId);
      
      // Set up Norwegian school sync if applicable
      if (householdData.settings?.norwegianCulturalPreferences?.useNorwegianHolidays) {
        await scheduleNorwegianSchoolSync(householdId);
      }
      
      // Initialize Norwegian family AI insights
      await initializeFamilyInsights(householdId, householdData.familyStructure);
      
    } catch (error) {
      logger.error(`Failed to initialize Norwegian household ${householdId}:`, error);
    }
  }
);

// Helper functions
function getFamilyStructureDescription(structure: string, language: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    traditional: {
      no: "To foreldre med barn i samme husholdning",
      en: "Two parents with children in same household"
    },
    joint_custody: {
      no: "Separerte foreldre med delt omsorgsansvar",
      en: "Separated parents with shared custody"
    },
    extended: {
      no: "Flere voksne i samme husholdning",
      en: "Multiple adults in same household"
    },
    single_parent: {
      no: "En forelder med hovedansvar for barn",
      en: "Single parent with primary responsibility"
    }
  };
  
  return descriptions[structure]?.[language] || descriptions[structure]?.["en"] || "";
}

function getHouseholdRecommendations(structure: string, language: string): string[] {
  const recommendations: Record<string, Record<string, string[]>> = {
    traditional: {
      no: [
        "Inviter partneren din til husholdningen",
        "Sett opp felles oppgaver for barna",
        "Bruk belønningssystemet for motivasjon"
      ],
      en: [
        "Invite your partner to the household",
        "Set up shared tasks for children",
        "Use reward system for motivation"
      ]
    },
    joint_custody: {
      no: [
        "Koordiner med ekspartneren via delt omsorg",
        "Sync oppgaver mellom husholdningene",
        "Bruk konfliktløsning for uenigheter"
      ],
      en: [
        "Coordinate with ex-partner via joint custody",
        "Sync tasks between households",
        "Use conflict resolution for disagreements"
      ]
    },
    extended: {
      no: [
        "Inviter besteforeldre og andre familiemedlemmer",
        "Fordel ansvar mellom voksne",
        "Bruk familiekalender for koordinering"
      ],
      en: [
        "Invite grandparents and other family members",
        "Distribute responsibilities among adults",
        "Use family calendar for coordination"
      ]
    },
    single_parent: {
      no: [
        "Sett opp enkle rutiner for deg og barna",
        "Bruk påminnelser for å holde oversikten",
        "Vurder å invitere en støtteperson"
      ],
      en: [
        "Set up simple routines for you and children",
        "Use reminders to stay organized",
        "Consider inviting a support person"
      ]
    }
  };
  
  return recommendations[structure]?.[language] || recommendations[structure]?.["en"] || [];
}

function getCurrentNorwegianSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 7 ? year : year - 1; // School year starts in August
  return `${startYear}-${startYear + 1}`;
}

function determineAgeGroup(ageOrGrade: number): "young" | "middle" | "teen" {
  if (ageOrGrade <= 7) return "young";
  if (ageOrGrade <= 12) return "middle";
  return "teen";
}

async function calculateInitialFamilyHealthScore(householdId: string): Promise<number> {
  // Initial score based on completion of onboarding steps
  let score = 50; // Base score
  
  try {
    const householdDoc = await db.collection("households").doc(householdId).get();
    const householdData = householdDoc.data();
    
    if (!householdData) return score;
    
    // Bonus for Norwegian cultural preferences
    if (householdData.settings?.norwegianCulturalPreferences?.useNorwegianHolidays) score += 10;
    if (householdData.settings?.norwegianCulturalPreferences?.respectQuietHours) score += 5;
    if (householdData.settings?.norwegianCulturalPreferences?.includeFriluftsliv) score += 10;
    
    // Bonus for family structure setup
    if (householdData.familyStructure?.type) score += 10;
    
    // Bonus for having children
    const childrenSnapshot = await db.collection(`households/${householdId}/children`).get();
    if (childrenSnapshot.size > 0) score += 15;
    
  } catch (error) {
    logger.error("Error calculating family health score:", error);
  }
  
  return Math.min(score, 100);
}

function generateWelcomeRecommendations(language: string): string[] {
  const recommendations = {
    no: [
      "Opprett deres første oppgave sammen",
      "Utforsk norske høytider og ferietradisjon",
      "Sett opp familieregler og rutiner",
      "Bruk AI-assistenten for smarte forslag",
      "Koble til norske skoler for automatisk synkronisering"
    ],
    en: [
      "Create your first task together",
      "Explore Norwegian holidays and traditions",
      "Set up family rules and routines", 
      "Use AI assistant for smart suggestions",
      "Connect Norwegian schools for automatic sync"
    ]
  };
  
  return recommendations[language] || recommendations.en;
}

async function initializeNorwegianHolidays(householdId: string): Promise<void> {
  // Initialize Norwegian holiday data for the household
  const currentYear = new Date().getFullYear();
  const norwegianHolidays = [
    { name: "Nyttårsdag", date: `${currentYear}-01-01`, type: "national" },
    { name: "Arbeidernes dag", date: `${currentYear}-05-01`, type: "national" },
    { name: "Grunnlovsdag", date: `${currentYear}-05-17`, type: "national" },
    // Add more Norwegian holidays...
  ];
  
  await db.collection(`households/${householdId}/norwegianHolidays`).add({
    holidays: norwegianHolidays,
    year: currentYear,
    createdAt: new Date()
  });
}

async function scheduleNorwegianSchoolSync(householdId: string): Promise<void> {
  // Schedule Norwegian school data synchronization
  await db.collection("norwegianSchoolSyncQueue").add({
    householdId: householdId,
    scheduledAt: new Date(),
    status: "scheduled",
    syncType: "initial"
  });
}

async function initializeFamilyInsights(householdId: string, familyStructure: any): Promise<void> {
  // Initialize Norwegian family AI insights
  const initialInsights = {
    householdId: householdId,
    familyStructure: familyStructure,
    insights: [],
    norwegianCulturalScore: 50,
    lastUpdated: new Date(),
    nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  };
  
  await db.collection("familyInsights").doc(householdId).set(initialInsights);
}