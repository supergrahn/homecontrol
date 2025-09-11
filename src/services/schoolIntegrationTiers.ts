/**
 * 4-Tier School Integration Fallback System
 * 
 * Ensures school features work without API access through graduated fallback strategy:
 * - Tier 1: Full API integration (ideal scenario)
 * - Tier 2: Manual entry with intelligent assistance
 * - Tier 3: Community-driven data sharing
 * - Tier 4: Generic school features that always work
 */

import { Child } from "./children";
import { culturalService, SupportedCulture } from "./norwegianCulture";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SchoolIntegrationTier = 'tier1_api' | 'tier2_manual' | 'tier3_community' | 'tier4_generic';

export interface SchoolData {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'private' | 'international';
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  grades: number[];
  hasAfterSchool: boolean;
  afterSchoolPrograms: string[];
  tier: SchoolIntegrationTier;
  lastUpdated: Date;
  dataSource: 'api' | 'manual' | 'community' | 'generic';
}

export interface SchoolSchedule {
  childId: string;
  date: Date;
  periods: {
    time: string;
    subject: string;
    teacher?: string;
    room?: string;
    homework?: string;
  }[];
  tier: SchoolIntegrationTier;
  confidence: number; // 0-1, how confident we are in this data
}

export interface SchoolDocument {
  id: string;
  childId: string;
  title: string;
  type: 'homework' | 'announcement' | 'permission' | 'report' | 'general';
  content?: string;
  dueDate?: Date;
  requiresAction: boolean;
  tier: SchoolIntegrationTier;
  uploadedAt: Date;
}

export interface CommunitySchoolData {
  schoolId: string;
  contributorId: string; // Anonymous ID for privacy
  data: Partial<SchoolData>;
  votes: number; // Community validation
  reportedIssues: number;
  lastVerified: Date;
}

export class SchoolIntegrationService {
  private readonly storageKeys = {
    schools: 'school_integration_schools',
    schedules: 'school_integration_schedules',
    documents: 'school_integration_documents',
    community: 'school_integration_community',
    tier: 'school_integration_tier',
  };

  private currentTier: SchoolIntegrationTier = 'tier1_api';

  constructor() {
    this.initializeTierDetection();
  }

