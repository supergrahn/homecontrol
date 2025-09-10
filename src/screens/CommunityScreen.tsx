import React from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { auth } from "../firebase";
import { fetchUserGroups } from "../services/groups";
import { fetchUserEvents } from "../services/events";
import dayjs from "dayjs";

export default function CommunityScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { householdId } = useHousehold();
  const user = auth.currentUser;

  // Norwegian greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "God morgen";
    if (hour < 18) return "God dag";
    return "God kveld";
  };

  // Fetch user's groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groups", user?.uid],
    queryFn: () => user ? fetchUserGroups(user.uid) : [],
    enabled: !!user,
  });

  // Fetch upcoming events (next 7 days)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", user?.uid, "upcoming"],
    queryFn: () => user ? fetchUserEvents(user.uid, {
      start: new Date(),
      end: dayjs().add(7, 'days').toDate(),
    }) : [],
    enabled: !!user,
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
      marginBottom: 16,
    },
    seasonalBanner: {
      backgroundColor: "#E3F2FD", // Light blue for now
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    seasonalText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 14,
      color: "#1565C0",
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
          <Text style={styles.emptyStateText}>Please sign in to view community features</Text>
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
          <Text style={styles.subtitle}>Velkommen til samfunnet ditt</Text>
          
          {/* Seasonal Context Banner */}
          <View style={styles.seasonalBanner}>
            <Ionicons name="sunny" size={24} color="#1565C0" />
            <Text style={styles.seasonalText}>
              Perfekt vær for utendørsaktiviteter i dag! 🌞
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate("CreateGroup" as any)}
          >
            <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Opprett{'\n'}Gruppe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate("CreateEvent" as any)}
          >
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Nytt{'\n'}Arrangement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate("Groups" as any)}
          >
            <Ionicons name="search-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.quickActionText}>Finn{'\n'}Grupper</Text>
          </TouchableOpacity>
        </View>

        {/* Active Groups Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mine Grupper</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Groups" as any)}>
              <Text style={styles.sectionAction}>Se alle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupsList}>
            {groupsLoading ? (
              <Text style={styles.emptyStateText}>Laster grupper...</Text>
            ) : groups.slice(0, 3).map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigation.navigate("GroupDetail" as any, { id: group.id })}
              >
                <View style={styles.groupIcon}>
                  <Text style={{ fontSize: 20 }}>
                    {group.type === "school_class" ? "🏫" : 
                     group.type === "neighborhood" ? "🏘️" : 
                     group.type === "hobby_group" ? "⚽" : "👥"}
                  </Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.memberCount} medlemmer • {group.type === "school_class" ? "Skoleklasse" : group.type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
            
            {!groupsLoading && groups.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>
                  Du er ikke med i noen grupper ennå.{'\n'}
                  Opprett eller finn grupper i nærheten!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Upcoming Events Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kommende Arrangementer</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Events" as any)}>
              <Text style={styles.sectionAction}>Se alle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.eventsList}>
            {eventsLoading ? (
              <Text style={styles.emptyStateText}>Laster arrangementer...</Text>
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
                      {event.type === "bursdagsfest" ? "Bursdag" :
                       event.type === "skolearrangement" ? "Skole" :
                       event.type === "17_mai" ? "17. mai" : event.type}
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
                  Ingen kommende arrangementer.{'\n'}
                  Opprett et nytt arrangement!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* School Integration Section - placeholder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skole & SFO</Text>
          </View>
          
          <TouchableOpacity style={styles.groupCard}>
            <View style={[styles.groupIcon, { backgroundColor: "#FFE8E8" }]}>
              <Ionicons name="school" size={24} color="#C62828" />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>Koble til barnets skole</Text>
              <Text style={styles.groupMeta}>Få automatisk tilgang til klassens grupper</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}