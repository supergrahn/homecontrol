import * as admin from 'firebase-admin';
import * as invites from './invites';
import * as digest from './digest';
import * as tasks from './tasks';

if (!admin.apps.length) admin.initializeApp();

export const createInvite = invites.createInvite;
export const acceptInvite = invites.acceptInvite;

export const onHouseholdCreate = tasks.onHouseholdCreate;
export const onTaskWrite = tasks.onTaskWrite;

export const runDailyDigests = digest.runDailyDigests;
