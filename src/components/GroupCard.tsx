import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import { useTheme } from "../design/theme";
import Card from "./Card";
import { useTranslation } from "react-i18next";

import { type Group, formatGroupType, calculateGroupEngagement, isWithinQuietHours } from "../models/Group";

export type GroupCardVariant = "default" | "compact" | "featured";

interface GroupCardProps {
  group: Group;
  variant?: GroupCardVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function GroupCard({ 
  group, 
  variant = "default", 
  onPress,
  style 
}: GroupCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const isQuietTime = isWithinQuietHours();
  const engagementScore = calculateGroupEngagement(group);
  
  const norwegianSchoolColors = {
    red: "#C41E3A", // Norwegian flag red
    blue: "#002868", // Norwegian flag blue
    white: "#FFFFFF",
  };

  const getGroupTypeIcon = () => {
    switch (group.type) {
      case "school_class": return "🏫";
      case "school_grade": return "📚";
      case "sfo_group": return "⚽";
      case "aks_group": return "🎨";
      case "parent_network": return "👥";
      case "hobby_group": return "🎯";
      case "neighborhood": return "🏘️";
      case "custom": return "⚙️";
      default: return "📋";
    }
  };

  const getSeasonalAccent = () => {
    const month = dayjs().month();
    if (month >= 2 && month <= 4) return theme.colors.accentMint; // Spring - mint
    if (month >= 5 && month <= 7) return theme.colors.accentSeafoam; // Summer - seafoam
    if (month >= 8 && month <= 10) return theme.colors.accentCoral; // Autumn - coral
    return theme.colors.focus; // Winter - gold
  };

  const renderMemberAvatars = () => {
    const maxAvatars = variant === "compact" ? 3 : 5;
    const visibleMembers = group.members.slice(0, maxAvatars);
    const remainingCount = Math.max(0, group.memberCount - maxAvatars);

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {visibleMembers.map((member, index) => {
          const isActive = member.lastActiveAt && dayjs().diff(member.lastActiveAt, "days") < 7;
          return (
            <View
              key={member.userId}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isActive ? theme.colors.success : theme.colors.muted,
                marginLeft: index > 0 ? -8 : 0,
                borderWidth: 2,
                borderColor: theme.colors.card,
                justifyContent: "center",
                alignItems: "center",
                zIndex: visibleMembers.length - index,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.colors.onPrimary }}>
                {member.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          );
        })}
        {remainingCount > 0 && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.colors.textSecondary,
              marginLeft: -8,
              borderWidth: 2,
              borderColor: theme.colors.card,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 10, color: theme.colors.onPrimary, fontWeight: "600" }}>
              +{remainingCount}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActivityIndicator = () => {
    if (!group.statistics?.lastActivity) return null;

    const daysAgo = dayjs().diff(group.statistics.lastActivity, "days");
    let color = theme.colors.success;
    let text = t("activeToday") || "Aktiv i dag";

    if (daysAgo >= 1) {
      color = theme.colors.warning;
      text = `${daysAgo} ${t("daysAgo") || "dager siden"}`;
    }
    if (daysAgo >= 7) {
      color = theme.colors.textSecondary;
      text = t("inactive") || "Inaktiv";
    }

    return (
      <View style={{
        backgroundColor: color + "20",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.radius.sm,
        alignSelf: "flex-start",
      }}>
        <Text style={{ fontSize: 10, color, fontWeight: "600" }}>
          {text}
        </Text>
      </View>
    );
  };

  const renderNorwegianFeatures = () => {
    const features = [];
    
    if (group.norwegianSettings.respectQuietHours && isQuietTime) {
      features.push(
        <View key="quiet" style={{
          backgroundColor: theme.colors.warningSurface,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: theme.colors.warning, fontWeight: "600" }}>
            🌙 {t("quietTime") || "Stilletid"}
          </Text>
        </View>
      );
    }

    if (group.norwegianSettings.includeNorwegianHolidays) {
      const isNearHoliday = checkNearNorwegianHoliday(); // Would check for upcoming holidays
      if (isNearHoliday) {
        features.push(
          <View key="holiday" style={{
            backgroundColor: norwegianSchoolColors.red + "20",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: theme.radius.sm,
          }}>
            <Text style={{ fontSize: 10, color: norwegianSchoolColors.red, fontWeight: "600" }}>
              🇳🇴 {t("holidayApproaching") || "Høytid nærmer seg"}
            </Text>
          </View>
        );
      }
    }

    if (group.norwegianSettings.democraticDecisions && group.statistics?.totalEvents) {
      features.push(
        <View key="democratic" style={{
          backgroundColor: theme.colors.primary + "20",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: "600" }}>
            🗳️ {t("democratic") || "Demokratisk"}
          </Text>
        </View>
      );
    }

    return features;
  };

  // Mock function - would check Norwegian holiday calendar
  const checkNearNorwegianHoliday = (): boolean => {
    const now = dayjs();
    const may17 = dayjs().month(4).date(17); // 17. mai
    const lucia = dayjs().month(11).date(13); // 13. desember
    
    return now.diff(may17, "days") <= 30 || now.diff(lucia, "days") <= 30;
  };

