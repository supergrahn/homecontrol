import {
  UserProfile,
  UserRole,
  AgeGroup,
  getAgeGroup,
  createUserProfile,
  getDefaultPreferences,
  hasAgeAppropriateFeatures,
  canHaveDeviceFeatures
} from '../../src/models/User';

describe('User Model', () => {
  describe('getAgeGroup', () => {
    it('should return "young" for ages 0-7', () => {
      expect(getAgeGroup(0)).toBe('young');
      expect(getAgeGroup(3)).toBe('young');
      expect(getAgeGroup(7)).toBe('young');
    });

    it('should return "middle" for ages 8-12', () => {
      expect(getAgeGroup(8)).toBe('middle');
      expect(getAgeGroup(10)).toBe('middle');
      expect(getAgeGroup(12)).toBe('middle');
    });

    it('should return "teen" for ages 13+', () => {
      expect(getAgeGroup(13)).toBe('teen');
      expect(getAgeGroup(15)).toBe('teen');
      expect(getAgeGroup(18)).toBe('teen');
    });
  });

  describe('createUserProfile', () => {
    it('should create a parent profile with Norwegian defaults', () => {
      const profile = createUserProfile('uid123', 'test@example.com', 'Test User');
      
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
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a child profile when specified', () => {
      const profile = createUserProfile('uid456', 'child@example.com', 'Child User', 'child');
      
      expect(profile.role).toBe('child');
      expect(profile.preferences.language).toBe('no');
    });
  });

  describe('getDefaultPreferences', () => {
    it('should return Norwegian defaults', () => {
      const preferences = getDefaultPreferences();
      
      expect(preferences).toEqual({
        language: 'no',
        notifications: true,
        timezone: 'Europe/Oslo'
      });
    });
  });

  describe('hasAgeAppropriateFeatures', () => {
    it('should return true for child profiles with age group', () => {
      const childProfile: UserProfile = {
        id: 'child1',
        email: 'child@test.com',
        name: 'Child',
        role: 'child',
        ageGroup: 'middle',
        preferences: getDefaultPreferences()
      };

      expect(hasAgeAppropriateFeatures(childProfile)).toBe(true);
    });

    it('should return false for parent profiles', () => {
      const parentProfile: UserProfile = {
        id: 'parent1',
        email: 'parent@test.com',
        name: 'Parent',
        role: 'parent',
        preferences: getDefaultPreferences()
      };

      expect(hasAgeAppropriateFeatures(parentProfile)).toBe(false);
    });

    it('should return false for child profiles without age group', () => {
      const childProfile: UserProfile = {
        id: 'child1',
        email: 'child@test.com',
        name: 'Child',
        role: 'child',
        preferences: getDefaultPreferences()
      };

      expect(hasAgeAppropriateFeatures(childProfile)).toBe(false);
    });
  });

  describe('canHaveDeviceFeatures', () => {
    it('should return true for middle/teen children with devices', () => {
      const middleChildProfile: UserProfile = {
        id: 'child1',
        email: 'child@test.com',
        name: 'Child',
        role: 'child',
        ageGroup: 'middle',
        deviceAccess: {
          hasDevice: true,
          deviceType: 'phone',
          parentalControls: true
        },
        preferences: getDefaultPreferences()
      };

      expect(canHaveDeviceFeatures(middleChildProfile)).toBe(true);
    });

    it('should return false for young children', () => {
      const youngChildProfile: UserProfile = {
        id: 'child1',
        email: 'child@test.com',
        name: 'Child',
        role: 'child',
        ageGroup: 'young',
        deviceAccess: {
          hasDevice: true,
          deviceType: 'tablet',
          parentalControls: true
        },
        preferences: getDefaultPreferences()
      };

      expect(canHaveDeviceFeatures(youngChildProfile)).toBe(false);
    });

    it('should return false for children without devices', () => {
      const childProfile: UserProfile = {
        id: 'child1',
        email: 'child@test.com',
        name: 'Child',
        role: 'child',
        ageGroup: 'middle',
        deviceAccess: {
          hasDevice: false,
          parentalControls: false
        },
        preferences: getDefaultPreferences()
      };

      expect(canHaveDeviceFeatures(childProfile)).toBe(false);
    });

    it('should return false for parent profiles', () => {
      const parentProfile: UserProfile = {
        id: 'parent1',
        email: 'parent@test.com',
        name: 'Parent',
        role: 'parent',
        preferences: getDefaultPreferences()
      };

      expect(canHaveDeviceFeatures(parentProfile)).toBe(false);
    });
  });
});