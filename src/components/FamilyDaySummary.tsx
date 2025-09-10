import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { auth } from "../firebase";
import {
  familyDaySummaryService,
  FamilyDaySummaryData,
  CriticalAlert,
  SchoolAnomaly,
  FamilyScheduleItem,
  CulturalContext,
  CommunityConnection,
} from "../services/familyDaySummary";
import { listChildren } from "../services/children";
import dayjs from "dayjs";

type ExpandableCardProps = {
  title: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  urgency?: "high" | "medium" | "low";
  badge?: number;
  accessibility?: {
    label: string;
    hint: string;
  };
};

function ExpandableCard({
  title,
  icon,
  iconColor,
  backgroundColor,
  children,
  defaultExpanded = false,
  urgency,
  badge,
  accessibility,
}: ExpandableCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    // Announce state change for screen readers
    const announcement = newExpanded ? `${title} utvidet` : `${title} skjult`;
    AccessibilityInfo.announceForAccessibility(announcement);
    
    Animated.timing(animation, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const urgencyColors = {
    high: theme.colors.error,
    medium: theme.colors.warning,
    low: theme.colors.textSecondary,
  };

  return (
    <View
      style={[
        styles.expandableCard,
        { backgroundColor: backgroundColor || theme.colors.surface },
        urgency === "high" && { borderLeftWidth: 4, borderLeftColor: theme.colors.error },
      ]}
      accessible={true}
      accessibilityLabel={accessibility?.label || title}
      accessibilityHint={accessibility?.hint || "Dobbeltklikk for å utvide"}
      accessibilityRole="button"
    >
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.cardIcon, { backgroundColor: iconColor + "20" }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          {badge && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: urgencyColors[urgency || "medium"] }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onEmphasis }]}>
                {badge > 99 ? "99+" : badge}
              </Text>
            </View>
          )}
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={theme.colors.textSecondary} 
          />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View
        style={[
          styles.cardContent,
          {
            maxHeight: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Adjust max height as needed
            }),
            opacity: animation,
          },
        ]}
      >
        {expanded && children}
      </Animated.View>
    </View>
  );
}

