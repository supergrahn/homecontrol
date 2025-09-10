/**
 * Norwegian Utility Functions
 * 
 * Comprehensive utility functions for Norwegian cultural features including
 * time-based greetings, date formatting, seasonal activities, holidays,
 * and cultural context awareness.
 */

import { NorwegianSeason, norwegianTimePeriods } from '../design/norwegianTokens';

// Norwegian months and days for proper localization
const norwegianMonths = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember'
];

const norwegianDays = [
  'søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'
];

const norwegianDaysShort = [
  'søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'
];

// Norwegian holidays and important dates
interface NorwegianHoliday {
  name: string;
  date: string; // MM-DD format or 'easter+X' for easter-relative
  type: 'national' | 'cultural' | 'school' | 'regional';
  culturalNote?: string;
  schoolImpact?: 'closed' | 'early' | 'special';
}

const norwegianHolidays: NorwegianHoliday[] = [
  {
    name: 'Nyttårsdag',
    date: '01-01',
    type: 'national',
    culturalNote: 'Første dag i året - ofte stille og rolig',
    schoolImpact: 'closed'
  },
  {
    name: 'Skjærtorsdag',
    date: 'easter-3',
    type: 'national',
    culturalNote: 'Påskeuken starter - mange drar til hytta',
    schoolImpact: 'closed'
  },
  {
    name: 'Langfredag',
    date: 'easter-2',
    type: 'national',
    culturalNote: 'Påskeferie - stille dag',
    schoolImpact: 'closed'
  },
  {
    name: 'Påskedag',
    date: 'easter+0',
    type: 'national',
    culturalNote: 'Påskefeiring med familie og påskeegg',
    schoolImpact: 'closed'
  },
  {
    name: 'Andre påskedag',
    date: 'easter+1',
    type: 'national',
    culturalNote: 'Fortsatt påskeferie - ofte på hytta',
    schoolImpact: 'closed'
  },
  {
    name: 'Arbeidernes internasjonale dag',
    date: '05-01',
    type: 'national',
    culturalNote: '1. mai - tog og demonstrasjoner',
    schoolImpact: 'closed'
  },
  {
    name: 'Grunnlovsdagen',
    date: '05-17',
    type: 'national',
    culturalNote: 'Norges nasjonaldag - barnetog og feiring',
    schoolImpact: 'special'
  },
  {
    name: 'Kristi himmelfartsdag',
    date: 'easter+39',
    type: 'national',
    culturalNote: 'Lang helg - mange tar fri fredag også',
    schoolImpact: 'closed'
  },
  {
    name: 'Pinsedag',
    date: 'easter+49',
    type: 'national',
    culturalNote: 'Pinse - start på sommerfølelsen',
    schoolImpact: 'closed'
  },
  {
    name: 'Andre pinsedag',
    date: 'easter+50',
    type: 'national',
    culturalNote: 'Pinseferie - fortsatt lang helg',
    schoolImpact: 'closed'
  },
  {
    name: 'Juledag',
    date: '12-25',
    type: 'national',
    culturalNote: 'Julefeiring med familie og tradisjon',
    schoolImpact: 'closed'
  },
  {
    name: 'Andre juledag',
    date: '12-26',
    type: 'national',
    culturalNote: 'Fortsatt juleferie - ofte besøk hos familie',
    schoolImpact: 'closed'
  },
  // School-specific dates
  {
    name: 'Sommerferie start',
    date: '06-20', // Approximate - varies by municipality
    type: 'school',
    culturalNote: 'Skoleåret er over - lang sommerferie starter',
    schoolImpact: 'closed'
  },
  {
    name: 'Skolestart',
    date: '08-20', // Approximate - varies by municipality
    type: 'school',
    culturalNote: 'Tilbake til skolen etter sommerferie',
    schoolImpact: 'special'
  },
];

// Time-based greeting functions
export const getTimeBasedGreeting = (date: Date = new Date()): string => {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 10) {
    const morningGreetings = ['God morgen!', 'Morgen!', 'Ha en fin dag!'];
    return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
  }
  
  if (hour >= 10 && hour < 17) {
    const dayGreetings = ['Hei!', 'God dag!', 'Hyggelig å se deg!', 'Håper du har en fin dag!'];
    return dayGreetings[Math.floor(Math.random() * dayGreetings.length)];
  }
  
  if (hour >= 17 && hour < 20) {
    const eveningGreetings = ['God kveld!', 'Kveld!', 'Ha en fin kveld!', 'Koselig kveld!'];
    return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
  }
  
  const nightGreetings = ['God natt!', 'Sov godt!', 'Ha en rolig kveld!'];
  return nightGreetings[Math.floor(Math.random() * nightGreetings.length)];
};

