import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';

export async function deleteHouseholdRecursive(householdId: string) {
  const functions = getFunctions(firebaseApp);
  const fn = httpsCallable(functions, 'deleteHouseholdRecursive');
  await fn({ householdId });
}
