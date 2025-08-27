import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { isWithinQuietHours, nextAllowedTime, sendExpoPush } from './notifications';

const db = admin.firestore();

dayjs.extend(utc);
dayjs.extend(timezone);

// Run hourly; for each household, emit digest at its local target hour (default 07:00).
export const runDailyDigests = functions.pubsub.schedule('0 * * * *').onRun(async () => {
	const householdsSnap = await db.collection('households').get();
	for (const h of householdsSnap.docs) {
		const hid = h.id;
		const tz = (h.data() as any)?.timezone || 'UTC';
	const targetHour = Number(((h.data() as any)?.digestHour ?? 7));
		const nowTz = dayjs().tz(tz);
	if (nowTz.hour() !== targetHour) continue; // only process at local target hour
		const start = nowTz.startOf('day').toDate();
		const end = nowTz.endOf('day').toDate();
		const now = nowTz.toDate();

		// Fetch members
		const membersSnap = await db.collection(`households/${hid}/members`).get();
		const memberIds = membersSnap.docs.map(d => d.id);
		if (memberIds.length === 0) continue;

		// Today via nextOccurrenceAt
		const tasksRef = db.collection(`households/${hid}/tasks`);
		const statusIn = ['open','in_progress','blocked'];
		const todayNextSnap = await tasksRef
			.where('status', 'in', statusIn as any)
			.where('nextOccurrenceAt', '>=', start)
			.where('nextOccurrenceAt', '<=', end)
			.orderBy('nextOccurrenceAt', 'asc')
			.get();
		// Today via dueAt
		const todayDueSnap = await tasksRef
			.where('status', 'in', statusIn as any)
			.where('dueAt', '>=', start)
			.where('dueAt', '<=', end)
			.orderBy('dueAt', 'asc')
			.get();
		// Overdue via dueAt < now
		const overdueSnap = await tasksRef
			.where('status', 'in', statusIn as any)
			.where('dueAt', '<', now)
			.orderBy('dueAt', 'asc')
			.get();

		const dedup: Record<string, FirebaseFirestore.DocumentSnapshot> = {};
		todayNextSnap.docs.forEach(d => { dedup[d.id] = d; });
		todayDueSnap.docs.forEach(d => { dedup[d.id] = d; });
			const todayTasks = Object.values(dedup);
			const overdueTasks = overdueSnap.docs.filter(d => !todayTasks.find(t => t.id === d.id));

			const topTitles = (docs: FirebaseFirestore.DocumentSnapshot[], n: number) =>
				docs.slice(0, n).map(d => String((d.data() as any)?.title || d.id));

		// Summarize
		const summary = {
			date: nowTz.format('YYYY-MM-DD'),
			tz,
					counts: {
				today: todayTasks.length,
				overdue: overdueTasks.length,
			},
					samples: {
						todayTitles: topTitles(todayTasks, 2),
						overdueTitles: topTitles(overdueTasks, 2)
					}
		};

		// Write one activity entry per day (skip if already exists)
		const digestId = `digest_${summary.date}`;
		const digestRef = db.doc(`households/${hid}/activity/${digestId}`);
		const existed = await digestRef.get();
		if (existed.exists) continue;
			await digestRef.set({
			actorId: null,
			action: 'digest.daily',
			taskId: null,
			payload: summary,
			at: admin.firestore.FieldValue.serverTimestamp()
		}, { merge: true });

			// Push notifications to members who have a pushToken set, respecting quiet hours
			try {
				const usersSnap = await db.getAll(...memberIds.map(uid => db.doc(`users/${uid}`)));
				const tzFallback = tz;
				const now = new Date();
				const messages: { to: string[]; title: string; body: string; data?: Record<string, any> }[] = [];
						for (const doc of usersSnap) {
					const u = doc.data() as any;
							if (u?.notificationsEnabled === false) continue;
					const token: string | undefined = u?.pushToken;
					if (!token) continue;
					const quiet = u?.quietHours as { start: string; end: string; tz?: string } | undefined;
					if (isWithinQuietHours(now, quiet, tzFallback)) {
						// Skip immediate send; could schedule later with a separate queue. For now, we skip.
						continue;
					}
							messages.push({
						to: [token],
						title: 'Daily summary',
								body: `Today ${summary.counts.today} · Overdue ${summary.counts.overdue}`,
								data: { type: 'digest.daily', hid, counts: summary.counts, date: summary.date }
					});
				}
				if (messages.length) await sendExpoPush(messages);
			} catch (e) {
				console.warn('[digest] push step failed', e);
			}
	}
	return null;
});
