import React, { useEffect, useRef } from "react";
import { View, Animated, ViewStyle } from "react-native";
import { useTheme } from "../design/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function Skeleton({ 
  width = "100%", 
  height = 20, 
  borderRadius = 4, 
  style,
  animated = true 
}: SkeletonProps) {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, animated]);

  const opacity = animated ? animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  }) : 0.3;

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.skeleton,
          borderRadius,
          opacity,
        },
        style,
      ]}
      accessible={false}
    />
  );
}

interface TaskCardSkeletonProps {
  showActions?: boolean;
  showTags?: boolean;
  showStatus?: boolean;
}

export function TaskCardSkeleton({ 
  showActions = true, 
  showTags = false, 
  showStatus = false 
}: TaskCardSkeletonProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 10,
      }}
      accessibilityLabel="Loading task"
      accessible={true}
    >
      {/* Title */}
      <Skeleton width="75%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
      
      {/* Subtitle/metadata */}
      <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />

      {/* Status badge */}
      {showStatus && (
        <View style={{ marginBottom: 12 }}>
          <Skeleton width={80} height={20} borderRadius={999} />
        </View>
      )}

      {/* Tags */}
      {showTags && (
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          <Skeleton width={60} height={20} borderRadius={999} />
          <Skeleton width={45} height={20} borderRadius={999} />
        </View>
      )}

      {/* Action buttons */}
      {showActions && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton width={100} height={36} borderRadius={8} />
          <Skeleton width={80} height={36} borderRadius={8} />
        </View>
      )}
    </View>
  );
}

interface ListSkeletonProps {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}

export function ListSkeleton({ count = 3, itemHeight = 80, spacing = 10 }: ListSkeletonProps) {
  return (
    <View accessibilityLabel={`Loading ${count} items`} accessible={true}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ marginBottom: spacing }}>
          <TaskCardSkeleton showActions={index === 0} showTags={index % 2 === 0} />
        </View>
      ))}
    </View>
  );
}

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: string;
  lineHeight?: number;
  spacing?: number;
}

export function TextSkeleton({ 
  lines = 3, 
  lastLineWidth = "60%", 
  lineHeight = 16, 
  spacing = 8 
}: TextSkeletonProps) {
  return (
    <View accessibilityLabel={`Loading ${lines} lines of text`} accessible={true}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={lineHeight}
          borderRadius={4}
          style={{ marginBottom: index === lines - 1 ? 0 : spacing }}
        />
      ))}
    </View>
  );
}

interface ProfileSkeletonProps {
  size?: number;
  showName?: boolean;
  showDetails?: boolean;
}

export function ProfileSkeleton({ size = 60, showName = true, showDetails = false }: ProfileSkeletonProps) {
  return (
    <View 
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      accessibilityLabel="Loading profile"
      accessible={true}
    >
      {/* Avatar */}
      <Skeleton width={size} height={size} borderRadius={size / 2} />
      
      {/* Name and details */}
      {(showName || showDetails) && (
        <View style={{ flex: 1 }}>
          {showName && <Skeleton width="60%" height={18} borderRadius={4} style={{ marginBottom: 6 }} />}
          {showDetails && <Skeleton width="40%" height={14} borderRadius={4} />}
        </View>
      )}
    </View>
  );
}

interface ButtonSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function ButtonSkeleton({ width = 120, height = 40, borderRadius = 8 }: ButtonSkeletonProps) {
  return (
    <Skeleton 
      width={width} 
      height={height} 
      borderRadius={borderRadius}
      accessibilityLabel="Loading button"
    />
  );
}

interface CalendarSkeletonProps {
  showHeader?: boolean;
  showEvents?: boolean;
}

export function CalendarSkeleton({ showHeader = true, showEvents = true }: CalendarSkeletonProps) {
  const theme = useTheme();

  return (
    <View 
      style={{ 
        backgroundColor: theme.colors.card, 
        borderRadius: 12, 
        padding: 16 
      }}
      accessibilityLabel="Loading calendar"
      accessible={true}
    >
      {showHeader && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Skeleton width={120} height={24} borderRadius={4} />
          <Skeleton width={80} height={32} borderRadius={8} />
        </View>
      )}

      {/* Calendar grid placeholder */}
      <View style={{ marginBottom: 16 }}>
        {Array.from({ length: 5 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            {Array.from({ length: 7 }, (_, col) => (
              <Skeleton key={col} width={32} height={32} borderRadius={16} />
            ))}
          </View>
        ))}
      </View>

      {/* Events */}
      {showEvents && (
        <View>
          <Skeleton width={100} height={20} borderRadius={4} style={{ marginBottom: 12 }} />
          {Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <Skeleton width="100%" height={48} borderRadius={8} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// School schedule specific skeleton
export function SchoolScheduleSkeleton() {
  const theme = useTheme();

  return (
    <View 
      style={{ 
        backgroundColor: theme.colors.card, 
        borderRadius: 12, 
        padding: 16,
        marginBottom: 16,
      }}
      accessibilityLabel="Loading school schedule"
      accessible={true}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton width={140} height={20} borderRadius={4} />
        <Skeleton width={60} height={16} borderRadius={4} />
      </View>

      {/* Schedule items */}
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", marginBottom: 12 }}>
          {/* Time */}
          <Skeleton width={60} height={16} borderRadius={4} style={{ marginRight: 12 }} />
          
          {/* Subject and details */}
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width="50%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default Skeleton;