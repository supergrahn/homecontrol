import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Configure for Norwegian users in Europe
setGlobalOptions({ region: 'europe-west1' });

const db = getFirestore();

interface RewardSystemSetupRequest {
  householdId: string;
  childId: string;
  parentUserId: string;
  preferences: {
    enableRewards: boolean;
    ageAppropriate: boolean;
    norwegianCulturalFocus: boolean;
    pointsPerTask: number;
    allowanceIntegration: boolean;
  };
}

interface RewardSystemSetupResult {
  systemId: string;
  initialLevel: string;
  availableAchievements: string[];
  norwegianAchievements: string[];
  pointsPerTask: number;
  culturallyAppropriate: boolean;
}

interface AchievementUnlockRequest {
  childId: string;
  achievementId: string;
  taskId?: string;
  context: 'task_completion' | 'behavior' | 'milestone' | 'cultural_event';
}

interface AchievementUnlockResult {
  unlocked: boolean;
  pointsAwarded: number;
  levelUp: boolean;
  newLevel?: string;
  celebrationMessage: string;
}

// Norwegian cultural achievements aligned with educational values
const NORWEGIAN_ACHIEVEMENTS = {
  // Basic life skills (all ages)
  hjelpsom: {
    name: 'Hjelpsom',
    description: 'Hjelper andre familiemedlemmer',
    points: 50,
    icon: '🤝',
    ageGroups: ['young', 'middle', 'teen'],
    culturalContext: 'Norwegian value of helping community'
  },
  
  ansvarlig: {
    name: 'Ansvarlig',
    description: 'Tar ansvar for egne oppgaver',
    points: 75,
    icon: '⭐',
    ageGroups: ['middle', 'teen'],
    culturalContext: 'Personal responsibility in Norwegian culture'
  },

  // Friluftsliv (outdoor life)
  friluftsliv_starter: {
    name: 'Friluftsliv Starter',
    description: 'Deltar i utendørsaktiviteter',
    points: 100,
    icon: '🥾',
    ageGroups: ['young', 'middle', 'teen'],
    culturalContext: 'Norwegian outdoor life tradition'
  },

  naturvenn: {
    name: 'Naturvenn',
    description: 'Bryr seg om naturen og miljøet',
    points: 125,
    icon: '🌲',
    ageGroups: ['middle', 'teen'],
    culturalContext: 'Environmental consciousness'
  },

  // Dugnad (community work)
  dugnad_deltaker: {
    name: 'Dugnad-deltaker',
    description: 'Deltar aktivt i dugnad',
    points: 150,
    icon: '🏠',
    ageGroups: ['middle', 'teen'],
    culturalContext: 'Norwegian community volunteer work'
  },

  // School and learning
  skoleflink: {
    name: 'Skoleflink',
    description: 'Gjør leksene uten påminnelse',
    points: 100,
    icon: '📚',
    ageGroups: ['middle', 'teen'],
    culturalContext: 'Educational responsibility'
  },

  // Norwegian cultural events
  mai_feiring: {
    name: '17. mai Feiring',
    description: 'Deltar aktivt i 17. mai-feiring',
    points: 200,
    icon: '🇳🇴',
    ageGroups: ['young', 'middle', 'teen'],
    culturalContext: 'Norwegian Constitution Day participation'
  },

  // Seasonal activities
  vinter_mester: {
    name: 'Vinter-mester',
    description: 'Mestrer vinteraktiviteter',
    points: 175,
    icon: '⛷️',
    ageGroups: ['middle', 'teen'],
    culturalContext: 'Winter sports and activities'
  },

  // Family cooperation
  familie_samarbeid: {
    name: 'Familie-samarbeid',
    description: 'Samarbeider godt med familien',
    points: 125,
    icon: '👨‍👩‍👧‍👦',
    ageGroups: ['young', 'middle', 'teen'],
    culturalContext: 'Norwegian family cooperation values'
  },

  // Innovation and creativity (Norwegian design values)
  kreativ: {
    name: 'Kreativ',
    description: 'Viser kreativitet i oppgaver',
    points: 100,
    icon: '🎨',
    ageGroups: ['young', 'middle', 'teen'],
    culturalContext: 'Norwegian design and creativity values'
  }
};

