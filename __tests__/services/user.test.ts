import {
  createOrUpdateUserProfile,
  getUserProfile,
  updateUserPreferences,
  updateOnboardingState,
  completeOnboarding
} from '../../src/services/user';
import { UserProfile, OnboardingState } from '../../src/models/User';

// Mock Firebase
jest.mock('../../src/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-uid' }
  },
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn()
}));

import { 
  doc, 
  serverTimestamp, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateUserProfile', () => {
    it('should create a new user profile if none exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any);

      const profile = await createOrUpdateUserProfile(
        'uid123',
        'test@example.com',
        'Test User',
        'parent'
      );

      expect(profile).toMatchObject({
        id: 'uid123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
        preferences: {
          language: 'no',
          notifications: true,
          timezone: 'Europe/Oslo'
        }
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const setDocCall = mockSetDoc.mock.calls[0];
      expect(setDocCall[1]).toEqual(expect.objectContaining({
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent'
      }));
    });

    it('should update existing user profile', async () => {
      const existingData = {
        email: 'old@example.com',
        name: 'Old Name',
        displayName: 'Old Name',
        role: 'parent',
        preferences: {
          language: 'en',
          notifications: false
        },
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: { toDate: () => new Date('2023-01-02') }
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => existingData
      } as any);

      await createOrUpdateUserProfile(
        'uid123',
        'new@example.com',
        'New Name'
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'New Name',
          updatedAt: { serverTimestamp: true }
        })
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return null if user does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any);

      const profile = await getUserProfile('nonexistent-uid');
      
      expect(profile).toBeNull();
    });

    it('should return user profile if exists', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
        preferences: {
          language: 'no',
          notifications: true
        },
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: { toDate: () => new Date('2023-01-02') }
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => userData
      } as any);

      const profile = await getUserProfile('uid123');

      expect(profile).toMatchObject({
        id: 'uid123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent'
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const newPreferences = {
        language: 'en' as const,
        notifications: false
      };

      await updateUserPreferences('uid123', newPreferences);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          preferences: expect.objectContaining({
            language: 'en',
            notifications: false,
            timezone: 'Europe/Oslo'
          }),
          updatedAt: { serverTimestamp: true }
        })
      );
    });
  });

  describe('updateOnboardingState', () => {
    it('should update onboarding state', async () => {
      const newState: Partial<OnboardingState> = {
        currentStep: 'family-structure',
        completedSteps: ['welcome']
      };

      await updateOnboardingState('uid123', newState);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          onboardingState: newState,
          updatedAt: { serverTimestamp: true }
        })
      );
    });
  });

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed', async () => {
      await completeOnboarding('uid123');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          onboardingState: expect.objectContaining({
            completed: true,
            currentStep: 'completed',
            completedSteps: ['welcome', 'family-structure', 'children-setup', 'reward-preview']
          }),
          updatedAt: { serverTimestamp: true }
        })
      );
    });
  });
});