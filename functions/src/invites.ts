import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const db = admin.firestore();

export const createInvite = functions.https.onCall(async (data, context) => {
  const { householdId, email, role } = data as { householdId: string; email: string; role?: string };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in');

  const member = await db.doc(`households/${householdId}/members/${uid}`).get();
  if (!member.exists || member.data()?.role !== 'admin')
    throw new functions.https.HttpsError('permission-denied', 'Admin only');

  const token = crypto.randomUUID();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const inviteRef = db.collection(`households/${householdId}/invites`).doc();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 864e5));

  await inviteRef.set({
    email, role: role ?? 'adult', status: 'pending', tokenHash,
    createdBy: uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), expiresAt
  });

  // TODO: send email with Firebase Dynamic Link embedding inviteRef.id and token
  return { inviteId: inviteRef.id, token }; // return token to client email-sender flow; never store raw token
});

export const acceptInvite = functions.https.onCall(async (data, context) => {
  const { householdId, inviteId, token } = data as { householdId: string; inviteId: string; token: string };
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in');

  const invRef = db.doc(`households/${householdId}/invites/${inviteId}`);
  const invSnap = await invRef.get();
  if (!invSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite missing');

  const inv = invSnap.data()!;
  if (inv.status !== 'pending' || inv.expiresAt.toDate() < new Date())
    throw new functions.https.HttpsError('failed-precondition', 'Invite invalid/expired');

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (hash !== inv.tokenHash) throw new functions.https.HttpsError('permission-denied', 'Bad token');

  await db.doc(`households/${householdId}/members/${uid}`).set({
    userId: uid, role: inv.role ?? 'adult', joinedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await invRef.update({ status: 'accepted' });

  await db.doc(`users/${uid}`).set({
    householdIds: admin.firestore.FieldValue.arrayUnion(householdId)
  }, { merge: true });

  return { ok: true };
});
