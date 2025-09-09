import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";

interface ChildRewardCardProps {
  child: {
    id: string;
    displayName: string;
    age?: number;
    rewardPoints?: number;
    weeklyGoal?: number;
    currentStreak?: number;
    emoji?: string;
    color?: string;
  };
  onAddReward?: (childId: string, points: number) => void;
  onViewRewards?: (childId: string) => void;
}

export default function ChildRewardCard({ 
  child, 
  onAddReward,
  onViewRewards 
}: ChildRewardCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [showAddPoints, setShowAddPoints] = React.useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const progress = child.weeklyGoal ? 
    Math.min((child.rewardPoints || 0) / child.weeklyGoal, 1) : 0;

  const getAgeAppropriateEncouragement = () => {
    const age = child.age || 10;
    if (age <= 7) {
      return t("rewards.encouragement.young") || "Great job! Keep it up! 🌟";
    } else if (age <= 12) {
      return t("rewards.encouragement.middle") || "You're doing awesome! Stay motivated! 🎯";
    } else {
      return t("rewards.encouragement.teen") || "Excellent progress! You're building great habits! 🚀";
    }
  };

  const handlePointsPress = (points: number) => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onAddReward?.(child.id, points);
    setShowAddPoints(false);
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: child.color || theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {child.emoji ? (
            <Text style={{ fontSize: 20 }}>{child.emoji}</Text>
          ) : (
            <Ionicons name="person" size={20} color={theme.colors.onPrimary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            {child.displayName}
          </Text>
          {child.age && (
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {t("age")} {child.age}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onViewRewards?.(child.id)}>
          <Ionicons 
            name="trophy" 
            size={24} 
            color="#FFD700" 
            accessibilityLabel={t("viewRewards") || "View rewards"}
          />
        </TouchableOpacity>
      </View>

      {/* Points Display */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="star" size={20} color="#FFD700" style={{ marginRight: 8 }} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#FFD700",
            }}
          >
            {child.rewardPoints || 0}
          </Text>
          <Text
            style={{
              color: theme.colors.muted,
              marginLeft: 4,
              fontSize: 14,
            }}
          >
            {t("points") || "points"}
          </Text>
        </View>

        {child.currentStreak && child.currentStreak > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="flame" size={16} color="#FF6B35" style={{ marginRight: 4 }} />
            <Text
              style={{
                color: "#FF6B35",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {child.currentStreak} {t("dayStreak") || "day streak"}
            </Text>
          </View>
        )}
      </View>

      {/* Weekly Progress */}
      {child.weeklyGoal && (
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {t("weeklyGoal") || "Weekly Goal"}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {child.rewardPoints || 0}/{child.weeklyGoal}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: theme.colors.border,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: progress >= 1 ? "#4CAF50" : theme.colors.primary,
                borderRadius: 4,
              }}
            />
          </View>
          {progress >= 1 && (
            <Text
              style={{
                color: "#4CAF50",
                fontSize: 12,
                fontWeight: "600",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              🎉 {t("goalAchieved") || "Goal achieved!"}
            </Text>
          )}
        </View>
      )}

      {/* Encouragement Message */}
      <Text
        style={{
          color: theme.colors.muted,
          fontSize: 12,
          textAlign: "center",
          marginBottom: 16,
          lineHeight: 16,
        }}
      >
        {getAgeAppropriateEncouragement()}
      </Text>

      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: theme.colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setShowAddPoints(!showAddPoints)}
          accessibilityRole="button"
          accessibilityLabel={t("addPoints") || "Add points"}
        >
          <Ionicons 
            name="add" 
            size={16} 
            color={theme.colors.onPrimary} 
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {t("addPoints") || "Add Points"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => onViewRewards?.(child.id)}
          accessibilityRole="button"
          accessibilityLabel={t("viewRewards") || "View rewards"}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {t("rewards") || "Rewards"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Points Addition */}
      {showAddPoints && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: theme.colors.background,
            borderRadius: 8,
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          {[1, 2, 5, 10].map((points) => (
            <Animated.View
              key={points}
              style={{ transform: [{ scale: scaleAnim }] }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  minWidth: 40,
                  alignItems: "center",
                }}
                onPress={() => handlePointsPress(points)}
                accessibilityRole="button"
                accessibilityLabel={`${t("add")} ${points} ${t("points")}`}
              >
                <Text
                  style={{
                    color: theme.colors.onPrimary,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  +{points}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}