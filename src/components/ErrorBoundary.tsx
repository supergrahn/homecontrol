import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: any[];
}

export class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log error for monitoring
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to crash analytics in production
    if (!__DEV__) {
      // Add your crash reporting service here (e.g., Crashlytics, Sentry)
      try {
        // Example: crashlytics().recordError(error);
      } catch (reportingError) {
        console.error("Failed to report error:", reportingError);
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange && 
        resetOnPropsChange.some((prop, index) => prevProps.resetOnPropsChange?.[index] !== prop)) {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.error }]}>
          {t("errorBoundary.title") || "Something went wrong"}
        </Text>
        
        <Text style={[styles.description, { color: theme.colors.text }]}>
          {t("errorBoundary.description") || 
           "The app encountered an unexpected error. Please try again or contact support if the problem persists."}
        </Text>

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.colors.errorSurface }]}>
            <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
              Error Details (Development):
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.text }]}>
              {error.name}: {error.message}
            </Text>
            <Text style={[styles.errorStack, { color: theme.colors.textSecondary }]}>
              {error.stack?.split('\n').slice(0, 5).join('\n')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel={t("errorBoundary.retryLabel") || "Retry"}
        >
          <Text style={[styles.retryText, { color: theme.colors.onPrimary }]}>
            {t("errorBoundary.retry") || "Try Again"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorDetails: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Main ErrorBoundary component
export default function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />;
}