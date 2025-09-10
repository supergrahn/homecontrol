import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { auth } from "../firebase";
import { fetchUserEvents, fetchCommunityEvents } from "../services/events";
import { Event, EventType, NORWEGIAN_EVENT_TEMPLATES } from "../models/Event";
import dayjs from "dayjs";

type EventCategory = "mine" | "school" | "17mai" | "sesong" | "dugnad" | "community";

export default function EventsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = auth.currentUser;
  
  const [activeCategory, setActiveCategory] = useState<EventCategory>("mine");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's events (next 30 days)
  const { data: userEvents = [], isLoading: userEventsLoading } = useQuery({
    queryKey: ["events", user?.uid, "user"],
    queryFn: () => user ? fetchUserEvents(user.uid, {
      start: new Date(),
      end: dayjs().add(30, 'days').toDate(),
    }) : [],
    enabled: !!user,
  });

  // Fetch community events
  const { data: communityEvents = [], isLoading: communityLoading } = useQuery({
    queryKey: ["events", "community"],
    queryFn: () => fetchCommunityEvents({}, {
      start: new Date(),
      end: dayjs().add(30, 'days').toDate(),
    }),
    enabled: activeCategory === "community",
  });

  // Categorize events
  const categorizedEvents = React.useMemo(() => {
    const now = new Date();
    const events = {
      school: userEvents.filter(e => 
        e.type === "skolearrangement" || 
        e.type === "foreldremøte" || 
        e.type === "klassetur" ||
        e.type === "sfo_aktivitet" ||
        e.type === "aks_aktivitet"
      ),
      mai17: userEvents.filter(e => e.type === "17_mai"),
      sesong: userEvents.filter(e => 
        e.type === "friluftsliv" || 
        e.type === "vinterferie" || 
        e.type === "sommerferie"
      ),
      dugnad: userEvents.filter(e => e.type === "dugnad"),
      upcoming: userEvents.filter(e => dayjs(e.startTime).isAfter(now)),
      past: userEvents.filter(e => dayjs(e.startTime).isBefore(now)),
    };
    return events;
  }, [userEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["events"] });
    setRefreshing(false);
  };

  const getEventsForCategory = (category: EventCategory): Event[] => {
    switch (category) {
      case "mine": return userEvents;
      case "school": return categorizedEvents.school;
      case "17mai": return categorizedEvents.mai17;
      case "sesong": return categorizedEvents.sesong;
      case "dugnad": return categorizedEvents.dugnad;
      case "community": return communityEvents;
      default: return [];
    }
  };

  const getEventStatus = (event: Event): { text: string; color: string; bgColor: string } => {
    const now = new Date();
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    
    if (endTime < now) {
      return { text: "Ferdig", color: "#666", bgColor: "#F5F5F5" };
    } else if (startTime <= now && now <= endTime) {
      return { text: "Pågår", color: "#2E7D32", bgColor: "#E8F5E8" };
    } else if (dayjs(startTime).diff(now, 'hours') < 24) {
      return { text: "I dag", color: "#E65100", bgColor: "#FFF3E0" };
    } else if (dayjs(startTime).diff(now, 'days') < 7) {
      return { text: "Denne uken", color: "#1976D2", bgColor: "#E3F2FD" };
    } else {
      return { text: "Kommende", color: "#7B1FA2", bgColor: "#F3E5F5" };
    }
  };

  const getUserRSVP = (event: Event): string => {
    if (!user) return "Ikke svart";
    const attendee = event.attendees.find(a => a.userId === user.uid);
    if (!attendee) return "Ikke invitert";
    
    switch (attendee.rsvpStatus) {
      case "yes": return "Deltar";
      case "no": return "Deltar ikke";
      case "maybe": return "Kanskje";
      case "waitlist": return "Venteliste";
      default: return "Ikke svart";
    }
  };

  const renderEventCard = (event: Event) => {
    const template = NORWEGIAN_EVENT_TEMPLATES[event.type];
    const status = getEventStatus(event);
    const rsvpStatus = getUserRSVP(event);
    
    return (
      <TouchableOpacity
        key={event.id}
        style={styles.eventCard}
        onPress={() => navigation.navigate("EventDetail" as any, { id: event.id })}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventIcon}>
            <Text style={styles.eventEmoji}>{template.icon}</Text>
          </View>
          
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventType}>{template.name}</Text>
            
            <View style={styles.eventMeta}>
              <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>
                {dayjs(event.startTime).format("DD.MM • HH:mm")}
              </Text>
              
              {event.location && (
                <>
                  <Text style={styles.metaDivider}>•</Text>
                  <Ionicons name="location" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {event.location.name}
                  </Text>
                </>
              )}
            </View>

            {event.groupId && (
              <Text style={styles.groupContext}>
                👥 Gruppearrangement
              </Text>
            )}
          </View>
          
          <View style={styles.eventActions}>
            <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            
            <View style={[styles.rsvpBadge, { 
              backgroundColor: rsvpStatus === "Deltar" ? "#E8F5E8" : 
                             rsvpStatus === "Deltar ikke" ? "#FFEBEE" :
                             rsvpStatus === "Kanskje" ? "#FFF3E0" : "#F5F5F5"
            }]}>
              <Text style={[styles.rsvpText, {
                color: rsvpStatus === "Deltar" ? "#2E7D32" : 
                       rsvpStatus === "Deltar ikke" ? "#C62828" :
                       rsvpStatus === "Kanskje" ? "#E65100" : "#666"
              }]}>
                {rsvpStatus}
              </Text>
            </View>
          </View>
        </View>

        {event.norwegianCulturalContext?.weatherConsiderations && (
          <View style={styles.weatherWarning}>
            <Ionicons name="cloud" size={16} color="#E65100" />
            <Text style={styles.weatherText}>
              Væravhengig arrangement
            </Text>
          </View>
        )}

        <View style={styles.eventFooter}>
          <View style={styles.attendeeInfo}>
            <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>
              {event.attendees.filter(a => a.rsvpStatus === "yes").length} deltar
              {event.maxAttendees && ` / ${event.maxAttendees} plasser`}
            </Text>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    categories: {
      flexDirection: "row",
      paddingHorizontal: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginHorizontal: 4,
      backgroundColor: theme.colors.background,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.onSurface,
    },
    categoryTextActive: {
      color: "white",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    eventCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    eventHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    eventIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#F0F7FF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    eventEmoji: {
      fontSize: 24,
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    eventType: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.primary,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    eventMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    metaDivider: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginHorizontal: 6,
    },
    groupContext: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    eventActions: {
      alignItems: "flex-end",
      gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    rsvpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    rsvpText: {
      fontSize: 10,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    weatherWarning: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF3E0",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 12,
    },
    weatherText: {
      fontSize: 12,
      color: "#E65100",
      marginLeft: 6,
      fontWeight: "500",
    },
    eventFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    attendeeInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      flexDirection: "row",
      alignItems: "center",
    },
    createButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
  });

  const currentEvents = getEventsForCategory(activeCategory);
  const isLoading = activeCategory === "community" ? communityLoading : userEventsLoading;

  return (
    <View style={styles.container}>
      {/* Header with Categories */}
      <View style={styles.header}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
        >
          {[
            { key: "mine", label: "Mine", icon: "calendar" },
            { key: "school", label: "Skole", icon: "school" },
            { key: "17mai", label: "17. mai", icon: "flag" },
            { key: "sesong", label: "Sesong", icon: "sunny" },
            { key: "dugnad", label: "Dugnad", icon: "hammer" },
            { key: "community", label: "Samfunn", icon: "people" },
          ].map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                activeCategory === category.key && styles.categoryChipActive,
              ]}
              onPress={() => setActiveCategory(category.key as EventCategory)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.key && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>
          {activeCategory === "mine" ? "Dine Arrangementer" :
           activeCategory === "school" ? "Skolearrangementer" :
           activeCategory === "17mai" ? "17. mai Feiring" :
           activeCategory === "sesong" ? "Sesongaktiviteter" :
           activeCategory === "dugnad" ? "Dugnad & Fellesarbeid" :
           activeCategory === "community" ? "Samfunnsarrangementer" : "Arrangementer"}
        </Text>

        {isLoading ? (
          <Text style={styles.emptyStateText}>Laster...</Text>
        ) : currentEvents.length > 0 ? (
          currentEvents
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map(renderEventCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>
              {activeCategory === "mine" ? "📅" :
               activeCategory === "school" ? "🏫" :
               activeCategory === "17mai" ? "🇳🇴" :
               activeCategory === "sesong" ? "🌞" :
               activeCategory === "dugnad" ? "🧹" :
               activeCategory === "community" ? "👥" : "📅"}
            </Text>
            <Text style={styles.emptyStateTitle}>
              Ingen arrangementer
            </Text>
            <Text style={styles.emptyStateText}>
              {activeCategory === "mine" ? 
                "Du har ingen kommende arrangementer.\nOpprett et nytt eller bli med i eksisterende!" :
                `Ingen ${activeCategory === "school" ? "skolearrangementer" :
                         activeCategory === "17mai" ? "17. mai arrangementer" :
                         activeCategory === "sesong" ? "sesongaktiviteter" :
                         activeCategory === "dugnad" ? "dugnad aktiviteter" :
                         activeCategory === "community" ? "samfunnsarrangementer" : "arrangementer"} for øyeblikket.`}
            </Text>
            
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateEvent" as any)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Nytt Arrangement</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}