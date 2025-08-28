import "./admin"; // ensure firebase-admin is initialized before importing modules
import * as invites from "./invites";
import * as digest from "./digest";
import * as tasks from "./tasks";
import * as households from "./households";
import * as health from "./health";
import * as testPush from "./testPush";
import { processPushQueue } from "./notifications";
import * as comments from "./comments";

export const createInvite = invites.createInvite;
export const acceptInvite = invites.acceptInvite;
export const onInviteWrite = invites.onInviteWrite;

export const onHouseholdCreate = tasks.onHouseholdCreate;
export const onTaskWrite = tasks.onTaskWrite;

export const runDailyDigests = digest.runDailyDigests;
export const runDigestNow = digest.runDigestNow;
export const runDigestDryRun = digest.runDigestDryRun;
export const deleteHouseholdRecursive = households.deleteHouseholdRecursive;
export const processPushQueueFn = processPushQueue;
export const healthCheck = health.healthCheck;
export const sendTestPush = testPush.sendTestPush;
export const onCommentCreate = comments.onCommentCreate;
