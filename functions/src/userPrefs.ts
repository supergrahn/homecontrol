import * as functions from "firebase-functions";
import { db } from "./admin";

export const setDigestPreferences = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Sign in");
    const { householdId, prefs } = data as { householdId: string; prefs: any };
    if (!householdId || !prefs)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId and prefs are required"
      );
    const ref = db.doc(`users/${uid}/households/${householdId}`);
    await ref.set({ digestPrefs: prefs }, { merge: true });
    return { ok: true };
  }
);

export const getDigestPreferences = functions.https.onCall(
  async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
      throw new functions.https.HttpsError("unauthenticated", "Sign in");
    const { householdId } = data as { householdId: string };
    if (!householdId)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId is required"
      );
    const ref = db.doc(`users/${uid}/households/${householdId}`);
    const snap = await ref.get();
    const prefs = (snap.data() as any)?.digestPrefs || null;
    return { ok: true, prefs };
  }
);
