import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../../../src/firebase/providers/AuthProvider';
import { UserProfile, OnboardingState } from '../../../src/models/User';

import { onAuthStateChanged } from 'firebase/auth';
import { 
  getUserProfile, 
  createOrUpdateUserProfile, 
  updateOnboardingState 
} from '../../../src/services/user';

// Mock Firebase
jest.mock('../../../src/firebase', () => ({
  auth: {}
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn()
}));

// Mock user service
jest.mock('../../../src/services/user', () => ({
  getUserProfile: jest.fn(),
  createOrUpdateUserProfile: jest.fn(),
  updateOnboardingState: jest.fn()
}));

const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockCreateOrUpdateUserProfile = createOrUpdateUserProfile as jest.MockedFunction<typeof createOrUpdateUserProfile>;
const mockUpdateOnboardingState = updateOnboardingState as jest.MockedFunction<typeof updateOnboardingState>;

// Test component that uses the auth hook
function TestComponent() {
  const auth = useAuth();
  
  return (
    <>
      <Text testID="loading">{auth.loading.toString()}</Text>
      <Text testID="user-id">{auth.userProfile?.id || 'none'}</Text>
      <Text testID="user-name">{auth.userProfile?.name || 'none'}</Text>
      <Text testID="onboarding-completed">{auth.hasCompletedOnboarding.toString()}</Text>
    </>
  );
}

describe('AuthProvider', () => {
  let unsubscribe: jest.MockedFunction<() => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      // Store the callback for later use
      (mockOnAuthStateChanged as any).callback = callback;
      return unsubscribe;
    });
  });

  it('should provide loading state initially', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId('loading')).toHaveTextContent('true');
    expect(getByTestId('user-id')).toHaveTextContent('none');
  });

  it('should handle user sign in and create profile', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    const mockProfile: UserProfile = {
      id: 'test-uid',
      email: 'test@example.com',
      name: 'Test User',
      role: 'parent',
      preferences: {
        language: 'no',
        notifications: true,
        timezone: 'Europe/Oslo'
      }
    };

    mockGetUserProfile.mockResolvedValueOnce(null); // No existing profile
    mockCreateOrUpdateUserProfile.mockResolvedValueOnce(mockProfile);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate user sign in
    await act(async () => {
      (mockOnAuthStateChanged as any).callback(mockUser);
    });

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('false');
    });

    expect(getByTestId('user-id')).toHaveTextContent('test-uid');
    expect(getByTestId('user-name')).toHaveTextContent('Test User');
    expect(getByTestId('onboarding-completed')).toHaveTextContent('false');

    expect(mockGetUserProfile).toHaveBeenCalledWith('test-uid');
    expect(mockCreateOrUpdateUserProfile).toHaveBeenCalledWith(
      'test-uid',
      'test@example.com',
      'Test User'
    );
  });

  it('should handle existing user profile', async () => {
    const mockUser = {
      uid: 'existing-uid',
      email: 'existing@example.com',
      displayName: 'Existing User'
    };

    const mockProfile: UserProfile = {
      id: 'existing-uid',
      email: 'existing@example.com',
      name: 'Existing User',
      role: 'parent',
      preferences: {
        language: 'no',
        notifications: true,
        timezone: 'Europe/Oslo'
      }
    };

    mockGetUserProfile.mockResolvedValueOnce(mockProfile);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      (mockOnAuthStateChanged as any).callback(mockUser);
    });

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('false');
    });

    expect(getByTestId('user-name')).toHaveTextContent('Existing User');
    expect(mockCreateOrUpdateUserProfile).not.toHaveBeenCalled();
  });

  it('should handle user sign out', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate user sign out
    await act(async () => {
      (mockOnAuthStateChanged as any).callback(null);
    });

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('false');
    });

    expect(getByTestId('user-id')).toHaveTextContent('none');
    expect(getByTestId('user-name')).toHaveTextContent('none');
  });

  it('should provide updateOnboarding function', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    const mockProfile: UserProfile = {
      id: 'test-uid',
      email: 'test@example.com',
      name: 'Test User',
      role: 'parent',
      preferences: {
        language: 'no',
        notifications: true,
        timezone: 'Europe/Oslo'
      }
    };

    mockGetUserProfile.mockResolvedValueOnce(mockProfile);

    function TestComponentWithUpdate() {
      const auth = useAuth();
      
      React.useEffect(() => {
        if (!auth.loading && auth.firebaseUser) {
          auth.updateOnboarding({
            currentStep: 'family-structure',
            completedSteps: ['welcome']
          });
        }
      }, [auth.loading, auth.firebaseUser, auth.updateOnboarding]);
      
      return <Text testID="test">test</Text>;
    }

    render(
      <AuthProvider>
        <TestComponentWithUpdate />
      </AuthProvider>
    );

    await act(async () => {
      (mockOnAuthStateChanged as any).callback(mockUser);
    });

    await waitFor(() => {
      expect(mockUpdateOnboardingState).toHaveBeenCalledWith(
        'test-uid',
        {
          currentStep: 'family-structure',
          completedSteps: ['welcome']
        }
      );
    });
  });

  it('should handle profile loading errors gracefully', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    mockGetUserProfile.mockRejectedValueOnce(new Error('Database error'));

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      (mockOnAuthStateChanged as any).callback(mockUser);
    });

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('false');
    });

    expect(getByTestId('user-id')).toHaveTextContent('none');
  });
});