// Norwegian level system based on folklore and cultural references
const NORWEGIAN_LEVELS = {
  young: [
    { level: 'Småtroll', pointsRequired: 0, description: 'Ny i familien', icon: '👶' },
    { level: 'Hjelpetroll', pointsRequired: 100, description: 'Begynner å hjelpe til', icon: '🧚' },
    { level: 'Snilltroll', pointsRequired: 300, description: 'Snill og hjelpsom', icon: '😊' },
    { level: 'Eventyr-helt', pointsRequired: 600, description: 'Som en helt fra eventyr', icon: '🦸' }
  ],
  middle: [
    { level: 'Hjelper', pointsRequired: 0, description: 'Hjelper familien', icon: '🤝' },
    { level: 'Ansvarlig', pointsRequired: 200, description: 'Tar ansvar', icon: '⭐' },
    { level: 'Dugnad-mester', pointsRequired: 500, description: 'Dugnad-deltaker', icon: '🏠' },
    { level: 'Familie-helt', pointsRequired: 1000, description: 'Familiens helt', icon: '🏆' },
    { level: 'Viking-warrior', pointsRequired: 1500, description: 'Sterk som en viking', icon: '⚔️' }
  ],
  teen: [
    { level: 'Ansvarlig', pointsRequired: 0, description: 'Tar ansvar', icon: '⭐' },
    { level: 'Selvstendig', pointsRequired: 300, description: 'Klarer seg selv', icon: '🎯' },
    { level: 'Leder', pointsRequired: 750, description: 'Leder andre', icon: '👑' },
    { level: 'Rollemodell', pointsRequired: 1500, description: 'Rollemodell for andre', icon: '🌟' },
    { level: 'Friluftsliv-mester', pointsRequired: 2500, description: 'Friluftsliv-ekspert', icon: '🏔️' },
    { level: 'Norsk Helt', pointsRequired: 4000, description: 'En ekte norsk helt', icon: '🇳🇴' }
  ]
};

/**
 * Initializes age-appropriate reward system for Norwegian children
 */
export const setupRewardSystem = onCall<RewardSystemSetupRequest, RewardSystemSetupResult>(
  async (request) => {
    const { householdId, childId, parentUserId, preferences } = request.data;
    
    logger.info('Norwegian reward system setup started', {
      childId,
      householdId,
      enableRewards: preferences.enableRewards,
      norwegianFocus: preferences.norwegianCulturalFocus
    });

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

      const ageGroup = childData.ageGroup as 'young' | 'middle' | 'teen';
      
      // Don't set up complex reward system for very young children
      if (ageGroup === 'young' && !preferences.enableRewards) {
        logger.info('Skipping reward system for young child as requested');
        return {
          systemId: 'simple_praise',
          initialLevel: 'Småtroll',
          availableAchievements: ['hjelpsom', 'familie_samarbeid'],
          norwegianAchievements: ['friluftsliv_starter', 'mai_feiring'],
          pointsPerTask: 0,
          culturallyAppropriate: true
        };
      }

      // Get age-appropriate levels and achievements
      const levels = NORWEGIAN_LEVELS[ageGroup];
      const initialLevel = levels[0].level;

      const availableAchievements = Object.entries(NORWEGIAN_ACHIEVEMENTS)
        .filter(([_, achievement]) => achievement.ageGroups.includes(ageGroup))
        .map(([key, _]) => key);

      const norwegianAchievements = preferences.norwegianCulturalFocus 
        ? availableAchievements 
        : availableAchievements.slice(0, 3); // Limit if not culturally focused

      // Create reward system document
      const systemRef = db.collection('rewardSystems').doc(childId);
      const systemId = systemRef.id;

      const rewardSystemDocument = {
        id: systemId,
        childId,
        householdId,
        parentUserId,

        // Current status
        currentPoints: 0,
        currentLevel: initialLevel,
        currentLevelIndex: 0,
        totalPointsEarned: 0,

        // Configuration
        configuration: {
          enabled: preferences.enableRewards,
          ageGroup,
          pointsPerTask: preferences.pointsPerTask,
          allowanceIntegration: preferences.allowanceIntegration,
          norwegianCulturalFocus: preferences.norwegianCulturalFocus,
          ageAppropriate: preferences.ageAppropriate
        },

        // Available content
        levels: levels,
        availableAchievements: availableAchievements,
        unlockedAchievements: [],
        
        // Norwegian cultural elements
        norwegianElements: {
          culturalAchievements: norwegianAchievements,
          seasonalBonus: true, // Extra points during Norwegian holidays
          friluftsliv: ageGroup !== 'young',
          dugnadParticipation: ageGroup !== 'young',
          languageBonus: childData.norwegianPreferences?.language === 'no'
        },

        // Statistics
        statistics: {
          achievementsUnlocked: 0,
          levelsCompleted: 0,
          tasksCompleted: 0,
          norwegianAchievementsUnlocked: 0,
          lastActivityDate: null,
          streakDays: 0
        },

        // Norwegian cultural context
        culturalContext: {
          observeNorwegianHolidays: true,
          seasonalTasks: true,
          outdoorActivityBonus: true,
          familyCooperationEmphasis: true,
          environmentalAwareness: ageGroup !== 'young'
        },

        // Metadata
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: parentUserId,
        norwegianCompliance: true,
        version: '1.0'
      };

      const batch = db.batch();

      // Create reward system
      batch.set(systemRef, rewardSystemDocument);

      // Update child document with reward system info
      batch.update(childRef, {
        rewards: {
          enabled: preferences.enableRewards,
          systemId,
          currentLevel: initialLevel,
          points: 0,
          achievements: [],
          norwegianAchievements: norwegianAchievements,
          lastUpdate: FieldValue.serverTimestamp()
        },
        updatedAt: FieldValue.serverTimestamp()
      });

      // Initialize starter achievements for Norwegian culture
      if (preferences.norwegianCulturalFocus) {
        const starterAchievements = ['familie_samarbeid', 'hjelpsom'];
        if (ageGroup !== 'young') {
          starterAchievements.push('friluftsliv_starter');
        }

        for (const achievementId of starterAchievements) {
          const achievementRef = db.collection('childAchievements').doc();
          batch.set(achievementRef, {
            childId,
            achievementId,
            unlockedAt: FieldValue.serverTimestamp(),
            pointsAwarded: 0, // Starter achievements don't give points
            context: 'system_initialization',
            norwegianCultural: true,
            celebrated: false
          });
        }
      }

      await batch.commit();

      logger.info('Norwegian reward system setup completed', {
        systemId,
        initialLevel,
        availableAchievements: availableAchievements.length,
        norwegianFocus: preferences.norwegianCulturalFocus
      });

      return {
        systemId,
        initialLevel,
        availableAchievements,
        norwegianAchievements,
        pointsPerTask: preferences.pointsPerTask,
        culturallyAppropriate: true
      };

    } catch (error) {
      logger.error('Error setting up Norwegian reward system', { error, childId });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Reward system setup failed');
    }
  }
);

