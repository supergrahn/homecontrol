import "./admin"; // ensure firebase-admin is initialized before importing modules
import * as invites from "./invites";
import * as digest from "./digest";
import * as tasks from "./tasks";
import * as households from "./households";

export const createInvite = invites.createInvite;
export const acceptInvite = invites.acceptInvite;
export const onInviteWrite = invites.onInviteWrite;

export const onHouseholdCreate = tasks.onHouseholdCreate;
export const onTaskWrite = tasks.onTaskWrite;

export const runDailyDigests = digest.runDailyDigests;
export const deleteHouseholdRecursive = households.deleteHouseholdRecursive;
