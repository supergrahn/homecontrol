import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { auth } from "../firebase";
import { fetchUserEvents } from "../services/events";
import FamilyDaySummary from "../components/FamilyDaySummary";
import { familyDaySummaryService } from "../services/familyDaySummary";
import AppointmentCreationModal from "../components/appointments/AppointmentCreationModal";
import dayjs from "dayjs";

export default function CommunityScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const user = auth.currentUser;
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Norwegian greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("community.goodMorning");
    if (hour < 18) return t("community.goodDay");
    return t("community.goodEvening");
  };


  // Fetch upcoming events (next 7 days)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", user?.uid, "upcoming"],
    queryFn: () => user ? fetchUserEvents(user.uid, {
      start: new Date(),
      end: dayjs().add(7, 'days').toDate(),
    }) : [],
    enabled: !!user,
  });

  // Fetch weather summary for header
  const { data: weatherSummary } = useQuery({
    queryKey: ["familyDaySummary", householdId, "weather"],
    queryFn: async () => {
      if (!householdId || !user) return null;
      const summary = await familyDaySummaryService.generateFamilyDaySummary(householdId, user.uid);
      return summary.weatherSummary;
    },
    enabled: !!householdId && !!user,
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      marginBottom: 24,
    },
    greeting: {
      fontSize: 28,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    weather: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.text,
    },
    sectionAction: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    quickActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 24,
    },
    quickAction: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      minWidth: 100,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    quickActionText: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.onSurface,
      textAlign: "center",
    },
    groupsList: {
      gap: 12,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    groupIcon: {
      backgroundColor: "#E8F5E8",
      borderRadius: 24,
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    groupMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    eventsList: {
      gap: 12,
    },
    eventCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    eventHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    eventTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    eventType: {
      backgroundColor: "#FFF3E0",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    eventTypeText: {
      fontSize: 10,
      fontWeight: "600",
      color: "#E65100",
      textTransform: "uppercase",
    },
    eventTime: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
      marginBottom: 4,
    },
    eventLocation: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 16,
    },
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t("community.signInRequired")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Norwegian Greeting Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}!</Text>
          <Text style={styles.subtitle}>{dayjs().format("dddd, DD. MMMM YYYY")}</Text>
          <Text style={styles.weather}>
            {weatherSummary 
              ? `${weatherSummary.temperature}° • ${weatherSummary.conditions} • ${weatherSummary.outdoorRecommendation}`
              : "15° • Delvis skyet • God dag for friluftsliv"
            }
          </Text>
        </View>
        
        {/* Family Day Summary - Full Width */}
        <View style={{ marginHorizontal: -16, marginBottom: 24 }}>
          <FamilyDaySummary />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate("CreateGroup" as any)}
          >
            <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>{t("community.createGroup")}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate("CreateEvent" as any)}
          >
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>{t("community.newEvent")}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => setShowAppointmentModal(true)}
          >
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>{t("community.createAppointment")}</Text>
          </TouchableOpacity>
        </View>


        {/* Upcoming Events Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("community.events")}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Events" as any)}>
              <Text style={styles.sectionAction}>{t("community.seeAll")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.eventsList}>
            {eventsLoading ? (
              <Text style={styles.emptyStateText}>{t("community.loadingEvents")}</Text>
            ) : events.slice(0, 3).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate("EventDetail" as any, { id: event.id })}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventType}>
                    <Text style={styles.eventTypeText}>
                      {event.type === "bursdagsfest" ? t("community.birthday") :
                       event.type === "skolearrangement" ? t("community.school") :
                       event.type === "17_mai" ? t("community.17thMay") : event.type}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.eventTime}>
                  {dayjs(event.startTime).format("DD.MM • HH:mm")}
                </Text>
                
                {event.location && (
                  <Text style={styles.eventLocation}>
                    📍 {event.location.name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            
            {!eventsLoading && events.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>
                  {t("community.noEvents")}{'\n'}
                  {t("community.createNewEvent")}
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Appointment Creation Modal */}
      <AppointmentCreationModal
        visible={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        householdId={householdId || ""}
        onSave={(appointment) => {
          setShowAppointmentModal(false);
          // Could show a success toast here
        }}
      />
    </View>
  );
}