/**
 * Unlocks achievements and awards points with Norwegian cultural context
 */
export const unlockAchievement = onCall<AchievementUnlockRequest, AchievementUnlockResult>(
  async (request) => {
    const { childId, achievementId, taskId, context } = request.data;
    
    logger.info('Norwegian achievement unlock started', { childId, achievementId, context });

    try {
      // Get child and reward system data
      const childRef = db.collection('children').doc(childId);
      const systemRef = db.collection('rewardSystems').doc(childId);
      
      const [childDoc, systemDoc] = await Promise.all([
        childRef.get(),
        systemRef.get()
      ]);

      if (!childDoc.exists || !systemDoc.exists) {
        throw new HttpsError('not-found', 'Child or reward system not found');
      }

      const childData = childDoc.data();
      const systemData = systemDoc.data();

      if (!systemData?.configuration?.enabled) {
        throw new HttpsError('failed-precondition', 'Reward system not enabled');
      }

      // Check if achievement exists and is age-appropriate
      const achievement = NORWEGIAN_ACHIEVEMENTS[achievementId as keyof typeof NORWEGIAN_ACHIEVEMENTS];
      if (!achievement) {
        throw new HttpsError('not-found', `Achievement ${achievementId} not found`);
      }

      const ageGroup = childData?.ageGroup;
      if (!achievement.ageGroups.includes(ageGroup)) {
        throw new HttpsError('failed-precondition', `Achievement ${achievementId} not appropriate for age group ${ageGroup}`);
      }

      // Check if already unlocked
      const existingAchievementQuery = db.collection('childAchievements')
        .where('childId', '==', childId)
        .where('achievementId', '==', achievementId);
      const existingAchievements = await existingAchievementQuery.get();

      if (!existingAchievements.empty) {
        logger.info('Achievement already unlocked', { childId, achievementId });
        return {
          unlocked: false,
          pointsAwarded: 0,
          levelUp: false,
          celebrationMessage: `Du har allerede ${achievement.name}!`
        };
      }

      // Calculate points (with Norwegian seasonal bonus)
      const basePoints = achievement.points;
      const isNorwegianHoliday = await checkNorwegianHolidayBonus();
      const seasonalMultiplier = isNorwegianHoliday && systemData.norwegianElements?.seasonalBonus ? 1.5 : 1;
      const pointsAwarded = Math.round(basePoints * seasonalMultiplier);

      // Update points and check for level up
      const newTotalPoints = (systemData.currentPoints || 0) + pointsAwarded;
      const currentLevelIndex = systemData.currentLevelIndex || 0;
      const levels = systemData.levels || NORWEGIAN_LEVELS[ageGroup as keyof typeof NORWEGIAN_LEVELS];
      
      let levelUp = false;
      let newLevel = systemData.currentLevel;
      let newLevelIndex = currentLevelIndex;

      // Check for level up
      for (let i = currentLevelIndex + 1; i < levels.length; i++) {
        if (newTotalPoints >= levels[i].pointsRequired) {
          levelUp = true;
          newLevel = levels[i].level;
          newLevelIndex = i;
        } else {
          break;
        }
      }

      const batch = db.batch();

      // Record achievement unlock
      const achievementUnlockRef = db.collection('childAchievements').doc();
      batch.set(achievementUnlockRef, {
        id: achievementUnlockRef.id,
        childId,
        achievementId,
        achievementName: achievement.name,
        achievementIcon: achievement.icon,
        pointsAwarded,
        seasonalBonus: seasonalMultiplier > 1,
        unlockedAt: FieldValue.serverTimestamp(),
        context,
        taskId: taskId || null,
        norwegianCultural: true,
        celebrated: false,
        culturalContext: achievement.culturalContext
      });

      // Update reward system
      batch.update(systemRef, {
        currentPoints: newTotalPoints,
        totalPointsEarned: FieldValue.increment(pointsAwarded),
        currentLevel: newLevel,
        currentLevelIndex: newLevelIndex,
        unlockedAchievements: FieldValue.arrayUnion(achievementId),
        'statistics.achievementsUnlocked': FieldValue.increment(1),
        'statistics.norwegianAchievementsUnlocked': FieldValue.increment(1),
        'statistics.lastActivityDate': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update child document
      batch.update(childRef, {
        'rewards.points': newTotalPoints,
        'rewards.currentLevel': newLevel,
        'rewards.achievements': FieldValue.arrayUnion(achievementId),
        'rewards.lastUpdate': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // If level up occurred, record it
      if (levelUp) {
        const levelUpRef = db.collection('levelUps').doc();
        batch.set(levelUpRef, {
          childId,
          fromLevel: systemData.currentLevel,
          toLevel: newLevel,
          pointsAtLevelUp: newTotalPoints,
          achievementTrigger: achievementId,
          unlockedAt: FieldValue.serverTimestamp(),
          celebrated: false,
          norwegianLevel: true
        });

        batch.update(systemRef, {
          'statistics.levelsCompleted': FieldValue.increment(1)
        });
      }

      await batch.commit();

      // Create celebration message in Norwegian
      const celebrationMessage = levelUp 
        ? `Gratulerer! Du låste opp ${achievement.name} ${achievement.icon} og nådde ${newLevel}! 🎉`
        : `Flott jobbet! Du låste opp ${achievement.name} ${achievement.icon} og fikk ${pointsAwarded} poeng!`;

      logger.info('Norwegian achievement unlocked successfully', {
        childId,
        achievementId,
        pointsAwarded,
        levelUp,
        newLevel: levelUp ? newLevel : undefined
      });

      return {
        unlocked: true,
        pointsAwarded,
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        celebrationMessage
      };

    } catch (error) {
      logger.error('Error unlocking Norwegian achievement', { error, childId, achievementId });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Achievement unlock failed');
    }
  }
);

/**
 * Helper function to check for Norwegian holiday bonus
 */
async function checkNorwegianHolidayBonus(): Promise<boolean> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Norwegian holidays and special periods
  const norwegianHolidays = [
    { month: 5, day: 17 }, // Constitution Day
    { month: 12, day: 25 }, // Christmas
    { month: 1, day: 1 },   // New Year
    // Add more Norwegian holidays as needed
  ];

  // Check for winter break, easter break periods (approximate)
  const isWinterBreak = (month === 2 && day >= 15 && day <= 21);
  const isEasterPeriod = (month === 3 || month === 4); // Simplified easter period
  const isSummerBreak = (month === 6 || month === 7 || month === 8);

  const isHoliday = norwegianHolidays.some(holiday => 
    holiday.month === month && holiday.day === day
  );

  return isHoliday || isWinterBreak || isEasterPeriod || isSummerBreak;
}

/**
 * Gets available achievements for a child based on age and preferences
 */
export const getAvailableAchievements = onCall<{ childId: string }, { achievements: any[] }>(
  async (request) => {
    const { childId } = request.data;

    try {
      const childRef = db.collection('children').doc(childId);
      const childDoc = await childRef.get();

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found');
      }

      const childData = childDoc.data();
      const ageGroup = childData?.ageGroup as 'young' | 'middle' | 'teen';

      const achievements = Object.entries(NORWEGIAN_ACHIEVEMENTS)
        .filter(([_, achievement]) => achievement.ageGroups.includes(ageGroup))
        .map(([key, achievement]) => ({
          id: key,
          name: achievement.name,
          description: achievement.description,
          points: achievement.points,
          icon: achievement.icon,
          culturalContext: achievement.culturalContext,
          ageAppropriate: true
        }));

      return { achievements };

    } catch (error) {
      logger.error('Error getting available achievements', { error, childId });
      throw new HttpsError('internal', 'Failed to get achievements');
    }
  }
);