// Enhanced Norwegian School Integration Service
import { API_BASE } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Enhanced types based on School Crawler Platform capabilities
export type SchoolEvent = {
  id: string;
  title: string;
  start_time: string; // ISO 8601 format with timezone
  end_time: string;
  location?: string;
  teacher?: string;
  subject?: string;
  grade?: string;
  type: "lesson" | "break" | "lunch" | "assembly" | "other";
  description?: string;
};

export type BellPeriod = {
  period: number;
  start_time: string; // HH:MM format
  end_time: string;
  name?: string;
};

export type SchoolSummary = {
  status: "ok" | "error";
  events: SchoolEvent[];
  bell_schedule: BellPeriod[];
  metadata: {
    school_name?: string;
    date: string;
    timezone: string;
  };
  last_updated?: string;
  cache_status?: "fresh" | "stale";
};

// Norwegian School Crawler Platform API Integration
class NorwegianSchoolAPI {
  private baseURL = API_BASE;

  async getAuthToken(): Promise<string | null> {
    // Get Firebase token for authentication when enabled
    return await AsyncStorage.getItem('firebase_token');
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  // Health check for API connectivity
  async checkHealth(): Promise<{ status: string; version: string }> {
    return this.makeRequest('/health');
  }

  // Get tomorrow's schedule for a grade
  async getTomorrowSchedule(gradeId: string): Promise<SchoolSummary> {
    return this.makeRequest(`/feed/tomorrow/${gradeId}`);
  }

  // Parse school website URL
  async parseSchoolWebsite(url: string, render: 'auto' | 'always' | 'never' = 'auto'): Promise<SchoolSummary> {
    return this.makeRequest('/summary/next-day', {
      method: 'POST',
      body: JSON.stringify({ url, render }),
    });
  }

  // Search for Norwegian schools
  async searchNorwegianSchools(query: string, limit = 10): Promise<any> {
    return this.makeRequest(`/school-search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Get available dates for a grade
  async getAvailableDates(gradeId: string): Promise<any> {
    return this.makeRequest(`/feed/tomorrow/${gradeId}/dates`);
  }

  // Get ICS calendar feed
  async getCalendarFeed(gradeId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/feed/tomorrow/${gradeId}.ics`);
    return response.text();
  }
}

const norwegianSchoolAPI = new NorwegianSchoolAPI();

// Enhanced function for Norwegian school integration
export async function fetchNextDaySummary(
  childSchoolIdOrUrl: string
): Promise<SchoolSummary | null> {
  try {
    let result: SchoolSummary;
    
    // Check if it's a grade ID or URL
    if (childSchoolIdOrUrl.startsWith('schools__')) {
      // It's a grade ID, use the direct feed endpoint
      result = await norwegianSchoolAPI.getTomorrowSchedule(childSchoolIdOrUrl);
    } else {
      // It's a URL, parse the school website
      result = await norwegianSchoolAPI.parseSchoolWebsite(childSchoolIdOrUrl);
    }
    
    // Cache the result for offline usage
    await cacheSchoolData(childSchoolIdOrUrl, result);
    
    return result;
  } catch (error) {
    console.warn('School API failed, trying cache:', error);
    
    // Fallback to cached data
    const cached = await getCachedSchoolData(childSchoolIdOrUrl);
    if (cached) {
      return { ...cached, cache_status: 'stale' };
    }
    
    return null;
  }
}

// Enhanced functions for Norwegian school discovery
export async function searchNorwegianSchools(query: string): Promise<any> {
  try {
    return await norwegianSchoolAPI.searchNorwegianSchools(query);
  } catch (error) {
    console.error('Failed to search Norwegian schools:', error);
    return { count: 0, items: [] };
  }
}

export async function getNorwegianSchoolCalendar(gradeId: string): Promise<string | null> {
  try {
    return await norwegianSchoolAPI.getCalendarFeed(gradeId);
  } catch (error) {
    console.error('Failed to get Norwegian school calendar:', error);
    return null;
  }
}

// Offline caching for Norwegian school data
async function cacheSchoolData(key: string, data: SchoolSummary): Promise<void> {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(`school_cache_${key}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache school data:', error);
  }
}

async function getCachedSchoolData(key: string): Promise<SchoolSummary | null> {
  try {
    const cached = await AsyncStorage.getItem(`school_cache_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    
    // Data is valid for 24 hours
    const CACHE_DURATION = 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > CACHE_DURATION) {
      await AsyncStorage.removeItem(`school_cache_${key}`);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Failed to get cached school data:', error);
    return null;
  }
}
