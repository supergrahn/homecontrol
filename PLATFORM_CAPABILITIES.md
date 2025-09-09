# Platform Capabilities Documentation

This document outlines the comprehensive capabilities of the school-crawler platform for school schedule extraction, normalization, and delivery. This information is intended for mobile app planning and development phases.

## Overview

The school-crawler platform is a serverless, multi-parser system that discovers, crawls, extracts, normalizes, and delivers school schedule information as structured data feeds and ICS calendars. It operates across multiple content formats and provides robust change detection for real-time updates.

## Core Capabilities

### 1. Content Discovery & Crawling

**Discovery Engine:**
- Automatic discovery of schedule-related links from school websites
- Sitemap parsing and feed detection
- Link classification by content type and relevance
- Recursive crawling with politeness controls (RPS limits, backoff)

**Source Types Supported:**
- School district websites
- Municipal education portals  
- Individual school websites
- Calendar systems and learning management platforms

**Crawl Features:**
- HTTP/HTTPS with custom headers and authentication
- Playwright rendering for JavaScript-heavy content
- Politeness controls with configurable RPS limits
- Retry logic with exponential backoff
- Change detection via content hashing

### 2. Multi-Format Parsing Capabilities

#### HTML Content Parsing
**HTML Table Parser (`html_tables.py`):**
- Extracts structured timetable data from HTML tables
- Handles complex table structures with merged cells
- Header detection and row normalization
- Supports multiple tables per page

**HTML Text Parser (`html_text.py`):**
- Plain text extraction from HTML content
- Cleans and normalizes text content
- Removes formatting artifacts

#### PDF Document Parsing
**PDF Parser (`pdf_parser.py`):**
- **Text Extraction:** PyMuPDF for comprehensive text extraction
- **Table Extraction:** Multi-library approach:
  - pdfplumber for primary table detection
  - Camelot fallback for complex table structures
  - Both lattice and stream parsing methods
- Handles multi-page documents with page-by-page processing

#### Google Workspace Integration
**Google Export Parser (`google_export.py`):**
- **Google Docs:** Automatic conversion to HTML/PDF export format
- **Google Sheets:** CSV/HTML export with sheet ID (gid) handling
- URL normalization for various Google sharing formats
- Supports both public and shared document access

#### Calendar Format Support
**ICS Parser (`ics.py`):**
- Native ICS calendar parsing
- Event extraction with timezone handling
- Recurrence rule (RRULE) processing
- Integration with existing calendar systems

### 3. Data Extraction & Templates

#### Event Data Model
**Core Event Structure:**
```json
{
  "id": "unique-event-identifier",
  "kind": "timetable|bell_schedule|academic_year",
  "title": "Event/Subject name",
  "class_group": "Grade/Class identifier",
  "start": "2025-01-15T08:00:00+02:00",
  "end": "2025-01-15T08:45:00+02:00",
  "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  "location": "Room/Building identifier",
  "notes": "Additional information",
  "source_url": "Original content URL",
  "timezone": "Europe/Oslo",
  "version": "Content version hash"
}
```

#### Information Templates

**Timetable Templates:**
- Daily/Weekly class schedules
- Subject-specific time slots
- Teacher assignments
- Room/location mappings
- Break periods and lunch times

**Bell Schedule Templates:**
- Period start/end times
- Break durations
- Special schedule variations (early dismissal, late start)
- Holiday and exam schedule modifications

**Academic Calendar Templates:**
- Semester/term boundaries
- Holiday periods
- Exam schedules
- Professional development days
- Parent-teacher conference dates

#### Metadata Extraction
**Quality Metrics:**
- Content freshness indicators
- Parsing confidence scores
- Data completeness assessments
- Source reliability ratings

**Change Detection:**
- Canonical content hashing
- Per-class change tracking
- Update timestamps
- Version control for schedule revisions

### 4. Search & Discovery Capabilities

#### Content-Based Search
**Searchable Information Types:**
- School district names and identifiers
- Grade levels and class groups
- Subject names and course codes
- Teacher names and assignments
- Room numbers and building locations
- Schedule types (regular, exam, special events)

**Search Endpoints:**
- `/search` - Full-text search across crawled content
- `/discover` - Link discovery from seed URLs
- `/feeds-index.json` - Available data feeds catalog

#### Automated Discovery
**School Discovery:**
- Municipality-based school enumeration
- District website crawling
- Calendar system detection
- Learning management system integration

### 5. Data Normalization & Quality

#### Normalization Pipeline
**Time Standardization:**
- Timezone-aware datetime handling (Europe/Oslo default)
- Various time format parsing (HH:MM, 24-hour, 12-hour)
- Academic calendar year detection
- Term boundary identification

