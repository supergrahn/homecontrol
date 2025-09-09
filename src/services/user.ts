import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { 
  doc, 
  serverTimestamp, 
  setDoc, 
  getDoc, 
  updateDoc
} from "firebase/firestore";
import { 
  UserProfile, 
  UserRole, 
  OnboardingState, 
  createUserProfile, 
  getDefaultPreferences 
} from "../models/User";

/**
 * Updates the current user's display name in Firebase Auth and mirrors it in users/{uid}.
 */
export async function setUserDisplayName(name: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const trimmed = name.trim();
  if (!trimmed) return;

  // Update Firebase Auth profile
  await updateProfile(user, { displayName: trimmed });

  // Mirror to users collection
  await setDoc(
    doc(db, `users/${user.uid}`),
    { displayName: trimmed, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Creates or updates a user profile with enhanced Norwegian family context
 */
export async function createOrUpdateUserProfile(
  uid: string,
  email: string,
  name: string,
  role: UserRole = 'parent'
): Promise<UserProfile> {
  const userRef = doc(db, `users/${uid}`);
  
  // Check if user already exists
  const existingDoc = await getDoc(userRef);
  
  if (existingDoc.exists()) {
    // Update existing user with new information
    const updates = {
      name,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(userRef, updates);
    
    // Return updated profile
    const data = existingDoc.data();
    return convertFirestoreToUserProfile({ ...data, ...updates }, uid);
  } else {
    // Create new user profile
    const profile = createUserProfile(uid, email, name, role);
    const firestoreData = convertUserProfileToFirestore(profile);
    
    await setDoc(userRef, firestoreData);
    return profile;
  }
}

/**
 * Gets a user profile by ID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, `users/${uid}`);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    return null;
  }
  
  return convertFirestoreToUserProfile(snap.data(), uid);
}

/**
 * Updates user preferences
 */
export async function updateUserPreferences(
  uid: string, 
  preferences: Partial<UserProfile['preferences']>
): Promise<void> {
  const userRef = doc(db, `users/${uid}`);
  
  await updateDoc(userRef, {
    preferences: {
      ...getDefaultPreferences(),
      ...preferences
    },
    updatedAt: serverTimestamp()
  });
}

/**
 * Updates onboarding state for a user
 */
export async function updateOnboardingState(
  uid: string,
  state: Partial<OnboardingState>
): Promise<void> {
  const userRef = doc(db, `users/${uid}`);
  
  await updateDoc(userRef, {
    onboardingState: state,
    updatedAt: serverTimestamp()
  });
}

/**
 * Marks onboarding as completed
 */
export async function completeOnboarding(uid: string): Promise<void> {
  const completedState: OnboardingState = {
    completed: true,
    currentStep: 'completed',
    completedSteps: ['welcome', 'family-structure', 'children-setup', 'reward-preview'],
    completedAt: new Date()
  };
  
  await updateOnboardingState(uid, completedState);
}

/**
 * Converts Firestore data to UserProfile
 */
function convertFirestoreToUserProfile(data: any, uid: string): UserProfile {
  return {
    id: uid,
    email: data.email || '',
    name: data.name || data.displayName || '',
    role: data.role || 'parent',
    ageGroup: data.ageGroup,
    deviceAccess: data.deviceAccess,
    age: data.age,
    preferences: {
      ...getDefaultPreferences(),
      ...data.preferences
    },
    householdIds: data.householdIds || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
}

/**
 * Converts UserProfile to Firestore-compatible format
 */
function convertUserProfileToFirestore(profile: UserProfile): any {
  return {
    email: profile.email,
    name: profile.name,
    displayName: profile.name, // For backward compatibility
    role: profile.role,
    ageGroup: profile.ageGroup,
    deviceAccess: profile.deviceAccess,
    age: profile.age,
    preferences: profile.preferences,
    householdIds: profile.householdIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}
