import { useTranslation } from "react-i18next";
import { appEvents } from "../events";

// Error types for Norwegian family app
export enum ErrorType {
  NETWORK = "network",
  AUTHENTICATION = "authentication", 
  VALIDATION = "validation",
  PERMISSION = "permission",
  SCHOOL_API = "school_api",
  FIREBASE = "firebase",
  NOTIFICATION = "notification",
  HOUSEHOLD = "household",
  TASK = "task",
  UNKNOWN = "unknown"
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  householdId?: string;
  retry?: () => Promise<void>;
}

// Norwegian-specific error messages
const norwegianErrorMessages: Record<ErrorType, { title: string; message: string; actionHint?: string }> = {
  [ErrorType.NETWORK]: {
    title: "Nettverksproblemer",
    message: "Kan ikke koble til internett. Sjekk tilkoblingen din og prøv igjen.",
    actionHint: "Trykk for å prøve igjen"
  },
  [ErrorType.AUTHENTICATION]: {
    title: "Innloggingsproblemer", 
    message: "Kunne ikke logge inn. Sjekk e-post og passord.",
    actionHint: "Gå til innstillinger for å logge inn på nytt"
  },
  [ErrorType.VALIDATION]: {
    title: "Ugyldig data",
    message: "Noen av dataene er ikke gyldige. Vennligst sjekk og prøv igjen."
  },
  [ErrorType.PERMISSION]: {
    title: "Ikke tilgang",
    message: "Du har ikke tillatelse til å utføre denne handlingen."
  },
  [ErrorType.SCHOOL_API]: {
    title: "Skoledata utilgjengelig", 
    message: "Kunne ikke hente skoledata. Skolens nettside kan være utilgjengelig.",
    actionHint: "Vi vil prøve igjen automatisk"
  },
  [ErrorType.FIREBASE]: {
    title: "Synkroniseringsfeil",
    message: "Kunne ikke synkronisere data. Endringer lagres lokalt til tilkobling er gjenopprettet."
  },
  [ErrorType.NOTIFICATION]: {
    title: "Varslingsfeiler",
    message: "Kunne ikke sende varsling. Sjekk varslingsinnstillinger."
  },
  [ErrorType.HOUSEHOLD]: {
    title: "Husholdningsfeil",
    message: "Problem med husholdningsdata. Prøv å oppdatere appen."
  },
  [ErrorType.TASK]: {
    title: "Oppgavefeil", 
    message: "Kunne ikke behandle oppgaven. Prøv igjen om litt."
  },
  [ErrorType.UNKNOWN]: {
    title: "Ukjent feil",
    message: "Noe uventet skjedde. Appen vil forsøke å fortsette."
  }
};

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: AppError[] = [];
  private maxErrors = 100; // Keep last 100 errors for debugging

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with proper logging, user notification, and retry logic
   */
  handleError(error: Partial<AppError>): void {
    const appError: AppError = {
      type: error.type || ErrorType.UNKNOWN,
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message || "An unknown error occurred",
      details: error.details,
      code: error.code,
      context: error.context,
      timestamp: new Date(),
      userId: error.userId,
      householdId: error.householdId,
      retry: error.retry
    };

    // Store error for debugging
    this.errors.unshift(appError);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Log error for debugging
    this.logError(appError);

    // Show user notification if severity warrants it
    if (appError.severity !== ErrorSeverity.LOW) {
      this.showUserNotification(appError);
    }

    // Report critical errors in production
    if (appError.severity === ErrorSeverity.CRITICAL && !__DEV__) {
      this.reportToCrashAnalytics(appError);
    }
  }

  /**
   * Handle Firebase-specific errors with proper Norwegian context
   */
  handleFirebaseError(error: any, context?: Record<string, any>): void {
    let errorType = ErrorType.FIREBASE;
    let severity = ErrorSeverity.MEDIUM;
    let message = "Firebase error occurred";

    // Parse Firebase error codes
    if (error.code) {
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorType = ErrorType.AUTHENTICATION;
          message = "Authentication failed";
          break;
        case "permission-denied":
          errorType = ErrorType.PERMISSION;
          message = "Permission denied";
          break;
        case "unavailable":
          errorType = ErrorType.NETWORK;
          message = "Firebase service unavailable";
          severity = ErrorSeverity.HIGH;
          break;
        case "failed-precondition":
          errorType = ErrorType.VALIDATION;
          message = "Data validation failed";
          break;
      }
    }

    this.handleError({
      type: errorType,
      severity,
      message,
      details: error.message,
      code: error.code,
      context
    });
  }

  /**
   * Handle Norwegian School API errors
   */
  handleSchoolAPIError(error: any, schoolUrl?: string): void {
    this.handleError({
      type: ErrorType.SCHOOL_API,
      severity: ErrorSeverity.MEDIUM,
      message: "Norwegian school data unavailable",
      details: error.message,
      context: { schoolUrl },
      retry: async () => {
        // Implement retry logic for school API
        console.log("Retrying school API call...");
      }
    });
  }

  /**
   * Handle task-related errors with Norwegian context
   */
  handleTaskError(error: any, taskId?: string, householdId?: string): void {
    let severity = ErrorSeverity.MEDIUM;
    
    // Escalate severity for critical task operations
    if (error.code === "task-blocked" || error.code === "dependency-cycle") {
      severity = ErrorSeverity.HIGH;
    }

    this.handleError({
      type: ErrorType.TASK,
      severity,
      message: "Task operation failed",
      details: error.message,
      code: error.code,
      context: { taskId },
      householdId
    });
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count = 10): AppError[] {
    return this.errors.slice(0, count);
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Check if error should show retry option
   */
  isRetryable(error: AppError): boolean {
    return error.type === ErrorType.NETWORK || 
           error.type === ErrorType.SCHOOL_API || 
           (error.type === ErrorType.FIREBASE && error.code === "unavailable");
  }

  private logError(error: AppError): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL ? "error" : 
                    error.severity === ErrorSeverity.HIGH ? "error" :
                    error.severity === ErrorSeverity.MEDIUM ? "warn" : "info";
    
    console[logLevel](`[${error.type.toUpperCase()}] ${error.message}`, {
      details: error.details,
      code: error.code,
      context: error.context,
      timestamp: error.timestamp.toISOString()
    });
  }

  private showUserNotification(error: AppError): void {
    const norwegianError = norwegianErrorMessages[error.type];
    
    // Emit toast event with Norwegian message
    appEvents.emit("toast", {
      message: norwegianError.title,
      type: error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL 
            ? "error" : "info",
      key: `error.${error.type}`
    });

    // Show detailed error for high severity
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      appEvents.emit("error-modal", {
        title: norwegianError.title,
        message: norwegianError.message,
        actionHint: norwegianError.actionHint,
        retry: this.isRetryable(error) ? error.retry : undefined
      });
    }
  }

  private reportToCrashAnalytics(error: AppError): void {
    try {
      // Add your crash reporting service here (e.g., Crashlytics, Sentry)
      // Example: crashlytics().log(JSON.stringify(error));
      console.error("Critical error reported:", error);
    } catch (reportingError) {
      console.error("Failed to report critical error:", reportingError);
    }
  }
}