// Norwegian date formatting
export const formatNorwegianDate = (
  date: Date, 
  format: 'short' | 'medium' | 'long' | 'weekday' = 'medium'
): string => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const weekday = date.getDay();
  
  switch (format) {
    case 'short':
      return `${day}. ${norwegianMonths[month].slice(0, 3)}`;
    
    case 'medium':
      return `${day}. ${norwegianMonths[month]} ${year}`;
    
    case 'long':
      return `${norwegianDays[weekday]} ${day}. ${norwegianMonths[month]} ${year}`;
    
    case 'weekday':
      return `${norwegianDays[weekday]} ${day}. ${norwegianMonths[month]}`;
    
    default:
      return `${day}. ${norwegianMonths[month]} ${year}`;
  }
};

// Norwegian time formatting (24-hour format as is standard in Norway)
export const formatNorwegianTime = (
  date: Date, 
  includeSeconds: boolean = false
): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  if (includeSeconds) {
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  return `${hours}:${minutes}`;
};

// Check if current time is within quiet hours (20:00-07:00)
export const isQuietHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= norwegianTimePeriods.quietHours.start || hour < norwegianTimePeriods.quietHours.end;
};

// Check if current time is within work hours
export const isWorkHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  return hour >= norwegianTimePeriods.workHours.start && hour < norwegianTimePeriods.workHours.end;
};

// Check if current time is within school hours
export const isSchoolHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  return hour >= norwegianTimePeriods.schoolHours.start && hour < norwegianTimePeriods.schoolHours.end;
};

// Check if current time is within SFO hours
export const isSFOHours = (date: Date = new Date()): boolean => {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  return hour >= norwegianTimePeriods.sfoHours.start && hour < norwegianTimePeriods.sfoHours.end;
};

// Get seasonal activities for Norwegian context
export const getSeasonalActivities = (season?: NorwegianSeason, date: Date = new Date()): string[] => {
  const currentSeason = season || getCurrentSeason(date);
  
  const activities = {
    winter: [
      'Skitur i marka',
      'Kos med varm kakao',
      'Bygge snømann',
      'Hjemmelaget gløgg',
      'Vinterferie på hytta',
      'Skøyter på isen',
      'Hundekjøring',
      'Nordlystur',
    ],
    spring: [
      'Tur til påskefjellet',
      'Påskeegg i hagen',
      '17. mai forberedelser',
      'Rydde på hytta',
      'Planlegge sommerferie',
      'Første grilling',
      'Sykkeltur',
      'Russ-feiring',
    ],
    summer: [
      'Grilling på hytta',
      'Bading i sjøen',
      'Midsommerfeiring',
      'Bærtur i skogen',
      'Campingtur',
      'Fisking',
      'Fottur i fjellet',
      'Festival og konsert',
    ],
    autumn: [
      'Sopptur i skogen',
      'Høstmarka på sitt beste',
      'Forberede jul',
      'Kosekveld hjemme',
      'Skolestart forberedelser',
      'Eplemost og eplekake',
      'Jakt og fiske',
      'Husarbeid før vinteren',
    ],
  };
  
  return activities[currentSeason];
};

// Get current season
export const getCurrentSeason = (date: Date = new Date()): NorwegianSeason => {
  const month = date.getMonth() + 1;
  
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
};

// Calculate Easter date (complex algorithm for Norwegian Easter)
const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

// Check for Norwegian holidays
export const getNorwegianHoliday = (date: Date): NorwegianHoliday | null => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateString = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Check fixed holidays
  const fixedHoliday = norwegianHolidays.find(holiday => holiday.date === dateString);
  if (fixedHoliday) return fixedHoliday;
  
  // Check Easter-relative holidays
  const easter = calculateEaster(year);
  for (const holiday of norwegianHolidays) {
    if (holiday.date.startsWith('easter')) {
      const offset = parseInt(holiday.date.replace('easter', ''));
      const holidayDate = new Date(easter);
      holidayDate.setDate(easter.getDate() + offset);
      
      if (holidayDate.getMonth() === date.getMonth() && 
          holidayDate.getDate() === date.getDate()) {
        return holiday;
      }
    }
  }
  
  return null;
};

// Check if it's a Norwegian holiday
export const isNorwegianHoliday = (date: Date = new Date()): boolean => {
  return getNorwegianHoliday(date) !== null;
};

