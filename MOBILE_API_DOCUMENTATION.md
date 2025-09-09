# School Crawler Mobile API Documentation

## Overview

The School Crawler API provides access to school schedule data, timetables, and educational content parsing services. The API is deployed as a serverless Lambda function with global availability.

**Base URL:** `https://1gzup0ln8l.execute-api.eu-north-1.amazonaws.com/prod`

**Authentication:** Firebase JWT tokens (when enabled)

**Content-Type:** `application/json`

---

## 🔐 Authentication

### Firebase Authentication
The API supports Firebase JWT authentication. Include the Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase-id-token>
```

**Current Status:** Authentication is disabled (`AUTH_MODE=none`) for development. Will be enabled for production.

---

## 📱 Core Mobile Endpoints

### 1. Health Check
**GET** `/health`

Check if the API is running and healthy.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0", 
  "user_agent": "SchoolCrawler/0.1"
}
```

**Usage:** Use for connectivity testing and API status monitoring.

---

### 2. School Schedule Parsing
**POST** `/summary/next-day`

Parse a school website URL to extract tomorrow's schedule information.

**Request Body:**
```json
{
  "url": "https://school-website.com/schedule",
  "render": "auto" // "auto", "always", "never"
}
```

**Response:**
```json
{
  "status": "ok",
  "events": [
    {
      "id": "evt_123",
      "title": "Mathematics",
      "start_time": "2025-09-09T08:00:00+02:00",
      "end_time": "2025-09-09T08:45:00+02:00",
      "location": "Room 101",
      "teacher": "Ms. Johnson",
      "subject": "MATH",
      "grade": "5A",
      "type": "lesson"
    }
  ],
  "bell_schedule": [
    {
      "period": 1,
      "start_time": "08:00",
      "end_time": "08:45"
    }
  ],
  "metadata": {
    "school_name": "Example School",
    "date": "2025-09-09",
    "timezone": "Europe/Stockholm"
  }
}
```

**Error Response:**
```json
{
  "detail": "Blocked by robots.txt",
  "status_code": 403
}
```

---

### 3. Grade-Specific Schedule
**GET** `/feed/tomorrow/{grade_id}`

Get tomorrow's schedule for a specific grade.

**Parameters:**
- `grade_id`: Grade identifier (e.g., "schools__5A__2025-2026")

**Response:**
```json
{
  "grade_id": "schools__5A__2025-2026",
  "date": "2025-09-09",
  "events": [
    // Same event format as above
  ],
  "bell_schedule": [
    // Same bell schedule format
  ],
  "last_updated": "2025-09-09T06:00:00Z",
  "cache_status": "fresh"
}
```

---

### 4. ICS Calendar Feed
**GET** `/feed/tomorrow/{grade_id}.ics`

Get tomorrow's schedule as an ICS calendar file for importing into calendar apps.

**Response:** ICS file content
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:SchoolCrawler
BEGIN:VEVENT
UID:evt_123
DTSTART:20250909T060000Z
DTEND:20250909T064500Z
SUMMARY:Mathematics
LOCATION:Room 101
DESCRIPTION:Teacher: Ms. Johnson
END:VEVENT
END:VCALENDAR
```

**Content-Type:** `text/calendar`

---

### 5. Available Dates
**GET** `/feed/tomorrow/{grade_id}/dates`

Get list of available dates for a grade.

**Response:**
```json
{
  "grade_id": "schools__5A__2025-2026",
  "available_dates": [
    "2025-09-09",
    "2025-09-10",
    "2025-09-11"
  ],
  "timezone": "Europe/Stockholm"
}
```

---

### 6. Manual Timetable Parsing
**POST** `/parse-timetable`

Parse HTML timetable content directly.

**Request Body:**
```json
{
  "html": "<table>...</table>",
  "class_name": "5A",
  "term_end": "2025-06-20T15:00:00+02:00"
}
```

**Response:**
```json
{
  "events": [
    // Event objects
  ],
  "bell_schedule": [
    // Bell schedule objects  
  ],
  "parsing_info": {
    "tables_found": 1,
    "events_extracted": 25,
    "method": "html_table_parser"
  }
}
```

---

### 7. ICS Generation
**POST** `/ics`

Convert event array to ICS calendar format.

**Request Body:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "title": "Mathematics",
      "start_time": "2025-09-09T08:00:00+02:00",
      "end_time": "2025-09-09T08:45:00+02:00",
      "location": "Room 101",
      "description": "Teacher: Ms. Johnson"
    }
  ],
  "calendar_name": "5A Schedule"
}
```

