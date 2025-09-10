import React from "react";
import { View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useNorwegianTheme } from "../design/SeasonalThemeProvider";

interface CommunityTabIconProps {
  focused: boolean;
  color: string;
  size: number;
  activityLevel?: "low" | "medium" | "high";
  hasNewActivity?: boolean;
}

export default function CommunityTabIcon({ 
  focused, 
  color, 
  size, 
  activityLevel = "low",
  hasNewActivity = false 
}: CommunityTabIconProps) {
  const theme = useTheme();
  const norwegianTheme = useNorwegianTheme();
  const currentSeason = norwegianTheme.season;
  
  // Revolutionary circular design - 3x larger for perfect proportion
  const circularSize = size * 3.0; // Perfect balance - larger but not overwhelming
  const iconSize = size * 1.0; // Proportional icon size
  
  // Animated pulse for new community activity
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (hasNewActivity && !focused) {
      // Gentle pulse animation for new community activity
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, [hasNewActivity, focused, pulseAnimation]);
  
  // Seasonal background colors using Norwegian theme
  const getSeasonalPrimary = () => {
    if (focused) {
      return theme.colors.primary; // Use theme primary for better dark mode support
    }
    // Much more visible in dark mode when inactive
    return theme.colors.card;
  };
  
  const getSeasonalAccent = () => {
    switch (currentSeason) {
      case "winter":
        return norwegianTheme.norwegianColors.seasonal.winterWhite || "#F0F8FF";
      case "spring": 
        return norwegianTheme.norwegianColors.seasonal.springGreen || "#C8E6C9";
      case "summer":
        return norwegianTheme.norwegianColors.seasonal.summerSun || "#FFF59D";
      case "autumn":
        return norwegianTheme.norwegianColors.seasonal.autumnOrange || "#FFB74D";
      default:
        return norwegianTheme.norwegianColors.fjordBlue[300];
    }
  };
  
  const seasonalPrimary = getSeasonalPrimary();
  const seasonalAccent = getSeasonalAccent();
  
  // Activity level ring indicators
  const getActivityRings = () => {
    switch (activityLevel) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
      default:
        return 1;
    }
  };
  
  const ringCount = getActivityRings();
  
  return (
    <View style={{ 
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      width: 64, // Match standard tab width for consistent spacing
      height: 80, // Optimized height for prominence
      marginTop: -20, // Refined margin for perfect integration
      zIndex: 10,
    }}>
      {/* Activity rings for visual interest */}
      {Array.from({ length: ringCount }, (_, index) => (
        <Animated.View
          key={index}
          style={{
            position: "absolute",
            width: circularSize + (index + 1) * 6,
            height: circularSize + (index + 1) * 6,
            borderRadius: (circularSize + (index + 1) * 6) / 2,
            borderWidth: 1,
            borderColor: seasonalAccent + "15",
            opacity: 0.4 - (index * 0.12),
            transform: [{ scale: pulseAnimation }],
          }}
        />
      ))}
      
      {/* Premium circular container */}
      <Animated.View
        style={{
          width: circularSize,
          height: circularSize,
          borderRadius: circularSize / 2,
          backgroundColor: seasonalPrimary,
          borderWidth: focused ? 3 : 2.5,
          borderColor: focused ? seasonalAccent : theme.colors.primary + '40',
          // Enhanced shadow for premium feel
          elevation: focused ? 12 : 6,
          shadowColor: focused ? theme.colors.primary : '#000',
          shadowOffset: { width: 0, height: focused ? 6 : 3 },
          shadowOpacity: focused ? 0.4 : 0.2,
          shadowRadius: focused ? 12 : 6,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ 
            scale: pulseAnimation.interpolate({
              inputRange: [1, 1.1],
              outputRange: focused ? [1.08, 1.15] : [1, 1.05]
            })
          }],
        }}
      >
        {/* Community icon with refined sizing */}
        <Ionicons 
          name={focused ? "people" : "people-outline"} 
          size={iconSize * 1.2} 
          color={focused ? theme.colors.onPrimary : theme.colors.onSurface}
        />
        
        {/* Activity indicator with premium styling */}
        {hasNewActivity && (
          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: theme.colors.error,
              borderWidth: 3,
              borderColor: theme.colors.surface,
              elevation: 3,
              shadowColor: theme.colors.error,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
            }}
          />
        )}
      </Animated.View>
      
      {/* Enhanced seasonal element */}
      {focused && (
        <View
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: seasonalAccent,
            borderWidth: 2,
            borderColor: theme.colors.surface,
            alignItems: "center",
            justifyContent: "center",
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <Ionicons 
            name={
              currentSeason === "winter" ? "snow" :
              currentSeason === "spring" ? "flower" :
              currentSeason === "summer" ? "sunny" :
              "leaf"
            } 
            size={11} 
            color={theme.colors.onPrimary}
          />
        </View>
      )}
      
      {/* Premium active state indicator dot */}
      {focused && (
        <View style={{
          position: "absolute",
          bottom: -8,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.primary,
        }} />
      )}
    </View>
  );
}