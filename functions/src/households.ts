import * as functions from "firebase-functions";
import { admin, db } from "./admin";

async function deleteCollection(path: string, batchSize = 100): Promise<void> {
  const collRef = db.collection(path);
  while (true) {
    const snap = await collRef.limit(batchSize).get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      await deleteRecursively(`${path}/${d.id}`);
    }
  }
}

async function deleteRecursively(docPath: string): Promise<void> {
  const docRef = db.doc(docPath);
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    await deleteCollection(`${docPath}/${sub.id}`);
  }
  await docRef.delete();
}

export const deleteHouseholdRecursive = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth)
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Sign in required",
      );
    const hid: string = data?.householdId;
    if (!hid)
      throw new functions.https.HttpsError(
        "invalid-argument",
        "householdId is required",
      );

    // Only allow admins of the household to delete
    const memberRef = db.doc(`households/${hid}/members/${context.auth.uid}`);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists || memberSnap.get("role") !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can delete a household",
      );
    }

    // Remove from users' householdIds (best-effort)
    const membersSnap = await db.collection(`households/${hid}/members`).get();
    const batch = db.batch();
    membersSnap.docs.forEach((m: admin.firestore.QueryDocumentSnapshot) => {
      const uid = m.id;
      const userRef = db.doc(`users/${uid}`);
      batch.update(userRef, {
        householdIds: admin.firestore.FieldValue.arrayRemove(hid),
      });
    });
    await batch.commit();

    await deleteRecursively(`households/${hid}`);
    return { ok: true };
  },
);