**Response:**
```json
{
  "ics_content": "BEGIN:VCALENDAR\nVERSION:2.0...",
  "event_count": 1,
  "calendar_name": "5A Schedule"
}
```

---

### 8. School Search
**GET** `/school-search`

Search for schools in the database.

**Query Parameters:**
- `q`: Search query (school name or location)
- `limit`: Maximum results (default: 10)

**Response:**
```json
{
  "count": 5,
  "confidence": 0.85,
  "source": "firestore",
  "items": [
    {
      "id": "school_123",
      "name": "Example Elementary School",
      "location": "Stockholm, Sweden",
      "website": "https://example-school.se",
      "grade_levels": ["K", "1", "2", "3", "4", "5"],
      "verified": true
    }
  ]
}
```

---

## 🔧 Development & Debug Endpoints

### 9. Available Routes
**GET** `/routes`

Get list of all available API endpoints (useful for development).

**Response:**
```json
{
  "status": "ok",
  "total_routes": 73,
  "routes": [
    {
      "path": "/health",
      "methods": ["GET"],
      "name": "health"
    },
    {
      "path": "/feed/tomorrow/{grade_id}",
      "methods": ["GET"],
      "name": "get_tomorrow_feed"
    }
  ]
}
```

---

### 10. Crawl Preview
**GET** `/crawl/preview`

Preview what data would be extracted from a URL without persisting it.

**Query Parameters:**
- `url`: URL to crawl
- `render`: Rendering mode ("auto", "always", "never")

**Response:**
```json
{
  "url": "https://example-school.com",
  "status": "success",
  "preview": {
    "events": [/* events array */],
    "metadata": {/* parsing metadata */}
  },
  "render_used": false,
  "processing_time_ms": 1250
}
```

---

## 📊 Data Types

### Event Object
```typescript
interface Event {
  id: string;
  title: string;
  start_time: string; // ISO 8601 format with timezone
  end_time: string;   // ISO 8601 format with timezone  
  location?: string;
  teacher?: string;
  subject?: string;
  grade?: string;
  type: "lesson" | "break" | "lunch" | "assembly" | "other";
  description?: string;
}
```

### Bell Schedule Object
```typescript
interface BellPeriod {
  period: number;
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  name?: string;      // e.g., "Morning Break", "Lunch"
}
```

### Grade ID Format
Grade IDs follow the pattern: `schools__{class_name}__{academic_year}`
- Example: `"schools__5A__2025-2026"`
- Example: `"schools__Grade-3__2025-2026"`

---

## 🚨 Error Handling

All endpoints return consistent error responses:

```json
{
  "detail": "Error description",
  "status_code": 400,
  "error_type": "ValidationError"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid Firebase token)
- `403` - Forbidden (blocked by robots.txt)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limited
- `500` - Internal Server Error

---

## 📱 React Native + Expo Integration

### Installation & Setup

```bash
# Install required packages
npx expo install expo-calendar expo-notifications
npm install @react-native-async-storage/async-storage
npm install date-fns  # for date handling
```

### API Client Setup

```javascript
// api/client.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://1gzup0ln8l.execute-api.eu-north-1.amazonaws.com/prod';

class SchoolCrawlerAPI {
  constructor() {
    this.baseURL = API_BASE;
  }

