import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import { useTheme } from "../design/theme";
import { ListSkeleton, TextSkeleton } from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import type { Event, EventAttendee, RSVPStatus, formatEventType, getEventTypeIcon, calculateEventCapacity } from "../models/Event";
import { isEventInNorwegianQuietHours } from "../models/Event";

// Mock services - these would be real Firebase/API calls
const fetchEventById = async (eventId: string): Promise<Event> => {
  // Mock implementation
  throw new Error("Not implemented");
};

const updateRSVP = async (eventId: string, userId: string, status: RSVPStatus, details?: Partial<EventAttendee>): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

const joinCarpool = async (eventId: string, carpoolId: string, userId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

const volunteerForTask = async (eventId: string, taskIndex: number, userId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

const getCurrentWeather = async (): Promise<string> => {
  // Mock weather service
  return "Partly cloudy";
};

export default function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const eventId = (route.params as any)?.id;
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState("info");
  
  // Current user ID - would come from auth context
  const currentUserId = "current-user-id";

  // Fetch event data
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId),
    enabled: !!eventId,
  });

  const { data: weather = "Unknown" } = useQuery({
    queryKey: ["weather"],
    queryFn: getCurrentWeather,
    refetchInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ status, details }: { status: RSVPStatus; details?: Partial<EventAttendee> }) =>
      updateRSVP(eventId, currentUserId, status, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const carpoolMutation = useMutation({
    mutationFn: (carpoolId: string) => joinCarpool(eventId, carpoolId, currentUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const volunteerMutation = useMutation({
    mutationFn: (taskIndex: number) => volunteerForTask(eventId, taskIndex, currentUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const handleRefresh = React.useCallback(async () => {
    if (!eventId) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    } finally {
      setRefreshing(false);
    }
  }, [eventId, queryClient]);

  const currentUserAttendee = event?.attendees.find(a => a.userId === currentUserId);
  const capacity = event ? calculateEventCapacity(event) : null;
  const isQuietTime = event ? isEventInNorwegianQuietHours(event.startTime, event.endTime) : false;

  const handleRSVP = (status: RSVPStatus) => {
    if (!event) return;

    if (status === "yes") {
      // Show modal to collect additional details
      Alert.alert(
        t("confirmAttendance") || "Bekreft oppmøte",
        t("rsvpDetailsPrompt") || "Vil du legge til detaljer?",
        [
          { text: t("cancel") || "Avbryt", style: "cancel" },
          { 
            text: t("justRSVP") || "Bare bekreft", 
            onPress: () => rsvpMutation.mutate({ status }) 
          },
          { 
            text: t("addDetails") || "Legg til detaljer", 
            onPress: () => {
              // Would open a modal with details form
              rsvpMutation.mutate({ 
                status,
                details: {
                  attendingChildren: [],
                  norwegianContext: {
                    bringingTraditionalFood: false,
                    volunteringForDugnad: [],
                    transportOffered: false,
                    equipmentSharing: [],
                  },
                }
              });
            }
          },
        ]
      );
    } else {
      rsvpMutation.mutate({ status });
    }
  };

  const renderEventHeader = () => (
    <Card style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
        <Text style={{ fontSize: 40, marginRight: 16 }}>
          {event ? getEventTypeIcon(event.type) : "📅"}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: theme.colors.text, marginBottom: 4 }}>
            {event?.title || "Laster..."}
          </Text>
          <View style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: theme.radius.sm,
            alignSelf: "flex-start",
          }}>
            <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: "600" }}>
              {event ? formatEventType(event.type) : ""}
            </Text>
          </View>
        </View>
      </View>

      {event?.description && (
        <Text style={{ color: theme.colors.text, marginBottom: 16, fontSize: 16 }}>
          {event.description}
        </Text>
      )}

      {/* Date and Time */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Ionicons name="time-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
        <View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
            {event ? dayjs(event.startTime).format("DD. MMMM YYYY") : ""}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {event && !event.isAllDay
              ? `${dayjs(event.startTime).format("HH:mm")} - ${dayjs(event.endTime).format("HH:mm")}`
              : t("allDay") || "Hele dagen"
            }
          </Text>
        </View>
      </View>

      {/* Location */}
      {event?.location && (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ionicons name="location-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => {
                if (event.location?.coordinates) {
                  const { latitude, longitude } = event.location.coordinates;
                  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                  Linking.openURL(url);
                } else if (event.location?.address) {
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`;
                  Linking.openURL(url);
                }
              }}
              disabled={!event.location?.coordinates && !event.location?.address}
            >
              <Text style={{ 
                fontSize: 16, 
                fontWeight: "600", 
                color: event.location?.coordinates || event.location?.address ? theme.colors.primary : theme.colors.text 
              }}>
                {event.location.name}
              </Text>
              {event.location.address && (
                <Text style={{ color: theme.colors.textSecondary }}>
                  {event.location.address}
                </Text>
              )}
              {event.location.isOnline && event.location.meetingLink && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(event.location!.meetingLink!)}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ color: theme.colors.primary, textDecorationLine: "underline" }}>
                    {t("joinOnline") || "Bli med online"}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Weather */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Ionicons name="partly-sunny-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: theme.colors.text }}>
            {weather}
          </Text>
          {event?.weatherBackup?.required && (
            <Text style={{ color: theme.colors.warning, fontSize: 14 }}>
              ⚠️ {t("weatherDependent") || "Væravhengig arrangement"}
              {event.weatherBackup.decisionDeadline && (
                <Text style={{ fontWeight: "600" }}>
                  {" • "}{t("decisionBy") || "Avgjøres innen"} {dayjs(event.weatherBackup.decisionDeadline).format("HH:mm")}
                </Text>
              )}
            </Text>
          )}
        </View>
      </View>

      {/* Norwegian Cultural Context */}
      {event?.norwegianCulturalContext && (
        <View style={{ 
          backgroundColor: theme.colors.background,
          padding: 12,
          borderRadius: theme.radius.md,
          marginBottom: 16
        }}>
          <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            🇳🇴 {t("norwegianTradition") || "Norsk tradisjon"}
          </Text>
          {event.norwegianCulturalContext.traditionalElement && (
            <Text style={{ color: theme.colors.text, marginBottom: 4 }}>
              {event.norwegianCulturalContext.traditionalElement}
            </Text>
          )}
          {event.norwegianCulturalContext.dresscode && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
              👔 {t("dresscode") || "Klesskode"}: {event.norwegianCulturalContext.dresscode}
            </Text>
          )}
        </View>
      )}

      {/* Quiet Time Warning */}
      {isQuietTime && (
        <View style={{
          backgroundColor: theme.colors.warningSurface,
          borderColor: theme.colors.warningBorder,
          borderWidth: 1,
          padding: 12,
          borderRadius: theme.radius.md,
          marginBottom: 16
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="moon" size={16} color={theme.colors.warning} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.colors.warning, fontSize: 14 }}>
              {t("quietHoursEvent") || "Dette arrangementet er i stilletiden (20:00-07:00)"}
            </Text>
          </View>
        </View>
      )}

      {/* RSVP Status and Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
            {capacity?.currentAttendees || 0} {t("attending") || "påmeldte"}
          </Text>
          {capacity && capacity.totalCapacity > 0 && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
              {t("spotsLeft") || "Plasser igjen"}: {capacity.availableSpots}
              {capacity.waitlistCount > 0 && ` • ${capacity.waitlistCount} ${t("onWaitlist") || "på venteliste"}`}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {!currentUserAttendee && (
            <Button
              title={t("rsvpYes") || "Kommer"}
              onPress={() => handleRSVP("yes")}
              size="small"
              disabled={capacity?.availableSpots === 0}
            />
          )}
          {currentUserAttendee?.rsvpStatus === "yes" && (
            <Button
              title={t("changeRSVP") || "Endre svar"}
              onPress={() => {
                Alert.alert(
                  t("changeRSVP") || "Endre svar",
                  t("selectNewRSVP") || "Velg nytt svar",
                  [
                    { text: t("cancel") || "Avbryt", style: "cancel" },
                    { text: t("maybe") || "Kanskje", onPress: () => handleRSVP("maybe") },
                    { text: t("cannotAttend") || "Kan ikke", onPress: () => handleRSVP("no") },
                  ]
                );
              }}
              variant="outline"
              size="small"
            />
          )}
          {!currentUserAttendee && (
            <Button
              title={t("rsvpNo") || "Kan ikke"}
              onPress={() => handleRSVP("no")}
              variant="outline"
              size="small"
            />
          )}
        </View>
      </View>
    </Card>
  );

  const renderInformationTab = () => (
    <View>
      {/* Gift Giving */}
      {event?.norwegianCulturalContext?.giftGiving?.expected && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            🎁 {t("giftGiving") || "Gaver"}
          </Text>
          <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
            {t("giftsExpected") || "Gaver forventes til dette arrangementet"}
          </Text>
          {event.norwegianCulturalContext.giftGiving.maxAmount && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
              {t("suggestedAmount") || "Foreslått beløp"}: {t("upTo") || "Inntil"} {event.norwegianCulturalContext.giftGiving.maxAmount} kr
            </Text>
          )}
          {event.norwegianCulturalContext.giftGiving.suggestions && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
                {t("giftSuggestions") || "Gaveforslag"}:
              </Text>
              {event.norwegianCulturalContext.giftGiving.suggestions.map((suggestion, index) => (
                <Text key={index} style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Cost Information */}
      {event?.cost && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            💰 {t("costInformation") || "Kostnadsinformasjon"}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text, marginBottom: 4 }}>
            {event.cost.amount} {event.cost.currency}
          </Text>
          {event.cost.description && (
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
              {event.cost.description}
            </Text>
          )}
          {event.cost.paymentDeadline && (
            <Text style={{ color: theme.colors.warning }}>
              {t("paymentDeadline") || "Betalingsfrist"}: {dayjs(event.cost.paymentDeadline).format("DD.MM.YYYY")}
            </Text>
          )}
          {event.cost.paymentMethods && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
                {t("paymentMethods") || "Betalingsmåter"}:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {event.cost.paymentMethods.map((method) => (
                  <View
                    key={method}
                    style={{
                      backgroundColor: theme.colors.primary + "20",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: theme.radius.sm,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.colors.primary }}>
                      {method === "vipps" && "📱 Vipps"}
                      {method === "bank_transfer" && "🏦 Bankoverføring"}
                      {method === "cash" && "💵 Kontant"}
                      {method === "invoice" && "📄 Faktura"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Age Restrictions */}
      {event?.ageRestrictions && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            👶 {t("ageRestrictions") || "Aldersgrenser"}
          </Text>
          <View>
            {event.ageRestrictions.minAge && (
              <Text style={{ color: theme.colors.text }}>
                {t("minimumAge") || "Minimumsalder"}: {event.ageRestrictions.minAge} år
              </Text>
            )}
            {event.ageRestrictions.maxAge && (
              <Text style={{ color: theme.colors.text }}>
                {t("maximumAge") || "Maksimumsalder"}: {event.ageRestrictions.maxAge} år
              </Text>
            )}
            {event.ageRestrictions.specificGrades && (
              <Text style={{ color: theme.colors.text }}>
                {t("specificGrades") || "Spesifikke trinn"}: {event.ageRestrictions.specificGrades.join(", ")}
              </Text>
            )}
          </View>
        </Card>
      )}

      {/* Updates */}
      {event?.updates && event.updates.length > 0 && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            📢 {t("updates") || "Oppdateringer"}
          </Text>
          {event.updates.slice(0, 3).map((update) => (
            <View
              key={update.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                  {update.authorName}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {dayjs(update.timestamp).format("DD.MM HH:mm")}
                </Text>
              </View>
              <Text style={{ color: theme.colors.text }}>
                {update.message}
              </Text>
              {update.isImportant && (
                <View style={{
                  backgroundColor: theme.colors.warningSurface,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: theme.radius.sm,
                  alignSelf: "flex-start",
                  marginTop: 4,
                }}>
                  <Text style={{ fontSize: 12, color: theme.colors.warning, fontWeight: "600" }}>
                    ⚠️ {t("important") || "Viktig"}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  );

  const renderCoordinationTab = () => (
    <View>
      {/* Carpooling */}
      {event?.coordination?.carpoolingEnabled && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🚗 {t("carpooling") || "Samkjøring"}
          </Text>
          
          {event.coordination.carpools && event.coordination.carpools.length > 0 ? (
            event.coordination.carpools.map((carpool, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.colors.background,
                  padding: 12,
                  borderRadius: theme.radius.md,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                    {carpool.driverName}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    {carpool.riders.length}/{carpool.availableSeats} {t("seats") || "plasser"}
                  </Text>
                </View>
                {carpool.pickupLocation && (
                  <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                    📍 {carpool.pickupLocation}
                  </Text>
                )}
                {carpool.availableSeats > carpool.riders.length && !carpool.riders.includes(currentUserId) && (
                  <Button
                    title={t("requestRide") || "Be om skyss"}
                    onPress={() => carpoolMutation.mutate(`carpool-${index}`)}
                    size="small"
                    variant="outline"
                  />
                )}
                {carpool.riders.includes(currentUserId) && (
                  <View style={{
                    backgroundColor: theme.colors.successSurface,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: theme.radius.sm,
                    alignSelf: "flex-start",
                  }}>
                    <Text style={{ fontSize: 12, color: theme.colors.success, fontWeight: "600" }}>
                      ✓ {t("youAreJoined") || "Du har fått skyss"}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View>
              <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic", marginBottom: 12 }}>
                {t("noCarpoolsYet") || "Ingen samkjøringsgrupper ennå"}
              </Text>
              <Button
                title={t("offerRide") || "Tilby skyss"}
                onPress={() => {
                  Alert.alert(
                    t("offerRide") || "Tilby skyss",
                    t("carpoolComingSoon") || "Samkjøringsfunksjon kommer snart"
                  );
                }}
                variant="outline"
                size="small"
              />
            </View>
          )}
        </Card>
      )}

      {/* Volunteer Tasks */}
      {event?.coordination?.allowVolunteerSignup && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🙋‍♀️ {t("volunteerTasks") || "Frivillige oppgaver"}
          </Text>
          
          {event.coordination.volunteerTasks && event.coordination.volunteerTasks.length > 0 ? (
            event.coordination.volunteerTasks.map((task, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.colors.background,
                  padding: 12,
                  borderRadius: theme.radius.md,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.text, flex: 1 }}>
                    {task.task}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    {task.volunteers.length}{task.maxVolunteers ? `/${task.maxVolunteers}` : ""} {t("volunteers") || "frivillige"}
                  </Text>
                </View>
                
                {task.volunteers.length > 0 && (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>
                    {t("volunteers") || "Frivillige"}: {task.volunteers.join(", ")}
                  </Text>
                )}
                
                {(!task.maxVolunteers || task.volunteers.length < task.maxVolunteers) && !task.volunteers.includes(currentUserId) && (
                  <Button
                    title={t("volunteer") || "Meld deg frivillig"}
                    onPress={() => volunteerMutation.mutate(index)}
                    size="small"
                    variant="outline"
                  />
                )}
                
                {task.volunteers.includes(currentUserId) && (
                  <View style={{
                    backgroundColor: theme.colors.successSurface,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: theme.radius.sm,
                    alignSelf: "flex-start",
                  }}>
                    <Text style={{ fontSize: 12, color: theme.colors.success, fontWeight: "600" }}>
                      ✓ {t("youVolunteered") || "Du har meldt deg"}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic" }}>
              {t("noVolunteerTasks") || "Ingen frivillige oppgaver ennå"}
            </Text>
          )}
        </Card>
      )}

      {/* Resource Sharing */}
      {event?.coordination?.allowResourceSharing && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🤝 {t("resourceSharing") || "Ressursdeling"}
          </Text>
          
          {event.coordination.sharedResources && event.coordination.sharedResources.length > 0 ? (
            event.coordination.sharedResources.map((resource, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: theme.colors.background,
                  padding: 12,
                  borderRadius: theme.radius.md,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.text, flex: 1 }}>
                    {resource.resource}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                    {t("providedBy") || "Tilbys av"} {resource.providedBy}
                  </Text>
                </View>
                {resource.needsReturn && (
                  <Text style={{ color: theme.colors.warning, fontSize: 14, marginTop: 4 }}>
                    ↩️ {t("needsReturn") || "Må returneres"}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic" }}>
              {t("noSharedResources") || "Ingen delte ressurser ennå"}
            </Text>
          )}
        </Card>
      )}
    </View>
  );

  const renderAttendeesTab = () => (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
          {t("attendees") || "Deltakere"} ({event?.attendees.filter(a => a.rsvpStatus === "yes").length || 0})
        </Text>
        {event?.privacy?.shareAttendeeList && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t("shareList") || "Del liste",
                t("shareAttendeeList") || "Del deltakerliste"
              );
            }}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {event?.attendees && event.attendees.length > 0 ? (
        <FlatList
          data={event.attendees.filter(a => a.rsvpStatus === "yes")}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                    {item.displayName}
                  </Text>
                  {item.attendingChildren.length > 0 && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                      👨‍👩‍👧‍👦 {item.attendingChildren.map(c => c.childName).join(", ")}
                    </Text>
                  )}
                  {item.rsvpAt && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {t("rsvpAt") || "Svarte"} {dayjs(item.rsvpAt).format("DD.MM HH:mm")}
                    </Text>
                  )}
                </View>

                {/* Norwegian context indicators */}
                <View style={{ alignItems: "flex-end" }}>
                  {item.norwegianContext?.bringingTraditionalFood && (
                    <Text style={{ fontSize: 12, color: theme.colors.accentCoral }}>
                      🍰 {t("bringingFood") || "Tar med mat"}
                    </Text>
                  )}
                  {item.norwegianContext?.transportOffered && (
                    <Text style={{ fontSize: 12, color: theme.colors.success }}>
                      🚗 {t("offeringRide") || "Tilbyr skyss"}
                    </Text>
                  )}
                  {item.norwegianContext?.volunteringForDugnad && item.norwegianContext.volunteringForDugnad.length > 0 && (
                    <Text style={{ fontSize: 12, color: theme.colors.primary }}>
                      🙋‍♀️ {t("volunteering") || "Frivillig"}
                    </Text>
                  )}
                </View>
              </View>

              {item.notes && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 8, fontStyle: "italic" }}>
                  💬 {item.notes}
                </Text>
              )}
            </Card>
          )}
        />
      ) : (
        <EmptyState
          title={t("noAttendees") || "Ingen påmeldte ennå"}
          subtitle={t("beTheFirst") || "Bli den første til å melde deg på"}
        />
      )}

      {/* Maybe and Declined counts */}
      {event && (
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 16 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
              {event.attendees.filter(a => a.rsvpStatus === "maybe").length}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("maybe") || "Kanskje"}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
              {event.attendees.filter(a => a.rsvpStatus === "no").length}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("cannotAttend") || "Kan ikke"}
            </Text>
          </View>
          {capacity && capacity.waitlistCount > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                {capacity.waitlistCount}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {t("waitlist") || "Venteliste"}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (eventLoading) {
    return (
      <ScreenContainer>
        <TextSkeleton lines={2} style={{ marginBottom: 16 }} />
        <ListSkeleton count={5} />
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer>
        <EmptyState
          title={t("eventNotFound") || "Arrangement ikke funnet"}
          subtitle={t("eventMayBeDeleted") || "Arrangementet kan være slettet eller du har ikke tilgang"}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 16, padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", flex: 1, color: theme.colors.text }} numberOfLines={1}>
          {event.title}
        </Text>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => {
            Alert.alert(
              t("moreOptions") || "Flere alternativer",
              t("optionsComingSoon") || "Flere alternativer kommer snart"
            );
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Event Header */}
        {renderEventHeader()}

        {/* Tab Navigation */}
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          {[
            { key: "info", label: t("information") || "Informasjon" },
            { key: "coordination", label: t("coordination") || "Koordinering" },
            { key: "attendees", label: t("attendees") || "Deltakere" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                backgroundColor: selectedTab === tab.key ? theme.colors.primary : theme.colors.card,
                borderRadius: theme.radius.md,
                marginHorizontal: 4,
                alignItems: "center",
              }}
            >
              <Text style={{
                color: selectedTab === tab.key ? theme.colors.onPrimary : theme.colors.text,
                fontWeight: "600",
                fontSize: 14,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {selectedTab === "info" && renderInformationTab()}
        {selectedTab === "coordination" && renderCoordinationTab()}
        {selectedTab === "attendees" && renderAttendeesTab()}
      </ScrollView>
    </ScreenContainer>
  );
}