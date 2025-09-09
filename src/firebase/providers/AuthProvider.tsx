import React from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../../firebase";
import { UserProfile, OnboardingState } from "../../models/User";
import { 
  getUserProfile, 
  createOrUpdateUserProfile, 
  updateOnboardingState 
} from "../../services/user";

interface AuthContextValue {
  /** Current Firebase user */
  firebaseUser: FirebaseUser | null;
  /** Enhanced user profile with Norwegian family context */
  userProfile: UserProfile | null;
  /** Onboarding state for new users */
  onboardingState: OnboardingState | null;
  /** Whether authentication is still loading */
  loading: boolean;
  /** Whether the user has completed onboarding */
  hasCompletedOnboarding: boolean;
  /** Update onboarding state */
  updateOnboarding: (state: Partial<OnboardingState>) => Promise<void>;
  /** Refresh user profile from database */
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [onboardingState, setOnboardingState] = React.useState<OnboardingState | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Load user profile when Firebase user changes
  const loadUserProfile = React.useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setUserProfile(null);
      setOnboardingState(null);
      setLoading(false);
      return;
    }

    try {
      let profile = await getUserProfile(user.uid);
      
      // If profile doesn't exist, create it
      if (!profile) {
        profile = await createOrUpdateUserProfile(
          user.uid,
          user.email || '',
          user.displayName || ''
        );
      }

      setUserProfile(profile);
      
      // Set default onboarding state if not present
      const defaultOnboarding: OnboardingState = {
        completed: false,
        currentStep: 'welcome',
        completedSteps: [],
        startedAt: new Date()
      };
      
      setOnboardingState(defaultOnboarding);
      
    } catch (error) {
      console.error('[AuthProvider] Failed to load user profile:', error);
      setUserProfile(null);
      setOnboardingState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to Firebase auth state changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      loadUserProfile(user);
    });

    return unsubscribe;
  }, [loadUserProfile]);

  // Update onboarding state
  const updateOnboarding = React.useCallback(async (state: Partial<OnboardingState>) => {
    if (!firebaseUser) return;

    try {
      await updateOnboardingState(firebaseUser.uid, state);
      setOnboardingState(prevState => ({
        ...prevState,
        ...state
      } as OnboardingState));
    } catch (error) {
      console.error('[AuthProvider] Failed to update onboarding state:', error);
      throw error;
    }
  }, [firebaseUser]);

  // Refresh user profile from database
  const refreshProfile = React.useCallback(async () => {
    if (!firebaseUser) return;

    try {
      const profile = await getUserProfile(firebaseUser.uid);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('[AuthProvider] Failed to refresh profile:', error);
      throw error;
    }
  }, [firebaseUser]);

  // Determine if user has completed onboarding
  const hasCompletedOnboarding = React.useMemo(() => {
    return onboardingState?.completed === true;
  }, [onboardingState]);

  const value = React.useMemo<AuthContextValue>(() => ({
    firebaseUser,
    userProfile,
    onboardingState,
    loading,
    hasCompletedOnboarding,
    updateOnboarding,
    refreshProfile
  }), [
    firebaseUser,
    userProfile,
    onboardingState,
    loading,
    hasCompletedOnboarding,
    updateOnboarding,
    refreshProfile
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    // Fallback for tests or misorganized component trees
    return {
      firebaseUser: null,
      userProfile: null,
      onboardingState: null,
      loading: true,
      hasCompletedOnboarding: false,
      updateOnboarding: async () => {},
      refreshProfile: async () => {}
    } as AuthContextValue;
  }
  return context;
}

/**
 * Hook to get current user profile (throws if not authenticated)
 */
export function useRequireAuth() {
  const auth = useAuth();
  
  if (!auth.firebaseUser || !auth.userProfile) {
    throw new Error('Authentication required');
  }
  
  return {
    ...auth,
    firebaseUser: auth.firebaseUser,
    userProfile: auth.userProfile
  };
}