import * as functions from "firebase-functions";
import { admin, db } from "./admin";

export const healthCheck = functions.https.onCall(async (_data, _ctx) => {
  try {
    const time = admin.firestore.Timestamp.now();
    // Minimal read to verify Firestore access
    const doc = await db.doc("system/health").get();
    const exists = doc.exists;
    return {
      ok: true,
      time: time.toDate().toISOString(),
      firestoreOk: true,
      systemDocExists: exists,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});