  /**
   * TIER 1: Full API Integration
   * Attempts to connect to official school APIs or crawlers
   */
  async tryTier1Integration(school: Partial<SchoolData>): Promise<SchoolData | null> {
    try {
      // Try official API integration first
      const apiData = await this.connectToSchoolAPI(school);
      if (apiData) {
        return {
          ...apiData,
          tier: 'tier1_api',
          dataSource: 'api',
          lastUpdated: new Date(),
        };
      }

      // Try school crawler integration
      const crawlerData = await this.connectToSchoolCrawler(school);
      if (crawlerData) {
        return {
          ...crawlerData,
          tier: 'tier1_api',
          dataSource: 'api',
          lastUpdated: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.warn('Tier 1 integration failed:', error);
      return null;
    }
  }

  /**
   * TIER 2: Manual Entry with Intelligent Assistance
   * Guides parents through manual data entry with smart suggestions
   */
  async createTier2School(baseData: Partial<SchoolData>): Promise<SchoolData> {
    const culture = culturalService.getCurrentConfiguration().culture;
    
    // Generate intelligent defaults based on culture and school type
    const intelligentDefaults = this.generateIntelligentDefaults(baseData, culture);
    
    return {
      id: baseData.id || `manual_${Date.now()}`,
      name: baseData.name || 'Unknown School',
      type: baseData.type || 'primary',
      grades: baseData.grades || this.getDefaultGrades(baseData.type || 'primary', culture),
      hasAfterSchool: baseData.hasAfterSchool ?? true,
      afterSchoolPrograms: baseData.afterSchoolPrograms || intelligentDefaults.afterSchoolPrograms,
      tier: 'tier2_manual',
      dataSource: 'manual',
      lastUpdated: new Date(),
      ...intelligentDefaults,
    };
  }

  /**
   * Get manual entry assistance for school data
   */
  getManualEntryAssistance(culture: SupportedCulture): {
    suggestions: {
      afterSchoolPrograms: string[];
      typicalSchedule: { time: string; subject: string }[];
      commonDocuments: string[];
    };
    guidance: string[];
  } {
    if (culture === 'norwegian') {
      return {
        suggestions: {
          afterSchoolPrograms: ['SFO', 'AKS', 'Fritidsklub'],
          typicalSchedule: [
            { time: '08:00', subject: 'Norsk' },
            { time: '09:00', subject: 'Matematikk' },
            { time: '10:00', subject: 'Pause' },
            { time: '10:15', subject: 'Samfunnsfag' },
            { time: '11:15', subject: 'Kroppsøving' },
            { time: '12:15', subject: 'Lunsj' },
            { time: '13:00', subject: 'Kunst og håndverk' },
          ],
          commonDocuments: ['Lekser', 'Foreldrebrev', 'Tillatelse til tur', 'Karakterkort'],
        },
        guidance: [
          'De fleste norske skoler har SFO (skolefritidsordning) fram til 4. klasse',
          'Typisk skoledag varer fra 08:00 til 13:00-14:00',
          'Matpause er vanligvis 30-45 minutter',
          'Kontakt skolen direkte for eksakt timeplan',
        ],
      };
    } else {
      // Generic guidance for other cultures
      return {
        suggestions: {
          afterSchoolPrograms: ['After School Care', 'Sports Programs', 'Homework Club'],
          typicalSchedule: [
            { time: '08:00', subject: 'Language Arts' },
            { time: '09:00', subject: 'Mathematics' },
            { time: '10:00', subject: 'Break' },
            { time: '10:15', subject: 'Science' },
            { time: '11:15', subject: 'Physical Education' },
            { time: '12:15', subject: 'Lunch' },
            { time: '13:00', subject: 'Arts' },
          ],
          commonDocuments: ['Homework', 'Parent Letter', 'Permission Slip', 'Report Card'],
        },
        guidance: [
          'Most schools offer after-school programs until 16:00-17:00',
          'Typical school day runs from 08:00 to 14:00-15:00',
          'Lunch break is usually 30-60 minutes',
          'Contact the school directly for exact schedule',
        ],
      };
    }
  }

  /**
   * TIER 3: Community-driven Data Sharing
   * Parents help each other by sharing school information
   */
  async getCommunitySchoolData(schoolId: string): Promise<SchoolData | null> {
    try {
      const communityData = await this.loadCommunityData(schoolId);
      if (!communityData || communityData.length === 0) return null;

      // Aggregate community contributions with validation
      const aggregated = this.aggregateCommunityData(communityData);
      
      if (aggregated) {
        return {
          ...aggregated,
          tier: 'tier3_community',
          dataSource: 'community',
          lastUpdated: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.warn('Tier 3 community data failed:', error);
      return null;
    }
  }

  /**
   * Contribute to community school data (anonymous)
   */
  async contributeCommunityData(schoolId: string, data: Partial<SchoolData>): Promise<void> {
    try {
      const anonymousId = await this.getAnonymousContributorId();
      const contribution: CommunitySchoolData = {
        schoolId,
        contributorId: anonymousId,
        data: this.sanitizeContribution(data),
        votes: 1, // Self-vote
        reportedIssues: 0,
        lastVerified: new Date(),
      };

      await this.saveCommunityContribution(contribution);
    } catch (error) {
      console.error('Failed to contribute community data:', error);
    }
  }

  /**
   * TIER 4: Generic School Features
   * Always-working fallback with basic school functionality
   */
  createGenericSchool(name: string, type: 'primary' | 'secondary' = 'primary'): SchoolData {
    const culture = culturalService.getCurrentConfiguration().culture;
    
    return {
      id: `generic_${Date.now()}`,
      name: name,
      type: type,
      grades: this.getDefaultGrades(type, culture),
      hasAfterSchool: true,
      afterSchoolPrograms: this.getGenericAfterSchoolPrograms(culture),
      tier: 'tier4_generic',
      dataSource: 'generic',
      lastUpdated: new Date(),
    };
  }

  /**
   * Get generic schedule template
   */
  getGenericScheduleTemplate(grade: number, culture: SupportedCulture): SchoolSchedule {
    const subjects = this.getGenericSubjects(grade, culture);
    const startTime = culture === 'norwegian' ? 8 : 8; // Could vary by culture
    
    const periods = subjects.map((subject, index) => ({
      time: `${String(startTime + index).padStart(2, '0')}:00`,
      subject: subject,
      teacher: undefined,
      room: undefined,
      homework: undefined,
    }));

    return {
      childId: '',
      date: new Date(),
      periods,
      tier: 'tier4_generic',
      confidence: 0.5, // Generic template, medium confidence
    };
  }

  /**
   * Smart tier detection and fallback
   */
  async detectOptimalTier(school: Partial<SchoolData>): Promise<SchoolIntegrationTier> {
    // Try Tier 1 first
    const tier1Data = await this.tryTier1Integration(school);
    if (tier1Data) {
      await this.setCurrentTier('tier1_api');
      return 'tier1_api';
    }

    // Check if community data exists
    const communityData = school.id ? await this.getCommunitySchoolData(school.id) : null;
    if (communityData && this.validateCommunityData(communityData)) {
      await this.setCurrentTier('tier3_community');
      return 'tier3_community';
    }

    // Check if user prefers manual entry
    const preferences = await culturalService.getCulturalPreferences();
    if (this.userPrefersManualEntry(preferences)) {
      await this.setCurrentTier('tier2_manual');
      return 'tier2_manual';
    }

    // Default to generic
    await this.setCurrentTier('tier4_generic');
    return 'tier4_generic';
  }

  /**
   * Get comprehensive school data using best available tier
   */
  async getSchoolData(school: Partial<SchoolData>): Promise<SchoolData> {
    const optimalTier = await this.detectOptimalTier(school);
    
    switch (optimalTier) {
      case 'tier1_api':
        const apiData = await this.tryTier1Integration(school);
        if (apiData) return apiData;
        // Fall through to next tier
        
      case 'tier3_community':
        const communityData = school.id ? await this.getCommunitySchoolData(school.id) : null;
        if (communityData) return communityData;
        // Fall through to next tier
        
      case 'tier2_manual':
        return await this.createTier2School(school);
        
      case 'tier4_generic':
      default:
        return this.createGenericSchool(school.name || 'School', school.type);
    }
  }

  // Private helper methods
  private async initializeTierDetection(): Promise<void> {
    try {
      const storedTier = await AsyncStorage.getItem(this.storageKeys.tier);
      if (storedTier) {
        this.currentTier = storedTier as SchoolIntegrationTier;
      }
    } catch (error) {
      console.warn('Failed to load tier preference:', error);
    }
  }

  private async connectToSchoolAPI(school: Partial<SchoolData>): Promise<SchoolData | null> {
    // This would implement actual API connections
    // For now, simulate API failure to test fallbacks
    return null;
  }

  private async connectToSchoolCrawler(school: Partial<SchoolData>): Promise<SchoolData | null> {
    // This would implement school crawler connections
    // For now, simulate crawler failure to test fallbacks
    return null;
  }

  private generateIntelligentDefaults(baseData: Partial<SchoolData>, culture: SupportedCulture): Partial<SchoolData> {
    if (culture === 'norwegian') {
      return {
        afterSchoolPrograms: ['SFO', 'AKS'],
        grades: baseData.type === 'primary' ? [1, 2, 3, 4, 5, 6, 7] : [8, 9, 10],
      };
    } else {
      return {
        afterSchoolPrograms: ['After School Care'],
        grades: baseData.type === 'primary' ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12],
      };
    }
  }

  private getDefaultGrades(type: 'primary' | 'secondary' | 'private' | 'international', culture: SupportedCulture): number[] {
    if (culture === 'norwegian') {
      switch (type) {
        case 'primary':
          return [1, 2, 3, 4, 5, 6, 7]; // Norwegian barneskole
        case 'secondary':
          return [8, 9, 10]; // Norwegian ungdomsskole
        default:
          return [1, 2, 3, 4, 5, 6, 7];
      }
    } else {
      switch (type) {
        case 'primary':
          return [1, 2, 3, 4, 5, 6]; // Elementary
        case 'secondary':
          return [7, 8, 9, 10, 11, 12]; // Middle + High school
        default:
          return [1, 2, 3, 4, 5, 6];
      }
    }
  }

  private getGenericAfterSchoolPrograms(culture: SupportedCulture): string[] {
    if (culture === 'norwegian') {
      return ['SFO', 'Fritidsaktiviteter'];
    } else {
      return ['After School Care', 'Homework Club'];
    }
  }

  private getGenericSubjects(grade: number, culture: SupportedCulture): string[] {
    if (culture === 'norwegian') {
      const baseSubjects = ['Norsk', 'Matematikk', 'Samfunnsfag', 'Naturfag'];
      if (grade >= 2) baseSubjects.push('Engelsk');
      if (grade >= 5) baseSubjects.push('Kunst og håndverk', 'Kroppsøving');
      return baseSubjects;
    } else {
      const baseSubjects = ['Language Arts', 'Mathematics', 'Science', 'Social Studies'];
      if (grade >= 3) baseSubjects.push('Art', 'Physical Education');
      return baseSubjects;
    }
  }

  private async loadCommunityData(schoolId: string): Promise<CommunitySchoolData[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.storageKeys.community}_${schoolId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private aggregateCommunityData(contributions: CommunitySchoolData[]): SchoolData | null {
    if (contributions.length === 0) return null;

    // Simple aggregation - in production, this would be more sophisticated
    const validated = contributions.filter(c => c.votes > c.reportedIssues);
    if (validated.length === 0) return null;

    const mostRecent = validated.sort((a, b) => 
      b.lastVerified.getTime() - a.lastVerified.getTime()
    )[0];

    return {
      id: mostRecent.schoolId,
      name: mostRecent.data.name || 'Community School',
      type: mostRecent.data.type || 'primary',
      grades: mostRecent.data.grades || [1, 2, 3, 4, 5, 6, 7],
      hasAfterSchool: mostRecent.data.hasAfterSchool ?? true,
      afterSchoolPrograms: mostRecent.data.afterSchoolPrograms || [],
      tier: 'tier3_community',
      dataSource: 'community',
      lastUpdated: mostRecent.lastVerified,
    };
  }

  private validateCommunityData(data: SchoolData): boolean {
    // Basic validation - has essential data
    return !!(data.name && data.type && data.grades && data.grades.length > 0);
  }

  private async getAnonymousContributorId(): Promise<string> {
    try {
      let id = await AsyncStorage.getItem('anonymous_contributor_id');
      if (!id) {
        id = `contributor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('anonymous_contributor_id', id);
      }
      return id;
    } catch (error) {
      return `contributor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  private sanitizeContribution(data: Partial<SchoolData>): Partial<SchoolData> {
    // Remove sensitive information before sharing with community
    return {
      name: data.name,
      type: data.type,
      grades: data.grades,
      hasAfterSchool: data.hasAfterSchool,
      afterSchoolPrograms: data.afterSchoolPrograms,
      // Exclude address, phone, email for privacy
    };
  }

  private async saveCommunityContribution(contribution: CommunitySchoolData): Promise<void> {
    try {
      const key = `${this.storageKeys.community}_${contribution.schoolId}`;
      const existing = await this.loadCommunityData(contribution.schoolId);
      const updated = [...existing, contribution];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save community contribution:', error);
    }
  }

  private userPrefersManualEntry(preferences: any): boolean {
    // This would check user preferences for manual vs automatic data entry
    // For now, assume false to prioritize automated solutions
    return false;
  }

  private async setCurrentTier(tier: SchoolIntegrationTier): Promise<void> {
    try {
      this.currentTier = tier;
      await AsyncStorage.setItem(this.storageKeys.tier, tier);
    } catch (error) {
      console.warn('Failed to save tier preference:', error);
    }
  }

  // Public getter for current tier
  getCurrentTier(): SchoolIntegrationTier {
    return this.currentTier;
  }
}

// Export singleton instance
export const schoolIntegrationService = new SchoolIntegrationService();