**Content Standardization:**
- Subject name normalization
- Room/location standardization
- Teacher name consolidation
- Grade/class identifier mapping

#### Quality Assurance
**Data Validation:**
- Schema validation for all extracted events
- Temporal consistency checks
- Required field validation
- Cross-reference verification

**Error Handling:**
- Graceful parser fallbacks
- Partial data recovery
- Error logging and reporting
- Quality scoring for reliability

### 6. Feed Generation & Delivery

#### Output Formats

**ICS Calendar Feeds:**
- RFC 5545 compliant calendar format
- Per-class and aggregate feeds
- Recurring event support with RRULE
- Timezone information preservation

**JSON Data Feeds:**
- Structured event arrays
- Metadata inclusion
- Change detection markers
- Pagination support for large datasets

**Feed Types:**
- Real-time feeds (tomorrow's schedule)
- Historical data feeds
- Aggregate multi-class feeds
- Subject-specific feeds
- Teacher-specific schedules

#### Delivery Mechanisms
**API Endpoints:**
- RESTful API with 73+ endpoints
- Real-time feed generation
- Cached response optimization
- Rate limiting and authentication support

**Storage & Caching:**
- S3-based artifact storage
- Change-detection caching
- Feed versioning
- Automated cleanup policies

### 7. Integration Capabilities

#### Authentication Systems
**Supported Auth Methods:**
- Firebase JWT integration (recommended for mobile)
- API key authentication
- No-auth mode for public data

#### External Services
**Cloud Storage:**
- AWS S3 for artifact persistence
- LocalStack for development
- Automated backup and retention

**Monitoring & Analytics:**
- CloudWatch metrics integration
- Error tracking and alerting
- Performance monitoring
- Usage analytics

### 8. Mobile App Integration Features

#### React Native + Expo Optimizations
**Push Notifications:**
- Schedule change notifications
- New content alerts
- Error condition reporting

**Offline Capabilities:**
- Cacheable JSON feeds
- ICS calendar downloads
- Local storage optimization

**Real-time Updates:**
- WebSocket support for live updates
- Polling-based refresh strategies
- Change detection webhooks

#### Developer Tools
**Testing Endpoints:**
- `/dev/parse-pdf` - PDF parsing testing
- `/dev/parse-ics` - ICS validation
- `/admin` - Administrative interface
- Health check endpoints

### 9. Scalability & Performance

#### Serverless Architecture
**AWS Lambda Deployment:**
- Container-based Lambda functions
- API Gateway integration
- Auto-scaling capabilities
- Cost-optimized ($2-3/month typical usage)

**Processing Efficiency:**
- Concurrent parsing operations
- Intelligent rendering decisions
- Resource optimization for cold starts
- Efficient memory usage

#### Data Processing Limits
**Content Handling:**
- PDF files up to typical size limits
- HTML parsing for complex tables
- Multi-page document processing
- Bulk operations for school district crawling

### 10. Use Cases for Mobile Development

#### Primary Use Cases
1. **Student Schedule Viewing:** Real-time class schedules with room locations
2. **Parent Notifications:** Automated alerts for schedule changes
3. **Teacher Planning:** Multi-class schedule visualization
4. **Calendar Integration:** Native iOS/Android calendar synchronization
5. **Offline Access:** Cached schedules for network-limited scenarios

#### Advanced Features
1. **Multi-School Support:** District-wide schedule aggregation
2. **Personalization:** Subject filtering and custom notifications
3. **Historical Data:** Term-over-term schedule comparisons
4. **Analytics:** Usage patterns and popular content tracking

## Technical Specifications

- **Language:** Python 3.12 with asyncio
- **Frameworks:** FastAPI, Pydantic v2
- **Parsing Libraries:** BeautifulSoup, PyMuPDF, pdfplumber, Camelot
- **Cloud Platform:** AWS (Lambda, S3, DynamoDB, API Gateway)
- **Authentication:** Firebase JWT, API keys
- **Data Formats:** JSON, ICS (RFC 5545), CSV, HTML
- **Timezone Handling:** Europe/Oslo default with full timezone support
- **Testing:** Comprehensive fixture-based testing with LocalStack

## Getting Started

The platform provides extensive API documentation at `/docs` when running, with interactive testing capabilities. For mobile integration, start with the `/feeds-index.json` endpoint to discover available data sources and `/feed/tomorrow` for real-time schedule access.

All endpoints support CORS for web-based mobile development and provide structured error responses for robust error handling in mobile applications.