// Get cultural context for a specific time/date
export const getCulturalContext = (date: Date = new Date()) => {
  const holiday = getNorwegianHoliday(date);
  const season = getCurrentSeason(date);
  const isQuiet = isQuietHours(date);
  const isWork = isWorkHours(date);
  const isSchool = isSchoolHours(date);
  const isSFO = isSFOHours(date);
  
  return {
    holiday,
    season,
    timeContext: {
      isQuietHours: isQuiet,
      isWorkHours: isWork,
      isSchoolHours: isSchool,
      isSFOHours: isSFO,
    },
    greetings: {
      timeBasedGreeting: getTimeBasedGreeting(date),
      seasonalActivities: getSeasonalActivities(season, date),
    },
    culturalNotes: {
      shouldRespectQuietHours: isQuiet,
      schoolContext: isSchool || isSFO,
      holidayContext: holiday?.culturalNote,
    },
  };
};

// Format duration in Norwegian
export const formatNorwegianDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'time' : 'timer'}`;
  }
  
  return `${hours} ${hours === 1 ? 'time' : 'timer'} ${remainingMinutes} min`;
};

// Check if date is within Norwegian school calendar
export const isSchoolDay = (date: Date = new Date()): boolean => {
  const day = date.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Holiday check
  if (isNorwegianHoliday(date)) return false;
  
  // Summer break check (approximate)
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  
  // Summer break: mid-June to mid-August
  if (month === 6 && dayOfMonth >= 20) return false;
  if (month === 7) return false;
  if (month === 8 && dayOfMonth <= 15) return false;
  
  // Winter break: December 20 - January 6 (approximate)
  if (month === 12 && dayOfMonth >= 20) return false;
  if (month === 1 && dayOfMonth <= 6) return false;
  
  return true;
};

// Get appropriate notification timing respect for Norwegian customs
export const getAppropriateNotificationTime = (date: Date = new Date()): {
  canNotify: boolean;
  reason?: string;
  nextAppropriateTime?: Date;
} => {
  const cultural = getCulturalContext(date);
  
  // Respect quiet hours
  if (cultural.timeContext.isQuietHours) {
    const nextMorning = new Date(date);
    nextMorning.setHours(7, 0, 0, 0);
    if (nextMorning <= date) {
      nextMorning.setDate(nextMorning.getDate() + 1);
    }
    
    return {
      canNotify: false,
      reason: 'Respekterer stille timer (20:00-07:00)',
      nextAppropriateTime: nextMorning,
    };
  }
  
  // Check for holidays
  if (cultural.holiday) {
    return {
      canNotify: false,
      reason: `${cultural.holiday.name} - respekterer høytiden`,
      nextAppropriateTime: new Date(date.getTime() + 24 * 60 * 60 * 1000), // Next day
    };
  }
  
  return {
    canNotify: true,
  };
};

// Norwegian politeness patterns for invitations
export const getNorwegianInvitationEtiquette = (context: {
  isFamily: boolean;
  isSchool: boolean;
  urgency: 'low' | 'medium' | 'high';
  timeUntilEvent: number; // hours
}) => {
  const basePatterns = {
    family: {
      accept: ['Takk for invitasjonen!', 'Det hadde vært hyggelig!', 'Vi kommer gjerne!'],
      decline: ['Tusen takk, men vi kan dessverre ikke', 'Beklager, vi har andre planer', 'Det blir ikke mulig denne gangen'],
      maybeAccept: ['Vi må sjekke kalenderen først', 'Kan vi komme tilbake til deg?', 'Vi prøver å ordne det'],
    },
    school: {
      accept: ['Takk for invitasjonen', 'Vi takker ja til invitasjonen', 'Det passer oss bra'],
      decline: ['Vi kan dessverre ikke delta', 'Beklager, vi har andre forpliktelser', 'Det blir ikke mulig for oss'],
      maybeAccept: ['Vi må sjekke først', 'Kan vi bekrefte senere?', 'Vi kommer tilbake med svar'],
    },
    formal: {
      accept: ['Takk for invitasjonen', 'Vi bekrefter vår deltakelse', 'Vi gleder oss til arrangementet'],
      decline: ['Vi kan dessverre ikke delta', 'Beklager at vi ikke kan komme', 'Vi har andre forpliktelser'],
      maybeAccept: ['Vi må sjekke kalenderen', 'Vi kommer tilbake med bekreftelse', 'Vi prøver å delta'],
    },
  };
  
  const contextType = context.isFamily ? 'family' : context.isSchool ? 'school' : 'formal';
  const patterns = basePatterns[contextType];
  
  const urgencyNote = context.urgency === 'high' 
    ? 'Vennligst gi oss beskjed så snart som mulig' 
    : context.timeUntilEvent < 24 
    ? 'Kort varsel, men vi prøver å svare raskt'
    : '';
  
  return {
    patterns,
    urgencyNote,
    culturalNote: context.isFamily 
      ? 'Norske familier setter pris på åpen og direkte kommunikasjon'
      : 'Vær høflig men direkte i dine svar',
  };
};