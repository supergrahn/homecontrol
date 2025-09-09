import { 
  TaskSchema, 
  HouseholdSchema, 
  UserSchema, 
  ChildSchema, 
  SchoolSummarySchema,
  NotificationDataSchema,
  validateOrThrow,
  validateSafely,
  type Task,
  type Household,
  type User,
  type Child,
  type SchoolSummary,
  type NotificationData
} from "../validation/schemas";

// Validation service for Firebase data
export class ValidationService {
  /**
   * Validates task data before saving to Firebase
   */
  static validateTask(data: unknown, context = 'task'): Task {
    return validateOrThrow(TaskSchema, data, context);
  }

  /**
   * Safely validates task data
   */
  static validateTaskSafely(data: unknown) {
    return validateSafely(TaskSchema, data);
  }

  /**
   * Validates household data before saving to Firebase
   */
  static validateHousehold(data: unknown, context = 'household'): Household {
    return validateOrThrow(HouseholdSchema, data, context);
  }

  /**
   * Safely validates household data
   */
  static validateHouseholdSafely(data: unknown) {
    return validateSafely(HouseholdSchema, data);
  }

  /**
   * Validates user data before saving to Firebase
   */
  static validateUser(data: unknown, context = 'user'): User {
    return validateOrThrow(UserSchema, data, context);
  }

  /**
   * Safely validates user data
   */
  static validateUserSafely(data: unknown) {
    return validateSafely(UserSchema, data);
  }

  /**
   * Validates child data before saving to Firebase
   */
  static validateChild(data: unknown, context = 'child'): Child {
    return validateOrThrow(ChildSchema, data, context);
  }

  /**
   * Safely validates child data
   */
  static validateChildSafely(data: unknown) {
    return validateSafely(ChildSchema, data);
  }

  /**
   * Validates school summary data from Norwegian School API
   */
  static validateSchoolSummary(data: unknown, context = 'school summary'): SchoolSummary {
    return validateOrThrow(SchoolSummarySchema, data, context);
  }

  /**
   * Safely validates school summary data
   */
  static validateSchoolSummarySafely(data: unknown) {
    return validateSafely(SchoolSummarySchema, data);
  }

  /**
   * Validates notification data before sending
   */
  static validateNotificationData(data: unknown, context = 'notification'): NotificationData {
    return validateOrThrow(NotificationDataSchema, data, context);
  }

  /**
   * Safely validates notification data
   */
  static validateNotificationDataSafely(data: unknown) {
    return validateSafely(NotificationDataSchema, data);
  }

  /**
   * Validates an array of items using a specific validator
   */
  static validateArray<T>(
    items: unknown[],
    validator: (item: unknown) => T,
    context?: string
  ): T[] {
    const results: T[] = [];
    const errors: string[] = [];

    items.forEach((item, index) => {
      try {
        results.push(validator(item));
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Item ${index}: ${msg}`);
      }
    });

    if (errors.length > 0) {
      const contextMsg = context ? ` in ${context}` : '';
      throw new Error(`Array validation failed${contextMsg}: ${errors.join('; ')}`);
    }

    return results;
  }

  /**
   * Safely validates an array of items
   */
  static validateArraySafely<T>(
    items: unknown[],
    validator: (item: unknown) => { success: boolean; data?: T; error?: string }
  ): { success: boolean; data: T[]; errors: string[] } {
    const results: T[] = [];
    const errors: string[] = [];

    items.forEach((item, index) => {
      const result = validator(item);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`Item ${index}: ${result.error || 'Unknown error'}`);
      }
    });

    return {
      success: errors.length === 0,
      data: results,
      errors
    };
  }

  /**
   * Validates Firebase document data and handles Firestore-specific transformations
   */
  static validateFirebaseDocument<T>(
    schema: any,
    docData: any,
    docId: string,
    context?: string
  ): T {
    // Add the document ID if not present
    const dataWithId = {
      ...docData,
      id: docData.id || docId,
    };

    // Transform Firestore timestamps if present
    const transformedData = this.transformFirestoreData(dataWithId);
    
    return validateOrThrow(schema, transformedData, context);
  }

  /**
   * Transforms Firestore-specific data types to standard types
   */
  private static transformFirestoreData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Handle Firestore Timestamp objects
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
      return new Date(data._seconds * 1000 + data._nanoseconds / 1000000);
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.transformFirestoreData(item));
    }

    // Handle nested objects
    const transformed: any = {};
    for (const [key, value] of Object.entries(data)) {
      transformed[key] = this.transformFirestoreData(value);
    }

    return transformed;
  }

  /**
   * Sanitizes data before saving to Firebase by removing undefined values
   */
  static sanitizeForFirebase(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForFirebase(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = this.sanitizeForFirebase(value);
      }
    }

    return sanitized;
  }
}

// Validation middleware for API calls
export function withValidation<T, R>(
  validator: (data: unknown) => T,
  handler: (validatedData: T) => Promise<R>
) {
  return async (data: unknown): Promise<R> => {
    const validatedData = validator(data);
    return handler(validatedData);
  };
}

// Error classes for better error handling
export class ValidationError extends Error {
  constructor(message: string, public readonly issues: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SchoolDataValidationError extends ValidationError {
  constructor(message: string, issues: string[], public readonly schoolUrl?: string) {
    super(message, issues);
    this.name = 'SchoolDataValidationError';
  }
}

// Validation decorators for Norwegian-specific constraints
export const NorwegianValidation = {
  /**
   * Validates Norwegian school URLs
   */
  validateNorwegianSchoolUrl(url: string): boolean {
    const norwegianSchoolDomains = [
      'rogfk.no',
      'vlfk.no', 
      'innlandet.no',
      'agder.no',
      'vestfold.no',
      'oslo.kommune.no',
      // Add more Norwegian school domains as needed
    ];
    
    try {
      const urlObj = new URL(url);
      return norwegianSchoolDomains.some(domain => 
        urlObj.hostname.endsWith(domain)
      );
    } catch {
      return false;
    }
  },

  /**
   * Validates Norwegian grade format
   */
  validateNorwegianGrade(grade: string): boolean {
    const validGrades = [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'VG1', 'VG2', 'VG3'
    ];
    return validGrades.includes(grade);
  },

  /**
   * Validates Norwegian time format (HH:MM)
   */
  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  },

  /**
   * Validates quiet hours (Norwegian family scheduling)
   */
  validateQuietHours(start: string, end: string): boolean {
    return this.validateTimeFormat(start) && this.validateTimeFormat(end);
  }
};

export default ValidationService;