  async getAuthToken() {
    // Get Firebase token (implement based on your auth setup)
    return await AsyncStorage.getItem('firebase_token');
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
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

  // Health check
  async checkHealth() {
    return this.makeRequest('/health');
  }

  // Get tomorrow's schedule
  async getTomorrowSchedule(gradeId) {
    return this.makeRequest(`/feed/tomorrow/${gradeId}`);
  }

  // Parse school website
  async parseSchoolWebsite(url, render = 'auto') {
    return this.makeRequest('/summary/next-day', {
      method: 'POST',
      body: JSON.stringify({ url, render }),
    });
  }

  // Search schools
  async searchSchools(query, limit = 10) {
    return this.makeRequest(`/school-search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Get available dates
  async getAvailableDates(gradeId) {
    return this.makeRequest(`/feed/tomorrow/${gradeId}/dates`);
  }
}

export default new SchoolCrawlerAPI();
```

### React Native Components

```javascript
// components/ScheduleViewer.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { format, parseISO } from 'date-fns';
import API from '../api/client';

export default function ScheduleViewer({ gradeId }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await API.getTomorrowSchedule(gradeId);
      setSchedule(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSchedule();
  }, [gradeId]);

  const renderEvent = ({ item }) => (
    <View style={styles.eventCard}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventTime}>
        {format(parseISO(item.start_time), 'HH:mm')} - 
        {format(parseISO(item.end_time), 'HH:mm')}
      </Text>
      {item.location && <Text style={styles.eventLocation}>{item.location}</Text>}
      {item.teacher && <Text style={styles.eventTeacher}>Teacher: {item.teacher}</Text>}
    </View>
  );

  if (loading && !schedule) {
    return <Text>Loading schedule...</Text>;
  }

  return (
    <FlatList
      data={schedule?.events || []}
      renderItem={renderEvent}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        schedule && (
          <View style={styles.header}>
            <Text style={styles.date}>
              Schedule for {format(new Date(schedule.date), 'MMM d, yyyy')}
            </Text>
            <Text style={styles.lastUpdated}>
              Last updated: {format(parseISO(schedule.last_updated), 'HH:mm')}
            </Text>
          </View>
        )
      }
    />
  );
}
```

### Calendar Integration with Expo

```javascript
// utils/calendarIntegration.js
import * as Calendar from 'expo-calendar';
import { Alert } from 'react-native';
import API from '../api/client';

export class CalendarIntegration {
  static async requestPermissions() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  }

  static async addScheduleToCalendar(gradeId) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Calendar access is needed to add events');
      return;
    }

    try {
      // Get the schedule data
      const schedule = await API.getTomorrowSchedule(gradeId);
      
      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync();
      const defaultCalendar = calendars.find(cal => cal.source.name === 'Default');
      
      if (!defaultCalendar) {
        throw new Error('No default calendar found');
      }

      // Add events to calendar
      for (const event of schedule.events) {
        await Calendar.createEventAsync(defaultCalendar.id, {
          title: event.title,
          startDate: new Date(event.start_time),
          endDate: new Date(event.end_time),
          location: event.location,
          notes: event.teacher ? `Teacher: ${event.teacher}` : undefined,
        });
      }

      Alert.alert('Success', `Added ${schedule.events.length} events to calendar`);
    } catch (error) {
      Alert.alert('Error', `Failed to add to calendar: ${error.message}`);
    }
  }
}
```

### Local Storage & Caching

```javascript
// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ScheduleStorage {
  static CACHE_PREFIX = 'schedule_cache_';
  static CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  static async cacheSchedule(gradeId, schedule) {
    const cacheData = {
      data: schedule,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(
      `${this.CACHE_PREFIX}${gradeId}`,
      JSON.stringify(cacheData)
    );
  }

  static async getCachedSchedule(gradeId) {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${gradeId}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        await this.clearCache(gradeId);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async clearCache(gradeId) {
    await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${gradeId}`);
  }
}
```

### Push Notifications Setup

```javascript
// utils/notifications.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationManager {
  static async setupNotifications() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('schedule-updates', {
        name: 'Schedule Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  static async scheduleUpdateCheck(gradeId) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Schedule Check',
        body: 'Checking for schedule updates...',
        data: { gradeId },
      },
      trigger: {
        hour: 6, // Check at 6 AM
        minute: 0,
        repeats: true,
      },
    });
  }

  static async notifyScheduleUpdate(changes) {
    await Notifications.presentNotificationAsync({
      content: {
        title: 'Schedule Updated',
        body: `${changes.length} changes detected in your schedule`,
        data: { changes },
      },
    });
  }
}
```

### Error Handling & Retry Logic

```javascript
// utils/errorHandler.js
export class APIErrorHandler {
  static async withRetry(apiCall, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  static handleAPIError(error) {
    if (error.message.includes('403')) {
      return 'Access denied. The school website blocks automated access.';
    } else if (error.message.includes('404')) {
      return 'Schedule not found. Please check the grade ID.';
    } else if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return 'Something went wrong. Please try again later.';
  }
}
```

### Complete Usage Example

```javascript
// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import ScheduleViewer from './components/ScheduleViewer';
import { CalendarIntegration } from './utils/calendarIntegration';
import { NotificationManager } from './utils/notifications';
import API from './api/client';

export default function App() {
  const [gradeId, setGradeId] = useState('schools__5A__2025-2026');
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    // Initialize app
    const initialize = async () => {
      // Setup notifications
      await NotificationManager.setupNotifications();
      
      // Check API health
      try {
        const health = await API.checkHealth();
        setApiHealth(health);
      } catch (error) {
        Alert.alert('API Error', 'Could not connect to school crawler API');
      }
    };

    initialize();
  }, []);

  const handleAddToCalendar = () => {
    CalendarIntegration.addScheduleToCalendar(gradeId);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>School Schedule</Text>
      
      {apiHealth && (
        <Text style={{ color: 'green', marginBottom: 10 }}>
          API Status: {apiHealth.status} (v{apiHealth.version})
        </Text>
      )}

      <Button title="Add to Calendar" onPress={handleAddToCalendar} />
      
      <ScheduleViewer gradeId={gradeId} />
    </View>
  );
}
```

### Rate Limiting & Performance
- **API Gateway throttling:** 10,000 requests/second burst, 5,000 sustained
- **Implement exponential backoff** for failed requests
- **Cache responses** locally using AsyncStorage
- **Use pull-to-refresh** for manual updates
- **Background sync** every 30 minutes during school hours

### Offline Support Strategy
1. **Cache schedules** locally with timestamps
2. **Store ICS files** for offline calendar access
3. **Show cached data** when offline
4. **Sync when connectivity returns**
5. **Indicate offline status** in UI

---

## 🔐 Firebase Integration

### Setting up Firebase Auth
1. Initialize Firebase in your mobile app
2. Authenticate users with Firebase Auth
3. Get the ID token: `firebase.auth().currentUser.getIdToken()`
4. Include token in API requests

### Token Refresh
Firebase tokens expire after 1 hour. Implement automatic refresh:

```javascript
firebase.auth().onIdTokenChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken();
    // Update your API client with new token
  }
});
```

---

## 🌍 Supported Regions & Languages

- **Primary Region:** Europe (eu-north-1)
- **Languages:** Swedish schools primarily, but supports international formats
- **Timezone:** Europe/Stockholm (CET/CEST)
- **Date Format:** ISO 8601 with timezone

---

## 📞 Support & Development

- **API Status:** https://1gzup0ln8l.execute-api.eu-north-1.amazonaws.com/prod/health
- **Documentation:** https://1gzup0ln8l.execute-api.eu-north-1.amazonaws.com/prod/docs
- **Infrastructure:** Serverless Lambda (99.9% uptime SLA)
- **Costs:** ~$2-3/month for typical usage

For additional endpoints or custom functionality, contact the development team.

---

*Last updated: September 8, 2025*
*API Version: 1.0.0*