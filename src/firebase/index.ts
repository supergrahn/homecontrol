import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./config";
import { Platform } from "react-native";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/* eslint-disable @typescript-eslint/no-require-imports */
// Use persistent auth on native with AsyncStorage, fall back to default on web
let authInstance;
try {
  if (Platform.OS !== "web") {
    const AsyncStorageModule: any = require("@react-native-async-storage/async-storage");
    const ReactNativeAsyncStorage =
      AsyncStorageModule?.default ?? AsyncStorageModule;
    const fbAuth: any = require("firebase/auth");
    const getReactNativePersistence = fbAuth?.getReactNativePersistence;
    if (
      ReactNativeAsyncStorage &&
      typeof getReactNativePersistence === "function"
    ) {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    }
  }
} catch {
  // noop – fallback below
}

export const auth = authInstance ?? getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseApp = app;
