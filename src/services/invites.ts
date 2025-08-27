import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { firebaseApp, db } from '../firebase';

export async function createInvite(householdId: string, email: string, role: 'adult' | 'viewer' = 'adult') {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, 'createInvite');
  const res = await fn({ householdId, email, role });
  return res.data as { inviteId: string; token?: string };
}

export async function acceptInvite(householdId: string, inviteId: string, token: string) {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, 'acceptInvite');
  const res = await fn({ householdId, inviteId, token });
  return res.data as { ok: boolean };
}

// Admin-only helpers (rules enforce admin-only reads/writes on invites)

export type Invite = {
  id: string;
  email: string;
  role: 'adult' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt?: Date | null;
  expiresAt?: Date | null;
};

export async function listInvites(householdId: string): Promise<Invite[]> {
  const ref = collection(db, `households/${householdId}/invites`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data() as any;
    const toDate = (v: any) => (v && v.toDate) ? v.toDate() : v ?? null;
    return {
      id: d.id,
      email: data.email,
      role: data.role ?? 'adult',
      status: data.status ?? 'pending',
      createdAt: toDate(data.createdAt),
      expiresAt: toDate(data.expiresAt),
    } as Invite;
  });
}

export async function revokeInvite(householdId: string, inviteId: string) {
  const ref = doc(db, `households/${householdId}/invites/${inviteId}`);
  await updateDoc(ref, { status: 'revoked' });
}
