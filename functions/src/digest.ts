import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Run daily at 07:00 UTC; adjust schedule in the Firebase console if needed
export const runDailyDigests = functions.pubsub.schedule('0 7 * * *').onRun(async () => {
	// Minimal stub: mark a heartbeat doc so we know the job runs
	await db.collection('meta').doc('digest').set({ lastRunAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
	return null;
});