// Convenience functions for common error patterns
export const errorHandler = ErrorHandler.getInstance();

export function handleNetworkError(error: any, retry?: () => Promise<void>): void {
  errorHandler.handleError({
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.HIGH,
    message: "Network connection failed",
    details: error.message,
    retry
  });
}

export function handleValidationError(error: any, context?: Record<string, any>): void {
  errorHandler.handleError({
    type: ErrorType.VALIDATION, 
    severity: ErrorSeverity.MEDIUM,
    message: "Data validation failed",
    details: error.message,
    context
  });
}

export function handlePermissionError(context?: Record<string, any>): void {
  errorHandler.handleError({
    type: ErrorType.PERMISSION,
    severity: ErrorSeverity.HIGH, 
    message: "Insufficient permissions",
    context
  });
}

export function handleCriticalError(error: any, context?: Record<string, any>): void {
  errorHandler.handleError({
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.CRITICAL,
    message: "Critical system error",
    details: error.message,
    context
  });
}

// React hook for error handling in components
export function useErrorHandler() {
  const { t } = useTranslation();

  return {
    handleError: (error: Partial<AppError>) => errorHandler.handleError(error),
    handleFirebaseError: (error: any, context?: Record<string, any>) => 
      errorHandler.handleFirebaseError(error, context),
    handleSchoolAPIError: (error: any, schoolUrl?: string) => 
      errorHandler.handleSchoolAPIError(error, schoolUrl),
    handleTaskError: (error: any, taskId?: string, householdId?: string) =>
      errorHandler.handleTaskError(error, taskId, householdId),
    getRecentErrors: () => errorHandler.getRecentErrors(),
    clearErrors: () => errorHandler.clearErrors()
  };
}

// Error boundary helper
export function createErrorBoundaryHandler(context?: string) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    errorHandler.handleError({
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.CRITICAL,
      message: "React error boundary triggered",
      details: error.message,
      context: { 
        componentStack: errorInfo.componentStack,
        context
      }
    });
  };
}

export default ErrorHandler;