// Norwegian Family AI Assistant Validation Tests
// Comprehensive testing of cultural appropriateness and intelligence effectiveness

import { norwegianFamilyAI, NorwegianFamilyInsight } from '../norwegianFamilyAI';
import { norwegianWeatherAI, NorwegianWeatherData } from '../norwegianWeatherAI';
import { norwegianDugnadAI } from '../norwegianDugnadAI';
import { Child } from '../children';
import { Task } from '../../models/task';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../tasks', () => ({
  listTasks: jest.fn(),
}));

jest.mock('../children', () => ({
  listChildren: jest.fn(),
}));

jest.mock('../norwegianCalendar', () => ({
  norwegianCalendar: {
    getChildCalendarData: jest.fn(),
    getNorwegianHolidays: jest.fn(() => [
      { date: '2025-05-17', name: 'Grunnlovsdag', description: 'Constitution Day' },
      { date: '2025-12-24', name: 'Julaften', description: 'Christmas Eve' }
    ]),
  },
}));

jest.mock('../scheduleConflicts', () => ({
  conflictDetector: {
    detectConflicts: jest.fn(() => []),
  },
}));

describe('Norwegian Family AI Assistant', () => {
  const mockHouseholdId = 'household_norwegian_test';
  
  const mockNorwegianChildren: Child[] = [
    {
      id: 'child_1',
      displayName: 'Emma',
      age: 8,
      currentGrade: 3,
      enrolledInSFO: true,
      enrolledInAKS: false,
      school: {
        id: 'school_1',
        name: 'Bjørkelangen Barneskole',
        website: 'https://bjorkelangen.no',
        syncEnabled: true
      }
    },
    {
      id: 'child_2', 
      displayName: 'Magnus',
      age: 12,
      currentGrade: 6,
      enrolledInSFO: false,
      enrolledInAKS: true,
      school: {
        id: 'school_1',
        name: 'Bjørkelangen Barneskole',
        website: 'https://bjorkelangen.no',
        syncEnabled: true
      }
    }
  ];

  const mockNorwegianTasks: Task[] = [
    {
      id: 'task_1',
      title: 'Gå på ski med familien',
      status: 'done',
      updatedAt: new Date('2025-01-15T10:00:00Z'),
      startAt: new Date('2025-01-20T10:00:00Z'),
      householdId: mockHouseholdId
    },
    {
      id: 'task_2',
      title: 'Planlegge 17. mai-feiring',
      status: 'todo',
      updatedAt: new Date('2025-04-01T10:00:00Z'),
      startAt: new Date('2025-05-10T10:00:00Z'),
      householdId: mockHouseholdId
    },
    {
      id: 'task_3',
      title: 'Dugnad i nabolaget',
      status: 'todo',
      updatedAt: new Date('2025-09-01T10:00:00Z'),
      startAt: new Date('2025-09-15T10:00:00Z'),
      householdId: mockHouseholdId
    },
    {
      id: 'task_4',
      title: 'Utendørs naturtur',
      status: 'done',
      updatedAt: new Date('2025-08-01T10:00:00Z'),
      startAt: new Date('2025-08-05T14:00:00Z'),
      householdId: mockHouseholdId
    }
  ];

  const mockNorwegianWeatherData: NorwegianWeatherData = {
    current: {
      condition: 'snow',
      temperature: -5,
      windSpeed: 10,
      humidity: 80,
      uvIndex: 1,
      visibility: 8
    },
    forecast: [
      {
        date: '2025-01-21',
        condition: 'snow',
        tempHigh: -2,
        tempLow: -8,
        precipitationChance: 80,
        windSpeed: 15
      }
    ],
    location: {
      name: 'Oslo, Norge',
      lat: 59.9139,
      lng: 10.7522,
      timezone: 'Europe/Oslo'
    },
    lastUpdated: '2025-01-20T08:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock listTasks to return Norwegian-themed tasks
    const { listTasks } = require('../tasks');
    listTasks.mockResolvedValue(mockNorwegianTasks);
    
    // Mock listChildren to return Norwegian children
    const { listChildren } = require('../children');
    listChildren.mockResolvedValue(mockNorwegianChildren);
  });

  describe('Seasonal Intelligence', () => {
    it('should generate season-appropriate recommendations for Norwegian winter', async () => {
      // Mock winter season (January)
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2025-01-20T10:00:00Z').getTime());
      
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      
      // Should include winter-appropriate suggestions
      const winterInsights = insights.filter(insight => 
        insight.norwegianContext?.includes('vinter') ||
        insight.title.toLowerCase().includes('vinter') ||
        insight.description.toLowerCase().includes('snø') ||
        insight.description.toLowerCase().includes('ski')
      );
      
      expect(winterInsights.length).toBeGreaterThan(0);
      
      // Validate cultural appropriateness
      winterInsights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThan(0.5);
        expect(insight.norwegianContext).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(insight.urgency);
        expect(['suggestion', 'optimization', 'warning', 'celebration']).toContain(insight.type);
      });
    });

    it('should prioritize 17. mai preparations in May', async () => {
      // Mock May season
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2025-05-05T10:00:00Z').getTime());
      
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      const maiInsights = insights.filter(insight => 
        insight.title.includes('17. mai') ||
        insight.description.includes('17. mai') ||
        insight.norwegianContext?.includes('Grunnlovsdag')
      );
      
      expect(maiInsights.length).toBeGreaterThan(0);
      
      maiInsights.forEach(insight => {
        expect(insight.norwegianContext).toContain('nasjonaldag');
        expect(insight.confidence).toBeGreaterThan(0.7); // High confidence for 17. mai
      });
    });
  });

  describe('School Schedule Integration', () => {
    it('should integrate school events into family insights', async () => {
      // Mock school calendar data
      const { norwegianCalendar } = require('../norwegianCalendar');
      norwegianCalendar.getChildCalendarData.mockResolvedValue({
        events: [
          {
            id: 'school_event_1',
            title: 'Foreldremøte',
            start_time: '2025-01-25T18:00:00+01:00',
            end_time: '2025-01-25T19:30:00+01:00',
            type: 'meeting'
          }
        ],
        breaks: [
          {
            name: 'Vinterferie',
            startDate: '2025-02-17',
            endDate: '2025-02-21',
            type: 'vinterferie'
          }
        ],
        sfoActivities: [
          {
            id: 'sfo_1',
            title: 'SFO - Leksetid',
            start_time: '2025-01-21T14:00:00+01:00',
            end_time: '2025-01-21T15:00:00+01:00'
          }
        ]
      });
      
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      // Should include school-related insights
      const schoolInsights = insights.filter(insight => 
        insight.title.includes('skole') ||
        insight.title.includes('SFO') ||
        insight.description.includes('skole')
      );
      
      expect(schoolInsights.length).toBeGreaterThan(0);
      
      schoolInsights.forEach(insight => {
        expect(insight.norwegianContext).toContain('skole');
        expect(insight.actionable).toBe(true);
      });
    });
  });

  describe('Weather Integration', () => {
    it('should provide weather-appropriate friluftsliv recommendations', async () => {
      const weatherRecommendations = await norwegianWeatherAI.getWeatherBasedRecommendations(
        mockNorwegianWeatherData,
        mockNorwegianChildren,
        { traditionFocus: true, safetyFirst: true }
      );
      
      expect(weatherRecommendations).toBeDefined();
      expect(weatherRecommendations.length).toBeGreaterThan(0);
      
      // Snow weather should suggest winter activities
      const snowActivities = weatherRecommendations.filter(rec => 
        rec.activity.suitableWeather.includes('snow') ||
        rec.activity.name.toLowerCase().includes('ski') ||
        rec.activity.name.toLowerCase().includes('vinter')
      );
      
      expect(snowActivities.length).toBeGreaterThan(0);
      
      snowActivities.forEach(rec => {
        expect(rec.suitabilityScore).toBeGreaterThan(0.5);
        expect(rec.activity.norwegianTradition).toBe(true);
        expect(rec.activity.culturalSignificance).toBeTruthy();
        expect(rec.reasoningNorwegian).toContain('snø');
      });
    });

    it('should adapt recommendations for family composition', async () => {
      const recommendations = await norwegianWeatherAI.getWeatherBasedRecommendations(
        mockNorwegianWeatherData,
        mockNorwegianChildren
      );
      
      recommendations.forEach(rec => {
        // Should have age groups suitable for children aged 8 and 12
        const suitableForChildren = rec.activity.ageGroups.some(ageGroup => 
          (8 >= ageGroup.min && 8 <= ageGroup.max) || 
          (12 >= ageGroup.min && 12 <= ageGroup.max)
        );
        
        expect(suitableForChildren).toBe(true);
      });
    });
  });

  describe('Dugnad Coordination', () => {
    it('should suggest seasonal dugnad opportunities', async () => {
      const location = { kommune: 'Oslo', fylke: 'Oslo' };
      
      // Mock autumn season
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2025-10-01T10:00:00Z').getTime());
      
      const dugnadRecommendations = await norwegianDugnadAI.generateDugnadRecommendations(location);
      
      expect(dugnadRecommendations).toBeDefined();
      expect(dugnadRecommendations.length).toBeGreaterThan(0);
      
      // Should include fall preparation dugnads
      const fallDugnads = dugnadRecommendations.filter(dugnad => 
        dugnad.title.toLowerCase().includes('høst') ||
        dugnad.seasonalRelevance.toLowerCase().includes('høst') ||
        dugnad.type === 'fall_preparation'
      );
      
      expect(fallDugnads.length).toBeGreaterThan(0);
      
      fallDugnads.forEach(dugnad => {
        expect(dugnad.culturalContext).toContain('dugnad');
        expect(dugnad.communityBenefit).toBeTruthy();
        expect(dugnad.confidence).toBeGreaterThan(0.5);
        expect(dugnad.organizationTips.length).toBeGreaterThan(3);
      });
    });
  });

  describe('Cultural Alignment Assessment', () => {
    it('should calculate Norwegian cultural alignment accurately', async () => {
      const comprehensiveResults = await norwegianFamilyAI.generateComprehensiveFamilyInsights(
        mockHouseholdId,
        {
          includeWeather: true,
          includeDugnad: true,
          weatherData: mockNorwegianWeatherData,
          location: { kommune: 'Oslo', fylke: 'Oslo' }
        }
      );
      
      expect(comprehensiveResults.culturalAlignment).toBeDefined();
      expect(comprehensiveResults.culturalAlignment).toBeGreaterThanOrEqual(0);
      expect(comprehensiveResults.culturalAlignment).toBeLessThanOrEqual(1);
      
      // Should identify Norwegian values
      expect(comprehensiveResults.norwegianValues).toBeDefined();
      expect(comprehensiveResults.norwegianValues.length).toBeGreaterThan(0);
      expect(comprehensiveResults.norwegianValues.length).toBeLessThanOrEqual(3);
      
      // Values should be from expected Norwegian value set
      const expectedValues = ['friluftsliv', 'dugnad', 'lagom', 'likestilling', 'trygghet', 'tradisjon'];
      comprehensiveResults.norwegianValues.forEach(value => {
        expect(expectedValues).toContain(value);
      });
    });

    it('should provide culturally appropriate suggestions', async () => {
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      insights.forEach(insight => {
        // All insights should have Norwegian cultural context
        expect(insight.norwegianContext).toBeTruthy();
        expect(typeof insight.norwegianContext).toBe('string');
        expect(insight.norwegianContext.length).toBeGreaterThan(10);
        
        // Should not contain culturally inappropriate suggestions
        const inappropriateTerms = ['american', 'british', 'foreign'];
        inappropriateTerms.forEach(term => {
          expect(insight.description.toLowerCase()).not.toContain(term);
          expect(insight.norwegianContext.toLowerCase()).not.toContain(term);
        });
        
        // Should contain Norwegian cultural references
        const norwegianTerms = ['norsk', 'familie', 'barn', 'skole', 'tradisjon'];
        const hasNorwegianContent = norwegianTerms.some(term => 
          insight.description.toLowerCase().includes(term) ||
          insight.norwegianContext.toLowerCase().includes(term)
        );
        expect(hasNorwegianContent).toBe(true);
      });
    });
  });

  describe('Family Efficiency Scoring', () => {
    it('should calculate comprehensive family efficiency with Norwegian metrics', async () => {
      const efficiencyScore = await norwegianFamilyAI.getFamilyEfficiencyScore(mockHouseholdId);
      
      expect(efficiencyScore.score).toBeGreaterThanOrEqual(0);
      expect(efficiencyScore.score).toBeLessThanOrEqual(100);
      
      // Should include Norwegian-specific breakdown
      expect(efficiencyScore.breakdown.friluftsliv).toBeDefined();
      expect(efficiencyScore.breakdown.schoolCoordination).toBeDefined();
      expect(efficiencyScore.breakdown.norwegianAlignment).toBeDefined();
      
      // Should provide cultural insights
      expect(efficiencyScore.culturalInsights).toBeDefined();
      expect(efficiencyScore.culturalInsights.length).toBeGreaterThan(0);
      
      efficiencyScore.culturalInsights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Personalized Suggestions', () => {
    it('should provide contextually appropriate suggestions', async () => {
      const context = {
        timeOfDay: '10:00',
        dayOfWeek: 6, // Saturday
        weather: 'snow',
        children: mockNorwegianChildren,
        weatherForecast: mockNorwegianWeatherData,
        schoolData: { events: [], breaks: [] }
      };
      
      const suggestions = await norwegianFamilyAI.getPersonalizedSuggestions(mockHouseholdId, context);
      
      expect(suggestions.immediate).toBeDefined();
      expect(suggestions.upcoming).toBeDefined();
      expect(suggestions.seasonal).toBeDefined();
      expect(suggestions.norwegianContext).toBeDefined();
      expect(suggestions.friluftsliv).toBeDefined();
      expect(suggestions.schoolCoordinated).toBeDefined();
      
      // Weekend snow day should suggest friluftsliv activities
      expect(suggestions.friluftsliv.length).toBeGreaterThan(0);
      expect(suggestions.friluftsliv.some(s => s.toLowerCase().includes('snø'))).toBe(true);
      
      // Should have seasonal awareness
      expect(suggestions.seasonal.length).toBeGreaterThan(0);
      
      // Should provide Norwegian cultural context
      expect(suggestions.norwegianContext.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with School Crawler Platform', () => {
    it('should leverage 18+ months of school data for optimization', async () => {
      // Mock comprehensive school data
      const { norwegianCalendar } = require('../norwegianCalendar');
      norwegianCalendar.getChildCalendarData.mockResolvedValue({
        events: Array(20).fill(null).map((_, i) => ({
          id: `event_${i}`,
          title: `Skoletime ${i + 1}`,
          start_time: `2025-01-${20 + i}T09:00:00+01:00`,
          end_time: `2025-01-${20 + i}T10:00:00+01:00`,
          type: 'lesson'
        })),
        breaks: [
          { name: 'Vinterferie', startDate: '2025-02-17', endDate: '2025-02-21', type: 'vinterferie' },
          { name: 'Påskeferie', startDate: '2025-04-14', endDate: '2025-04-22', type: 'påskeferie' }
        ],
        metadata: {
          dataPoints: 450, // 18 months of data
          lastAnalyzed: '2025-01-20T08:00:00Z'
        }
      });
      
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      // Should utilize school data for family coordination
      const schoolCoordinatedInsights = insights.filter(insight => 
        insight.description.includes('skole') ||
        insight.suggestedActions?.some(action => action.text.includes('skole'))
      );
      
      expect(schoolCoordinatedInsights.length).toBeGreaterThan(0);
      
      // Should demonstrate data-driven insights
      schoolCoordinatedInsights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThan(0.6); // High confidence from data
        expect(insight.actionable).toBe(true);
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle errors gracefully without failing', async () => {
      // Mock various failure scenarios
      const { listTasks } = require('../tasks');
      listTasks.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      // Should return empty array instead of throwing
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should complete comprehensive analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const results = await norwegianFamilyAI.generateComprehensiveFamilyInsights(
        mockHouseholdId,
        {
          includeWeather: true,
          includeDugnad: true,
          weatherData: mockNorwegianWeatherData,
          location: { kommune: 'Oslo', fylke: 'Oslo' }
        }
      );
      
      const executionTime = Date.now() - startTime;
      
      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
      expect(results.insights).toBeDefined();
      expect(results.insights.length).toBeLessThanOrEqual(12); // Reasonable limit
    });
  });

  describe('Success Metrics Validation', () => {
    it('should meet target cultural appropriateness rating (>90%)', async () => {
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      // Calculate cultural appropriateness score
      let culturallyAppropriate = 0;
      
      insights.forEach(insight => {
        const norwegianTerms = ['norsk', 'norge', 'familie', 'barn', 'skole', 'tradisjon', 'dugnad', 'friluftsliv'];
        const hasNorwegianTerms = norwegianTerms.some(term => 
          insight.norwegianContext.toLowerCase().includes(term) ||
          insight.description.toLowerCase().includes(term)
        );
        
        if (hasNorwegianTerms && insight.confidence > 0.6) {
          culturallyAppropriate++;
        }
      });
      
      const appropriatenessRating = insights.length > 0 ? culturallyAppropriate / insights.length : 0;
      
      // Should exceed 90% cultural appropriateness
      expect(appropriatenessRating).toBeGreaterThan(0.9);
    });

    it('should demonstrate >60% acceptance rate potential for recommendations', async () => {
      const insights = await norwegianFamilyAI.generateFamilyInsights(mockHouseholdId);
      
      // Evaluate acceptance potential based on actionability and cultural fit
      let highAcceptancePotential = 0;
      
      insights.forEach(insight => {
        if (insight.actionable && 
            insight.confidence > 0.7 && 
            insight.suggestedActions && 
            insight.suggestedActions.length > 0) {
          highAcceptancePotential++;
        }
      });
      
      const acceptanceRate = insights.length > 0 ? highAcceptancePotential / insights.length : 0;
      
      // Should exceed 60% acceptance potential
      expect(acceptanceRate).toBeGreaterThan(0.6);
    });

    it('should demonstrate potential for >40% family coordination improvement', async () => {
      const efficiencyScore = await norwegianFamilyAI.getFamilyEfficiencyScore(mockHouseholdId);
      
      // Analyze improvement opportunities
      const improvementOpportunities = efficiencyScore.suggestions.length + 
                                      efficiencyScore.culturalInsights.length;
      
      // Score breakdown should identify areas for improvement
      const currentEfficiency = efficiencyScore.score;
      const potentialImprovement = (100 - currentEfficiency) / 100;
      
      // Should show significant improvement potential
      expect(potentialImprovement).toBeGreaterThan(0.4);
      expect(improvementOpportunities).toBeGreaterThan(3);
    });
  });
});

// Integration test with real-world Norwegian family scenario
describe('Norwegian Family AI - Real World Scenario', () => {
  it('should handle a complete Norwegian family week scenario', async () => {
    const householdId = 'real_norwegian_family';
    
    // Mock a realistic Norwegian family situation
    const { listTasks } = require('../tasks');
    const { listChildren } = require('../children');
    const { norwegianCalendar } = require('../norwegianCalendar');
    
    listChildren.mockResolvedValue([
      { id: '1', displayName: 'Sofie', age: 9, currentGrade: 4, enrolledInSFO: true },
      { id: '2', displayName: 'Lars', age: 14, currentGrade: 8, enrolledInSFO: false }
    ]);
    
    listTasks.mockResolvedValue([
      { id: '1', title: 'Lekser med Sofie', status: 'todo', householdId },
      { id: '2', title: 'Kjøre Lars til fotballtrening', status: 'todo', householdId },
      { id: '3', title: 'Planlegge helgetur til hytta', status: 'todo', householdId },
      { id: '4', title: 'Dugnad i barnehagen', status: 'todo', householdId }
    ]);
    
    norwegianCalendar.getChildCalendarData.mockResolvedValue({
      events: [
        { id: '1', title: 'Matematikk', start_time: '2025-01-21T09:00:00+01:00' },
        { id: '2', title: 'Kroppsøving', start_time: '2025-01-21T11:00:00+01:00' }
      ],
      breaks: [],
      sfoActivities: [
        { id: '1', title: 'SFO - Utetime', start_time: '2025-01-21T15:00:00+01:00' }
      ]
    });
    
    const weatherData: NorwegianWeatherData = {
      current: { condition: 'partly_cloudy', temperature: 2, windSpeed: 5, humidity: 70, uvIndex: 2, visibility: 10 },
      forecast: [{ date: '2025-01-21', condition: 'clear', tempHigh: 5, tempLow: -2, precipitationChance: 10, windSpeed: 8 }],
      location: { name: 'Trondheim', lat: 63.4305, lng: 10.3951, timezone: 'Europe/Oslo' },
      lastUpdated: '2025-01-20T08:00:00Z'
    };
    
    // Generate comprehensive insights
    const results = await norwegianFamilyAI.generateComprehensiveFamilyInsights(householdId, {
      includeWeather: true,
      includeDugnad: true,
      weatherData,
      location: { kommune: 'Trondheim', fylke: 'Trøndelag' }
    });
    
    // Validate comprehensive results
    expect(results.insights.length).toBeGreaterThan(3);
    expect(results.weatherRecommendations.length).toBeGreaterThan(0);
    expect(results.dugnadOpportunities.length).toBeGreaterThan(0);
    expect(results.culturalAlignment).toBeGreaterThan(0.3);
    expect(results.norwegianValues.length).toBeGreaterThan(0);
    
    // Verify integration worked correctly
    const hasSchoolInsights = results.insights.some(i => i.description.includes('skole'));
    const hasWeatherInsights = results.insights.some(i => i.title.includes('Værbasert'));
    const hasDugnadInsights = results.insights.some(i => i.title.includes('Dugnad'));
    
    expect(hasSchoolInsights || hasWeatherInsights || hasDugnadInsights).toBe(true);
    
    console.log('Norwegian Family AI Test Results:');
    console.log(`- Generated ${results.insights.length} insights`);
    console.log(`- Cultural alignment: ${(results.culturalAlignment * 100).toFixed(1)}%`);
    console.log(`- Norwegian values identified: ${results.norwegianValues.join(', ')}`);
    console.log(`- Weather recommendations: ${results.weatherRecommendations.length}`);
    console.log(`- Dugnad opportunities: ${results.dugnadOpportunities.length}`);
  });
});