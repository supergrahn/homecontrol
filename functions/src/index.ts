import "./admin"; // ensure firebase-admin is initialized before importing modules
import * as invites from "./invites";
import * as digest from "./digest";
import * as tasks from "./tasks";
import * as households from "./households";
import * as health from "./health";
import * as testPush from "./testPush";
import { processPushQueue } from "./notifications";
import * as comments from "./comments";
import * as fairness from "./stats";
import * as prefs from "./userPrefs";
import * as calendar from "./ics";
import * as workload from "./workload";
import * as onboarding from "./onboarding/orchestration";
import * as householdMerging from "./households/merge";
import * as dataValidation from "./security/dataValidation";
import * as childSetup from "./children/setup";
import * as rewardSystem from "./rewards/initialize";\nimport * as norwegianAI from "./ai/norwegianIntelligence";

export const createInvite = invites.createInvite;
export const acceptInvite = invites.acceptInvite;
export const onInviteWrite = invites.onInviteWrite;

export const onHouseholdCreate = tasks.onHouseholdCreate;
export const onTaskWrite = tasks.onTaskWrite;

export const runDailyDigests = digest.runDailyDigests;
export const runDigestNow = digest.runDigestNow;
export const runDigestDryRun = digest.runDigestDryRun;
export const runNightBefore = digest.runNightBefore;
export const runNightBeforeNow = digest.runNightBeforeNow;
export const deleteHouseholdRecursive = households.deleteHouseholdRecursive;
export const processPushQueueFn = processPushQueue;
export const healthCheck = health.healthCheck;
export const sendTestPush = testPush.sendTestPush;
export const onCommentCreate = comments.onCommentCreate;
export const getFairnessStats = fairness.getFairnessStats;
export const getWorkloadHeatmap = workload.getWorkloadHeatmap;
export const checkHeatmapParity = workload.checkHeatmapParity;
export const setDigestPreferences = prefs.setDigestPreferences;
export const getDigestPreferences = prefs.getDigestPreferences;
export const createCalendarShare = calendar.createCalendarShare;
export const revokeCalendarShare = calendar.revokeCalendarShare;
export const icsFeed = calendar.icsFeed;
export const getCalendarShares = calendar.getCalendarShares;

// Norwegian Onboarding System (Phase 4)
export const completeNorwegianOnboarding = onboarding.completeNorwegianOnboarding;
export const requestHouseholdMerge = householdMerging.requestHouseholdMerge;
export const approveHouseholdMerge = householdMerging.approveHouseholdMerge;
export const processAutomaticMerge = householdMerging.processAutomaticMerge;

// Norwegian GDPR+ Compliance
export const validateNorwegianCompliance = dataValidation.validateNorwegianCompliance;
export const processDataDeletion = dataValidation.processDataDeletion;
export const automaticDataRetention = dataValidation.automaticDataRetention;

// Norwegian Child Account System
export const createChildAccount = childSetup.createChildAccount;
export const setupChildDevice = childSetup.setupChildDevice;
export const setupSchoolIntegration = childSetup.setupSchoolIntegration;

// Norwegian Reward System
export const setupRewardSystem = rewardSystem.setupRewardSystem;
export const unlockAchievement = rewardSystem.unlockAchievement;
export const getAvailableAchievements = rewardSystem.getAvailableAchievements;\n\n// Norwegian Family AI Assistant\nexport const generateNorwegianFamilyInsights = norwegianAI.generateNorwegianFamilyInsights;\nexport const norwegianAIUtilities = norwegianAI.norwegianAIUtilities;