  if (variant === "compact") {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
        <Card style={{
          padding: 12,
          backgroundColor: group.norwegianSchoolContext ? norwegianSchoolColors.blue + "05" : theme.colors.card,
          borderLeftWidth: 4,
          borderLeftColor: group.norwegianSchoolContext ? norwegianSchoolColors.red : getSeasonalAccent(),
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 16, marginRight: 8 }}>
                  {getGroupTypeIcon()}
                </Text>
                <Text 
                  style={{ 
                    fontSize: 16, 
                    fontWeight: "700", 
                    color: theme.colors.text,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {group.name}
                </Text>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {group.memberCount} {t("members") || "medlemmer"}
                </Text>
                {renderActivityIndicator()}
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              {renderMemberAvatars()}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  if (variant === "featured") {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
        <Card style={{
          padding: 20,
          backgroundColor: `linear-gradient(135deg, ${getSeasonalAccent()}10 0%, ${theme.colors.card} 100%)`,
          borderWidth: 2,
          borderColor: getSeasonalAccent() + "30",
        }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>
                {getGroupTypeIcon()}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: "700", 
                  color: theme.colors.text,
                  marginBottom: 4,
                }}>
                  {group.name}
                </Text>
                <View style={{
                  backgroundColor: getSeasonalAccent() + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: "600", 
                    color: getSeasonalAccent()
                  }}>
                    {formatGroupType(group.type)}
                  </Text>
                </View>
              </View>
            </View>

            {group.description && (
              <Text style={{ 
                color: theme.colors.textSecondary, 
                fontSize: 14,
                marginBottom: 12,
              }}>
                {group.description}
              </Text>
            )}

            {/* Norwegian School Context */}
            {group.norwegianSchoolContext && (
              <View style={{ 
                backgroundColor: norwegianSchoolColors.blue + "10",
                padding: 12,
                borderRadius: theme.radius.md,
                marginBottom: 12,
                borderLeftWidth: 3,
                borderLeftColor: norwegianSchoolColors.red,
              }}>
                <Text style={{ fontWeight: "600", color: theme.colors.text, marginBottom: 4 }}>
                  🏫 {group.norwegianSchoolContext.schoolName}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {group.norwegianSchoolContext.kommune}
                  {group.norwegianSchoolContext.className && ` • Klasse ${group.norwegianSchoolContext.className}`}
                  {group.norwegianSchoolContext.grade && ` • ${group.norwegianSchoolContext.grade}. trinn`}
                </Text>
              </View>
            )}
          </View>

          {/* Stats Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
                {group.memberCount}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {t("members") || "Medlemmer"}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
                {group.statistics?.totalEvents || 0}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {t("events") || "Arrangementer"}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
                {engagementScore}%
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {t("engagement") || "Engasjement"}
              </Text>
            </View>
          </View>

          {/* Norwegian Features */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {renderNorwegianFeatures()}
          </View>

          {/* Members and Activity */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {renderMemberAvatars()}
            {renderActivityIndicator()}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // Default variant
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
      <Card style={{
        backgroundColor: group.norwegianSchoolContext ? norwegianSchoolColors.blue + "03" : theme.colors.card,
        borderLeftWidth: 3,
        borderLeftColor: group.norwegianSchoolContext ? norwegianSchoolColors.red : getSeasonalAccent(),
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>
            {getGroupTypeIcon()}
          </Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: "700", 
                color: theme.colors.text,
                flex: 1,
              }}>
                {group.name}
              </Text>
              <View style={{
                backgroundColor: theme.colors.primary + "20",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: theme.radius.sm,
              }}>
                <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: "600" }}>
                  {formatGroupType(group.type)}
                </Text>
              </View>
            </View>
            
            {group.description && (
              <Text style={{ 
                color: theme.colors.textSecondary, 
                fontSize: 14,
                marginBottom: 8,
              }}>
                {group.description}
              </Text>
            )}

            {/* Norwegian School Context */}
            {group.norwegianSchoolContext && (
              <View style={{ 
                backgroundColor: theme.colors.background,
                padding: 8,
                borderRadius: theme.radius.sm,
                marginBottom: 8,
              }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text }}>
                  🏫 {group.norwegianSchoolContext.schoolName}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                  {group.norwegianSchoolContext.kommune}
                  {group.norwegianSchoolContext.className && ` • ${group.norwegianSchoolContext.className}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 }}>
                {group.memberCount}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 }}>
                {group.statistics?.totalEvents || 0}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="trending-up-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 }}>
                {engagementScore}%
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            {renderMemberAvatars()}
            <View style={{ marginTop: 4 }}>
              {renderActivityIndicator()}
            </View>
          </View>
        </View>

        {/* Norwegian Features */}
        {renderNorwegianFeatures().length > 0 && (
          <View style={{ 
            flexDirection: "row", 
            flexWrap: "wrap", 
            gap: 6, 
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            {renderNorwegianFeatures()}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}