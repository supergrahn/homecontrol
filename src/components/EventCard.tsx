import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

import { useTheme } from "../design/theme";
import Card from "./Card";
import { useTranslation } from "react-i18next";

import { 
  type Event, 
  formatEventType, 
  getEventTypeIcon, 
  calculateEventCapacity,
  shouldCancelEventDueToWeather,
  isEventInNorwegianQuietHours 
} from "../models/Event";

dayjs.extend(isBetween);

export type EventCardVariant = "timeline" | "grid" | "detailed";

interface EventCardProps {
  event: Event;
  variant?: EventCardVariant;
  currentWeather?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function EventCard({ 
  event, 
  variant = "timeline", 
  currentWeather = "Unknown",
  onPress,
  style 
}: EventCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const capacity = calculateEventCapacity(event);
  const isQuietTime = isEventInNorwegianQuietHours(event.startTime, event.endTime);
  const isWeatherRisk = event.weatherBackup?.required && shouldCancelEventDueToWeather(event, currentWeather);
  const currentUserId = "current-user-id"; // Would come from auth context
  const userAttendee = event.attendees.find(a => a.userId === currentUserId);
  
  const getNorwegianSeasonalColor = () => {
    const month = dayjs(event.startTime).month();
    if (month >= 2 && month <= 4) return theme.colors.accentMint; // Spring
    if (month >= 5 && month <= 7) return theme.colors.accentSeafoam; // Summer
    if (month >= 8 && month <= 10) return theme.colors.accentCoral; // Autumn
    return theme.colors.focus; // Winter
  };

  const getWeatherIcon = (weather: string) => {
    const w = weather.toLowerCase();
    if (w.includes("rain") || w.includes("regn")) return "🌧️";
    if (w.includes("snow") || w.includes("snø")) return "❄️";
    if (w.includes("sun") || w.includes("sol")) return "☀️";
    if (w.includes("cloud") || w.includes("sky")) return "☁️";
    if (w.includes("partly")) return "⛅";
    return "🌤️";
  };

  const getEventStatus = () => {
    const now = dayjs();
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);
    
    if (now.isAfter(end)) return "completed";
    if (now.isBetween(start, end)) return "ongoing";
    if (now.isAfter(start.subtract(1, "hour"))) return "starting_soon";
    return "upcoming";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return theme.colors.textSecondary;
      case "ongoing": return theme.colors.success;
      case "starting_soon": return theme.colors.warning;
      default: return theme.colors.primary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return t("eventCompleted") || "Avsluttet";
      case "ongoing": return t("eventOngoing") || "Pågår nå";
      case "starting_soon": return t("eventStartingSoon") || "Starter snart";
      default: return "";
    }
  };

  const renderRSVPStatus = () => {
    if (!userAttendee) return null;
    
    const statusColors = {
      yes: theme.colors.success,
      no: theme.colors.error,
      maybe: theme.colors.warning,
      waitlist: theme.colors.textSecondary,
      pending: theme.colors.textSecondary,
    };

    const statusIcons = {
      yes: "checkmark-circle",
      no: "close-circle", 
      maybe: "help-circle",
      waitlist: "time",
      pending: "ellipse",
    };

    const statusTexts = {
      yes: t("attending") || "Kommer",
      no: t("notAttending") || "Kommer ikke", 
      maybe: t("maybe") || "Kanskje",
      waitlist: t("waitlisted") || "Venteliste",
      pending: t("pending") || "Venter svar",
    };

    return (
      <View style={{
        backgroundColor: statusColors[userAttendee.rsvpStatus] + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        flexDirection: "row",
        alignItems: "center",
      }}>
        <Ionicons 
          name={statusIcons[userAttendee.rsvpStatus] as any} 
          size={12} 
          color={statusColors[userAttendee.rsvpStatus]}
          style={{ marginRight: 4 }}
        />
        <Text style={{ 
          fontSize: 11, 
          color: statusColors[userAttendee.rsvpStatus], 
          fontWeight: "600" 
        }}>
          {statusTexts[userAttendee.rsvpStatus]}
        </Text>
      </View>
    );
  };

  const renderNorwegianFeatures = () => {
    const features = [];

    if (event.norwegianCulturalContext?.traditionalElement) {
      features.push(
        <View key="traditional" style={{
          backgroundColor: "#C41E3A" + "20", // Norwegian flag red
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: "#C41E3A", fontWeight: "600" }}>
            🇳🇴 {t("tradition") || "Tradisjon"}
          </Text>
        </View>
      );
    }

    if (event.norwegianCulturalContext?.giftGiving?.expected) {
      features.push(
        <View key="gifts" style={{
          backgroundColor: theme.colors.accentCoral + "20",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: theme.colors.accentCoral, fontWeight: "600" }}>
            🎁 {t("giftGiving") || "Gaver"}
          </Text>
        </View>
      );
    }

    if (event.coordination.carpoolingEnabled) {
      features.push(
        <View key="carpool" style={{
          backgroundColor: theme.colors.success + "20",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: theme.colors.success, fontWeight: "600" }}>
            🚗 {t("carpooling") || "Samkjøring"}
          </Text>
        </View>
      );
    }

    if (event.coordination.allowVolunteerSignup && event.coordination.volunteerTasks) {
      features.push(
        <View key="volunteer" style={{
          backgroundColor: theme.colors.primary + "20",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: theme.radius.sm,
        }}>
          <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: "600" }}>
            🙋‍♀️ {t("volunteering") || "Dugnad"}
          </Text>
        </View>
      );
    }

    return features;
  };

  const renderWeatherInfo = () => {
    if (!event.weatherBackup?.required) return null;

    return (
      <View style={{
        backgroundColor: isWeatherRisk ? theme.colors.errorSurface : theme.colors.warningSurface,
        borderColor: isWeatherRisk ? theme.colors.errorBorder : theme.colors.warningBorder,
        borderWidth: 1,
        padding: 8,
        borderRadius: theme.radius.sm,
        marginTop: 8,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ marginRight: 8 }}>
            {getWeatherIcon(currentWeather)}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            fontWeight: "600", 
            color: isWeatherRisk ? theme.colors.error : theme.colors.warning,
            flex: 1,
          }}>
            {currentWeather} • {t("weatherDependent") || "Væravhengig"}
          </Text>
        </View>
        
        {isWeatherRisk && (
          <Text style={{ fontSize: 11, color: theme.colors.error }}>
            ⚠️ {t("weatherRisk") || "Værforhold kan påvirke arrangementet"}
          </Text>
        )}
        
        {event.weatherBackup.alternativeLocation && (
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
            {t("backup") || "Reserve"}: {event.weatherBackup.alternativeLocation}
          </Text>
        )}
        
        {event.weatherBackup.decisionDeadline && (
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
            {t("decisionBy") || "Avgjøres innen"}: {dayjs(event.weatherBackup.decisionDeadline).format("HH:mm")}
          </Text>
        )}
      </View>
    );
  };

  if (variant === "grid") {
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
        <Card style={{
          aspectRatio: 1,
          padding: 12,
          backgroundColor: theme.colors.card,
          borderLeftWidth: 4,
          borderLeftColor: getNorwegianSeasonalColor(),
        }}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>
                {getEventTypeIcon(event.type)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text 
                  style={{ 
                    fontSize: 14, 
                    fontWeight: "700", 
                    color: theme.colors.text 
                  }}
                  numberOfLines={2}
                >
                  {event.title}
                </Text>
              </View>
            </View>

            {/* Date */}
            <Text style={{ 
              fontSize: 12, 
              color: theme.colors.textSecondary,
              marginBottom: 8,
            }}>
              {dayjs(event.startTime).format("DD. MMM")}
              {!event.isAllDay && ` • ${dayjs(event.startTime).format("HH:mm")}`}
            </Text>

            {/* Location */}
            {event.location && (
              <Text 
                style={{ 
                  fontSize: 11, 
                  color: theme.colors.textSecondary,
                  marginBottom: 8,
                }}
                numberOfLines={1}
              >
                📍 {event.location.name}
              </Text>
            )}

            <View style={{ flex: 1 }} />

            {/* Bottom */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                {capacity.currentAttendees} {t("going") || "kommer"}
              </Text>
              {renderRSVPStatus()}
            </View>

            {/* Weather indicator */}
            {event.weatherBackup?.required && (
              <View style={{ 
                position: "absolute", 
                top: 8, 
                right: 8,
                backgroundColor: isWeatherRisk ? theme.colors.error + "20" : theme.colors.warning + "20",
                borderRadius: 12,
                width: 24,
                height: 24,
                justifyContent: "center",
                alignItems: "center",
              }}>
                <Text style={{ fontSize: 12 }}>
                  {getWeatherIcon(currentWeather)}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  if (variant === "detailed") {
    const status = getEventStatus();
    
    return (
      <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
        <Card style={{
          borderLeftWidth: 4,
          borderLeftColor: getNorwegianSeasonalColor(),
        }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
            <Text style={{ fontSize: 32, marginRight: 16 }}>
              {getEventTypeIcon(event.type)}
            </Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: "700", 
                  color: theme.colors.text,
                  flex: 1,
                }}>
                  {event.title}
                </Text>
                <View style={{
                  backgroundColor: theme.colors.primary + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: theme.radius.sm,
                }}>
                  <Text style={{ fontSize: 11, color: theme.colors.primary, fontWeight: "600" }}>
                    {formatEventType(event.type)}
                  </Text>
                </View>
              </View>

              {/* Status */}
              {getStatusText(status) && (
                <View style={{
                  backgroundColor: getStatusColor(status) + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                  marginBottom: 8,
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    color: getStatusColor(status), 
                    fontWeight: "600" 
                  }}>
                    {getStatusText(status)}
                  </Text>
                </View>
              )}

              {event.description && (
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: 14,
                  marginBottom: 8,
                }}>
                  {event.description}
                </Text>
              )}
            </View>
          </View>

          {/* Event Details */}
          <View style={{ marginBottom: 12 }}>
            {/* Date and Time */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={{ fontSize: 14, color: theme.colors.text, marginLeft: 8 }}>
                {dayjs(event.startTime).format("DD. MMMM YYYY")}
                {!event.isAllDay && ` • ${dayjs(event.startTime).format("HH:mm")} - ${dayjs(event.endTime).format("HH:mm")}`}
              </Text>
              {isQuietTime && (
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.warning }}>
                    🌙 {t("quietTime") || "Stilletid"}
                  </Text>
                </View>
              )}
            </View>

            {/* Location */}
            {event.location && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                <Text style={{ fontSize: 14, color: theme.colors.text, marginLeft: 8, flex: 1 }}>
                  {event.location.name}
                  {event.location.address && ` • ${event.location.address}`}
                </Text>
                {event.location.isOnline && (
                  <View style={{
                    backgroundColor: theme.colors.accentSeafoam + "20",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: theme.radius.sm,
                  }}>
                    <Text style={{ fontSize: 10, color: theme.colors.accentSeafoam, fontWeight: "600" }}>
                      💻 {t("online") || "Online"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Cost */}
            {event.cost && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="card-outline" size={16} color={theme.colors.primary} />
                <Text style={{ fontSize: 14, color: theme.colors.text, marginLeft: 8 }}>
                  {event.cost.amount} {event.cost.currency}
                  {event.cost.description && ` • ${event.cost.description}`}
                </Text>
              </View>
            )}
          </View>

          {/* Norwegian Features */}
          {renderNorwegianFeatures().length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {renderNorwegianFeatures()}
            </View>
          )}

          {/* Weather Info */}
          {renderWeatherInfo()}

          {/* Bottom Row */}
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center",
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginLeft: 4 }}>
                  {capacity.currentAttendees}
                  {capacity.totalCapacity > 0 && `/${capacity.totalCapacity}`}
                </Text>
              </View>
              
              {capacity.waitlistCount > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.warning} />
                  <Text style={{ fontSize: 14, color: theme.colors.warning, marginLeft: 4 }}>
                    {capacity.waitlistCount} {t("waitlist") || "venteliste"}
                  </Text>
                </View>
              )}

              {event.updates && event.updates.some(u => u.isImportant) && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
                  <Text style={{ fontSize: 14, color: theme.colors.error, marginLeft: 4 }}>
                    {t("importantUpdate") || "Viktig oppdatering"}
                  </Text>
                </View>
              )}
            </View>

            {renderRSVPStatus()}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // Timeline variant (default)
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={style}>
      <Card style={{
        borderLeftWidth: 3,
        borderLeftColor: getNorwegianSeasonalColor(),
      }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Event Icon and Time */}
          <View style={{ alignItems: "center", marginRight: 16, minWidth: 60 }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>
              {getEventTypeIcon(event.type)}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, textAlign: "center" }}>
              {dayjs(event.startTime).format("DD. MMM")}
            </Text>
            {!event.isAllDay && (
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: "center" }}>
                {dayjs(event.startTime).format("HH:mm")}
              </Text>
            )}
            {event.weatherBackup?.required && (
              <Text style={{ fontSize: 14, marginTop: 4 }}>
                {getWeatherIcon(currentWeather)}
              </Text>
            )}
          </View>

          {/* Event Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "700", 
                color: theme.colors.text,
                flex: 1,
              }}>
                {event.title}
              </Text>
              {renderRSVPStatus()}
            </View>

            {event.location && (
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 4 }}>
                📍 {event.location.name}
              </Text>
            )}

            {event.description && (
              <Text 
                style={{ 
                  fontSize: 14, 
                  color: theme.colors.textSecondary, 
                  marginBottom: 8 
                }}
                numberOfLines={2}
              >
                {event.description}
              </Text>
            )}

            {/* Norwegian Features */}
            {renderNorwegianFeatures().length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {renderNorwegianFeatures()}
              </View>
            )}

            {/* Bottom Info */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                {capacity.currentAttendees} {t("attending") || "kommer"}
              </Text>
              
              {event.cost && (
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                  💰 {event.cost.amount} {event.cost.currency}
                </Text>
              )}

              {isWeatherRisk && (
                <Text style={{ fontSize: 13, color: theme.colors.error }}>
                  ⚠️ {t("weatherRisk") || "Værrisiko"}
                </Text>
              )}

              {isQuietTime && (
                <Text style={{ fontSize: 13, color: theme.colors.warning }}>
                  🌙 {t("quietTime") || "Stilletid"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}