function CriticalAlertsCard({ alerts }: { alerts: CriticalAlert[] }) {
  const theme = useTheme();

  if (alerts.length === 0) return null;

  return (
    <ExpandableCard
      title="Kritiske varsler"
      icon="warning"
      iconColor={theme.colors.error}
      backgroundColor={theme.colors.errorSurface}
      defaultExpanded={true}
      urgency="high"
      badge={alerts.length}
      accessibility={{
        label: `${alerts.length} kritiske varsler krever oppmerksomhet`,
        hint: "Utvid for å se detaljer om hvert varsel"
      }}
    >
      <View style={styles.alertsList}>
        {alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertItem,
              { 
                backgroundColor: theme.colors.surface,
                borderLeftColor: alert.severity === "high" ? theme.colors.error : theme.colors.warning,
              },
            ]}
          >
            <Text style={[styles.alertTitle, { color: theme.colors.onSurface }]}>
              {alert.title}
            </Text>
            <Text style={[styles.alertDescription, { color: theme.colors.textSecondary }]}>
              {alert.description}
            </Text>
            {alert.actionable && alert.actionText && (
              <TouchableOpacity style={[styles.alertAction, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.alertActionText, { color: theme.colors.onPrimary }]}>
                  {alert.actionText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ExpandableCard>
  );
}

function SchoolUpdatesCard({ 
  schoolUpdates 
}: { 
  schoolUpdates: FamilyDaySummaryData["schoolUpdates"] 
}) {
  const theme = useTheme();
  
  if (schoolUpdates.length === 0) return null;

  const totalAnomalies = schoolUpdates.reduce((sum, update) => sum + update.anomalies.length, 0);
  const highSeverityAnomalies = schoolUpdates.reduce(
    (sum, update) => sum + update.anomalies.filter(a => a.severity === "high").length, 
    0
  );

  return (
    <View
      style={[
        styles.expandableCard,
        { backgroundColor: theme.colors.surface },
        highSeverityAnomalies > 0 && { borderLeftWidth: 4, borderLeftColor: theme.colors.error },
      ]}
      accessible={true}
      accessibilityLabel={`Dagens viktige oppdateringer for familien`}
      accessibilityHint="Viktige hendelser, skoleplan og familieoppdateringer"
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Ionicons
            name="information-circle"
            size={20}
            color={theme.colors.primary}
            style={styles.cardIcon}
          />
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Dagens viktige
          </Text>
          {totalAnomalies > 0 && (
            <View style={[styles.badge, { backgroundColor: highSeverityAnomalies > 0 ? theme.colors.error : theme.colors.warning }]}>
              <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
                {totalAnomalies}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.schoolUpdatesList}>
        {schoolUpdates.map((update) => (
          <View key={update.childId} style={[styles.schoolUpdateItem, { backgroundColor: theme.colors.background }]}>
            <View style={styles.schoolUpdateHeader}>
              <Text style={[styles.childName, { color: theme.colors.onSurface }]}>
                {update.childName}
              </Text>
              {update.schoolName && (
                <Text style={[styles.schoolName, { color: theme.colors.textSecondary }]}>
                  {update.schoolName}
                </Text>
              )}
            </View>
            
            {update.anomalies.length > 0 && (
              <View style={styles.anomaliesList}>
                {update.anomalies.map((anomaly, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.anomalyItem,
                      { 
                        backgroundColor: anomaly.severity === "high" ? theme.colors.errorSurface : theme.colors.warningSurface,
                        borderColor: anomaly.severity === "high" ? theme.colors.errorBorder : theme.colors.warningBorder,
                      }
                    ]}
                  >
                    <Text style={[styles.anomalyTitle, { color: theme.colors.onSurface }]}>
                      {anomaly.title}
                    </Text>
                    <Text style={[styles.anomalyDescription, { color: theme.colors.textSecondary }]}>
                      {anomaly.description}
                    </Text>
                    {anomaly.timeAffected && (
                      <Text style={[styles.anomalyTime, { color: theme.colors.primary }]}>
                        Berører: {anomaly.timeAffected}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {update.todaysSchedule && update.anomalies.length === 0 && (
              <View style={styles.normalSchedule}>
                <Text style={[styles.scheduleStatus, { color: theme.colors.success }]}>
                  ✓ Normal skoledag planlagt
                </Text>
                <Text style={[styles.scheduleDetails, { color: theme.colors.textSecondary }]}>
                  {update.todaysSchedule.events.length} timer i dag
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function FamilyScheduleCard({ schedule }: { schedule: FamilyScheduleItem[] }) {
  const theme = useTheme();

  if (schedule.length === 0) return null;

  const urgentItems = schedule.filter(item => item.priority === "high").length;

  return (
    <ExpandableCard
      title="Dagens plan"
      icon="calendar"
      iconColor={theme.colors.primary}
      backgroundColor={theme.colors.surface}
      urgency={urgentItems > 0 ? "high" : "medium"}
      badge={schedule.length}
      accessibility={{
        label: `Dagens familieplan med ${schedule.length} aktiviteter`,
        hint: "Se full oversikt over dagens oppgaver og arrangementer"
      }}
    >
      <View style={styles.scheduleList}>
        {schedule.map((item) => (
          <View
            key={item.id}
            style={[
              styles.scheduleItem,
              { 
                backgroundColor: theme.colors.background,
                borderLeftColor: item.priority === "high" ? theme.colors.error : 
                               item.priority === "medium" ? theme.colors.warning : theme.colors.textSecondary,
              },
            ]}
          >
            <View style={styles.scheduleItemHeader}>
              <Text style={[styles.scheduleTime, { color: theme.colors.primary }]}>
                {item.time}
              </Text>
              <View style={styles.scheduleItemRight}>
                {item.status === "completed" && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                )}
                {item.status === "in_progress" && (
                  <View style={[styles.statusIndicator, { backgroundColor: theme.colors.warning }]} />
                )}
                <Text style={[styles.scheduleType, { 
                  color: theme.colors.textSecondary,
                  backgroundColor: item.type === "school" ? theme.colors.primary + "20" :
                                  item.type === "event" ? theme.colors.success + "20" : theme.colors.textSecondary + "20"
                }]}>
                  {item.type === "school" ? "Skole" : item.type === "event" ? "Arrangement" : "Oppgave"}
                </Text>
              </View>
            </View>
            <Text style={[styles.scheduleTitle, { color: theme.colors.onSurface }]}>
              {item.title}
            </Text>
            {item.duration && (
              <Text style={[styles.scheduleDuration, { color: theme.colors.textSecondary }]}>
                Varighet: {Math.round(item.duration / 60)} timer
              </Text>
            )}
            {item.norwegianContext && (
              <Text style={[styles.norwegianContext, { color: theme.colors.textSecondary }]}>
                {item.norwegianContext}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ExpandableCard>
  );
}

// Removed CulturalContextCard - redundant for community screen

function CommunityConnectionsCard({ connections }: { connections: CommunityConnection[] }) {
  const theme = useTheme();

  if (connections.length === 0) return null;

  const urgentConnections = connections.filter(c => c.deadline).length;

  return (
    <ExpandableCard
      title="Samfunnstilknytning"
      icon="people"
      iconColor={theme.colors.accentSeafoam}
      backgroundColor={theme.colors.surface}
      urgency={urgentConnections > 0 ? "medium" : "low"}
      badge={connections.length}
      accessibility={{
        label: `${connections.length} lokale arrangementer og muligheter`,
        hint: "Utforsk lokale aktiviteter og fellesskap"
      }}
    >
      <View style={styles.connectionsList}>
        {connections.map((connection) => (
          <View
            key={connection.id}
            style={[styles.connectionItem, { backgroundColor: theme.colors.background }]}
          >
            <View style={styles.connectionHeader}>
              <Text style={[styles.connectionTitle, { color: theme.colors.onSurface }]}>
                {connection.title}
              </Text>
              <View style={[
                styles.connectionType,
                { backgroundColor: theme.colors.accentSeafoam + "20" }
              ]}>
                <Text style={[styles.connectionTypeText, { color: theme.colors.accentSeafoam }]}>
                  {connection.type === "local_event" ? "Lokalt" :
                   connection.type === "group_activity" ? "Gruppe" : "Skole"}
                </Text>
              </View>
            </View>
            <Text style={[styles.connectionDescription, { color: theme.colors.textSecondary }]}>
              {connection.description}
            </Text>
            
            <View style={styles.connectionDetails}>
              {connection.time && (
                <Text style={[styles.connectionTime, { color: theme.colors.primary }]}>
                  🕒 {connection.time}
                </Text>
              )}
              {connection.location && (
                <Text style={[styles.connectionLocation, { color: theme.colors.textSecondary }]}>
                  📍 {connection.location}
                </Text>
              )}
              <View style={styles.connectionMeta}>
                <Text style={[styles.connectionCost, { 
                  color: connection.cost === "free" ? theme.colors.success : theme.colors.textSecondary 
                }]}>
                  {connection.cost === "free" ? "Gratis" : 
                   connection.cost === "low" ? "Rimelig" :
                   connection.cost === "medium" ? "Moderat pris" : "Dyrere"}
                </Text>
                {connection.signupRequired && (
                  <Text style={[styles.signupRequired, { color: theme.colors.warning }]}>
                    Påmelding kreves
                  </Text>
                )}
              </View>
            </View>
            
            {connection.deadline && (
              <Text style={[styles.connectionDeadline, { color: theme.colors.error }]}>
                ⏰ Påmeldingsfrist: {connection.deadline}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ExpandableCard>
  );
}

export default function FamilyDaySummary() {
  const theme = useTheme();
  const { householdId } = useHousehold();
  const user = auth.currentUser;
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const isTablet = screenData.width >= 768;
  const isLandscape = screenData.width > screenData.height;

  // Fetch children data
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["children", householdId],
    queryFn: () => householdId ? listChildren(householdId) : [],
    enabled: !!householdId,
  });

  // Fetch family day summary
  const { 
    data: summaryData, 
    isLoading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ["familyDaySummary", householdId, user?.uid],
    queryFn: () => {
      if (!householdId || !user?.uid || children.length === 0) return null;
      return familyDaySummaryService.getDaySummary(householdId, children, user.uid);
    },
    enabled: !!householdId && !!user?.uid && children.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  const isLoading = childrenLoading || summaryLoading;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.surface }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Samler dagens familieoversikt...
        </Text>
      </View>
    );
  }

  if (summaryError || !summaryData) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorSurface }]}>
        <Ionicons name="warning" size={32} color={theme.colors.error} />
        <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
          Kunne ikke laste familieoversikt
        </Text>
        <Text style={[styles.errorDescription, { color: theme.colors.textSecondary }]}>
          Vi har problemer med å hente dagens informasjon. Prøv igjen senere.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => refetchSummary()}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
            Prøv igjen
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        isTablet && styles.containerTablet,
        isLandscape && isTablet && styles.containerLandscape
      ]}
      accessible={true}
      accessibilityLabel="Dagens familieoversikt"
      accessibilityHint="Oversikt over dagens aktiviteter, skoleplan og samfunnsinformasjon"
    >
      {/* Header removed - now handled by CommunityScreen */}

      {/* Expandable cards */}
      <ScrollView 
        style={styles.cardsContainer}
        contentContainerStyle={[
          styles.cardsContent,
          isTablet && styles.cardsContentTablet,
          isLandscape && isTablet && styles.cardsContentLandscape
        ]}
        showsVerticalScrollIndicator={false}
        accessible={true}
        accessibilityLabel="Liste over dagens familiekort"
      >
        <CriticalAlertsCard alerts={summaryData.criticalAlerts} />
        <SchoolUpdatesCard schoolUpdates={summaryData.schoolUpdates} />
        <FamilyScheduleCard schedule={summaryData.familySchedule} />
        <CommunityConnectionsCard connections={summaryData.communityConnections} />
        
        {/* Cache info footer */}
        <View style={styles.cacheInfo}>
          <Text style={[styles.cacheText, { color: theme.colors.textSecondary }]}>
            Oppdatert: {dayjs(summaryData.generatedAt).format("HH:mm")} • 
            Neste oppdatering: {dayjs(summaryData.cacheExpiresAt).format("HH:mm")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    padding: 24,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    marginBottom: 12,
  },
  weatherSummary: {
    marginTop: 8,
  },
  weatherText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  weatherAdvice: {
    fontSize: 12,
  },
  cardsContainer: {
    flex: 1,
  },
  cardsContent: {
    padding: 16,
    gap: 12,
  },
  expandableCard: {
    borderRadius: 12,
    marginBottom: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardContent: {
    overflow: "hidden",
  },
  // Alert styles
  alertsList: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  alertItem: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  alertAction: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  alertActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // School update styles
  schoolUpdatesList: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  schoolUpdateItem: {
    padding: 16,
    borderRadius: 8,
  },
  schoolUpdateHeader: {
    marginBottom: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 14,
  },
  anomaliesList: {
    gap: 8,
  },
  anomalyItem: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  anomalyTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  anomalyDescription: {
    fontSize: 12,
    marginBottom: 4,
  },
  anomalyTime: {
    fontSize: 12,
    fontWeight: "500",
  },
  normalSchedule: {
    padding: 12,
    borderRadius: 6,
  },
  scheduleStatus: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  scheduleDetails: {
    fontSize: 12,
  },
  // Family schedule styles
  scheduleList: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  scheduleItem: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  scheduleItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scheduleType: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  scheduleDuration: {
    fontSize: 12,
    marginBottom: 2,
  },
  norwegianContext: {
    fontSize: 12,
    fontStyle: "italic",
  },
  // Cultural context styles
  culturalList: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  culturalItem: {
    padding: 16,
    borderRadius: 8,
  },
  culturalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  culturalTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  culturalType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  culturalTypeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  culturalDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  activitiesList: {
    marginBottom: 8,
  },
  activitiesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  activityItem: {
    fontSize: 12,
    marginBottom: 2,
    paddingLeft: 8,
  },
  weatherNote: {
    fontSize: 12,
    fontStyle: "italic",
  },
  // Community connections styles
  connectionsList: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  connectionItem: {
    padding: 16,
    borderRadius: 8,
  },
  connectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  connectionType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectionTypeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  connectionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  connectionDetails: {
    gap: 4,
    marginBottom: 8,
  },
  connectionTime: {
    fontSize: 12,
  },
  connectionLocation: {
    fontSize: 12,
  },
  connectionMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  connectionCost: {
    fontSize: 12,
    fontWeight: "500",
  },
  signupRequired: {
    fontSize: 12,
    fontWeight: "500",
  },
  connectionDeadline: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Cache info
  cacheInfo: {
    alignItems: "center",
    paddingVertical: 16,
  },
  cacheText: {
    fontSize: 10,
    textAlign: "center",
  },
  // Responsive design styles
  containerTablet: {
    maxWidth: 768,
    alignSelf: "center",
  },
  containerLandscape: {
    maxWidth: 1024,
  },
  cardsContentTablet: {
    paddingHorizontal: 24,
  },
  cardsContentLandscape: {
    paddingHorizontal: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});