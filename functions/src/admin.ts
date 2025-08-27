import * as admin from "firebase-admin";

// Initialize the default app exactly once before any service usage.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Convenience Firestore export
const db = admin.firestore();

export { admin, db };
