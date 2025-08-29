/* eslint-env jest */
/* global jest */
require('@testing-library/jest-native/extend-expect');

// Mock react-native-reanimated (v3) for Jest
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    setItem: async (k, v) => {
      store[k] = v;
    },
    getItem: async (k) => (k in store ? store[k] : null),
    removeItem: async (k) => {
      delete store[k];
    },
    clear: async () => {
      store = {};
    },
  };
});

// Note: RN 0.79 no longer requires NativeAnimatedHelper mock

// Mock RN Skia-based expo-image
jest.mock('expo-image', () => ({ Image: 'Image' }));

// Mock react-navigation helpers
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    createNavigationContainerRef: () => ({ navigate: jest.fn(), isReady: () => true }),
  };
});

// Mock firebase client modules used in SignIn
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'u1' } })),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), getApps: () => [], getApp: jest.fn() }));
jest.mock('firebase/firestore', () => ({ getFirestore: jest.fn(), getDocs: jest.fn(() => Promise.resolve({ docs: [] })), collection: jest.fn() }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn() }));
// Mock our firebase index re-exports used by app code
jest.mock('./src/firebase', () => ({ auth: {}, db: {}, storage: {}, firebaseApp: {} }));

// Mock react-native-safe-area-context for layout
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaView = ({ children }) => React.createElement('SafeAreaView', null, children);
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }) => React.createElement('SafeAreaProvider', null, children),
    SafeAreaView,
  };
});

// Mock i18n hook to return identity function
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k, o) => (o ? String(k) : String(k)) }) }));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
