import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Tabs from "../components/Tabs";
import Button from "../components/Button";
import { useTheme } from "../design/theme";
import { ListSkeleton, TextSkeleton } from "../components/SkeletonLoader";
import EmptyState from "../components/EmptyState";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Group, GroupMember, formatGroupType } from "../models/Group";
import type { Event } from "../models/Event";
import { isWithinQuietHours } from "../models/Group";

// Mock services - these would be real Firebase/API calls
const fetchGroupById = async (groupId: string): Promise<Group> => {
  // Mock implementation
  throw new Error("Not implemented");
};

const fetchGroupEvents = async (groupId: string): Promise<Event[]> => {
  // Mock implementation
  return [];
};

const fetchGroupMessages = async (groupId: string): Promise<any[]> => {
  // Mock implementation
  return [];
};

export default function GroupDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const groupId = (route.params as any)?.id;
  const [activeTab, setActiveTab] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // Norwegian tab labels
  const tabs = [
    t("overview") || "Oversikt",
    t("conversations") || "Samtaler", 
    t("events") || "Arrangementer",
    t("members") || "Medlemmer",
    t("practical") || "Praktisk",
  ];

  // Fetch group data
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => fetchGroupById(groupId),
    enabled: !!groupId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["groupEvents", groupId],
    queryFn: () => fetchGroupEvents(groupId),
    enabled: !!groupId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["groupMessages", groupId],
    queryFn: () => fetchGroupMessages(groupId),
    enabled: !!groupId,
  });

  const isQuietTime = React.useMemo(() => isWithinQuietHours(), []);

  const handleRefresh = React.useCallback(async () => {
    if (!groupId) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["group", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["groupEvents", groupId] }),
        queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [groupId, queryClient]);

  const renderOverviewTab = () => (
    <View>
      {/* Group Header */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", flex: 1, color: theme.colors.text }}>
            {group?.name || "Laster..."}
          </Text>
          <View style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: theme.radius.sm,
          }}>
            <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: "600" }}>
              {group?.type ? formatGroupType(group.type) : ""}
            </Text>
          </View>
        </View>

        {group?.description && (
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
            {group.description}
          </Text>
        )}

        {/* School Context */}
        {group?.norwegianSchoolContext && (
          <View style={{ 
            backgroundColor: theme.colors.background,
            padding: 12,
            borderRadius: theme.radius.md,
            marginBottom: 12
          }}>
            <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
              🏫 {group.norwegianSchoolContext.schoolName}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
              {group.norwegianSchoolContext.kommune} • {group.norwegianSchoolContext.schoolYear}
              {group.norwegianSchoolContext.className && ` • Klasse ${group.norwegianSchoolContext.className}`}
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
              {group?.memberCount || 0}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("members") || "Medlemmer"}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
              {events.length}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("events") || "Arrangementer"}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
              {group?.statistics?.activeMembers || 0}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("activeMembers") || "Aktive"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Quiet Hours Notice */}
      {isQuietTime && group?.norwegianSettings?.respectQuietHours && (
        <Card style={{ 
          marginBottom: 16,
          backgroundColor: theme.colors.warningSurface,
          borderColor: theme.colors.warningBorder,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="moon" size={20} color={theme.colors.warning} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.warning }}>
                {t("quietHours") || "Stilletid"}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.warning }}>
                {t("quietHoursMessage") || "Meldinger sendes først kl. 07:00 i respekt for stilletiden"}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Upcoming Events */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
            {t("upcomingEvents") || "Kommende arrangementer"}
          </Text>
          <TouchableOpacity onPress={() => setActiveTab(2)}>
            <Text style={{ color: theme.colors.primary, fontSize: 14 }}>
              {t("seeAll") || "Se alle"}
            </Text>
          </TouchableOpacity>
        </View>

        {eventsLoading ? (
          <TextSkeleton lines={2} />
        ) : events.length > 0 ? (
          events.slice(0, 3).map((event) => (
            <TouchableOpacity
              key={event.id}
              style={{
                flexDirection: "row",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
              onPress={() => navigation.navigate("EventDetail", { id: event.id })}
            >
              <Text style={{ fontSize: 20, marginRight: 12 }}>
                {event.norwegianCulturalContext?.traditionalElement ? "🎉" : "📅"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                  {event.title}
                </Text>
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                  {dayjs(event.startTime).format("DD. MMM • HH:mm")}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic" }}>
            {t("noUpcomingEvents") || "Ingen kommende arrangementer"}
          </Text>
        )}
      </Card>

      {/* Recent Activity */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          {t("recentActivity") || "Nylig aktivitet"}
        </Text>
        {messagesLoading ? (
          <TextSkeleton lines={3} />
        ) : messages.length > 0 ? (
          messages.slice(0, 3).map((message, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 8,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {message.authorName} • {dayjs(message.timestamp).format("DD.MM HH:mm")}
              </Text>
              <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                {message.content}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic" }}>
            {t("noRecentActivity") || "Ingen nylig aktivitet"}
          </Text>
        )}
      </Card>
    </View>
  );

  const renderConversationsTab = () => (
    <View style={{ flex: 1 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
          {t("groupChat") || "Gruppesamtale"}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
          {t("democraticDiscussion") || "Demokratisk diskusjon i norsk ånd"}
        </Text>
      </Card>

      {/* Chat messages would go here */}
      <View style={{ flex: 1 }}>
        {messagesLoading ? (
          <ListSkeleton count={5} />
        ) : messages.length > 0 ? (
          <FlatList
            data={messages}
            keyExtractor={(item, index) => `${item.id || index}`}
            renderItem={({ item }) => (
              <Card style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                    {item.authorName}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    {dayjs(item.timestamp).format("DD.MM HH:mm")}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.text }}>{item.content}</Text>
              </Card>
            )}
          />
        ) : (
          <EmptyState
            title={t("noMessages") || "Ingen meldinger ennå"}
            subtitle={t("startConversation") || "Start en samtale med gruppen"}
          />
        )}
      </View>

      {/* Message input would go here */}
      <View style={{ marginTop: 16 }}>
        <Button
          title={t("sendMessage") || "Send melding"}
          onPress={() => {
            // Handle message sending
            Alert.alert(
              t("notImplemented") || "Ikke implementert",
              t("messagingComingSoon") || "Meldingsfunksjon kommer snart"
            );
          }}
          disabled={isQuietTime && group?.norwegianSettings?.respectQuietHours}
        />
      </View>
    </View>
  );

  const renderEventsTab = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>
          {t("events") || "Arrangementer"}
        </Text>
        <Button
          title={t("createEvent") || "Nytt arrangement"}
          onPress={() => navigation.navigate("CreateEvent", { groupId })}
          variant="outline"
          size="small"
        />
      </View>

      {eventsLoading ? (
        <ListSkeleton count={5} />
      ) : events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("EventDetail", { id: item.id })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 20, marginRight: 12 }}>
                    {item.norwegianCulturalContext?.traditionalElement ? "🎉" : "📅"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                      {dayjs(item.startTime).format("DD. MMMM YYYY • HH:mm")}
                      {item.location?.name && ` • ${item.location.name}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </View>

                {/* Event details */}
                {item.description && (
                  <Text style={{ color: theme.colors.text, marginBottom: 8 }}>
                    {item.description}
                  </Text>
                )}

                {/* RSVP count */}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                    {item.attendees.filter(a => a.rsvpStatus === "yes").length} {t("attending") || "påmeldte"}
                  </Text>
                  {item.weatherBackup?.required && (
                    <Text style={{ fontSize: 14, color: theme.colors.warning }}>
                      ☔ {t("weatherDependent") || "Væravhengig"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </Card>
          )}
        />
      ) : (
        <EmptyState
          title={t("noEvents") || "Ingen arrangementer"}
          subtitle={t("createFirstEvent") || "Opprett det første arrangementet"}
        />
      )}
    </View>
  );

  const renderMembersTab = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>
          {t("members") || "Medlemmer"} ({group?.memberCount || 0})
        </Text>
        <Button
          title={t("inviteMembers") || "Inviter medlemmer"}
          onPress={() => {
            Alert.alert(
              t("notImplemented") || "Ikke implementert",
              t("invitationComingSoon") || "Invitasjonsfunksjon kommer snart"
            );
          }}
          variant="outline"
          size="small"
        />
      </View>

      {groupLoading ? (
        <ListSkeleton count={5} />
      ) : group?.members && group.members.length > 0 ? (
        <FlatList
          data={group.members}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                    {item.role === "admin" && (t("admin") || "Administrator")}
                    {item.role === "moderator" && (t("moderator") || "Moderator")}
                    {item.role === "member" && (t("member") || "Medlem")}
                    {item.role === "observer" && (t("observer") || "Observatør")}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    {t("joinedOn") || "Ble med"} {dayjs(item.joinedAt).format("DD.MM.YYYY")}
                  </Text>
                </View>
                
                {/* Norwegian context indicators */}
                <View style={{ alignItems: "flex-end" }}>
                  {item.norwegianContext.childrenInGroup.length > 0 && (
                    <Text style={{ fontSize: 12, color: theme.colors.primary }}>
                      👨‍👩‍👧‍👦 {item.norwegianContext.childrenInGroup.length}
                    </Text>
                  )}
                  {item.norwegianContext.quietHoursRespect && (
                    <Text style={{ fontSize: 12, color: theme.colors.success }}>
                      🌙 {t("respectsQuietHours") || "Respekterer stilletid"}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          )}
        />
      ) : (
        <EmptyState
          title={t("noMembers") || "Ingen medlemmer"}
          subtitle={t("inviteFirstMembers") || "Inviter de første medlemmene"}
        />
      )}
    </View>
  );

  const renderPracticalTab = () => (
    <ScrollView>
      {/* Dugnad Coordination */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🧹 {t("dugnadCoordination") || "Dugnad koordinering"}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
          {t("dugnadDescription") || "Organiser fellesjobb i norsk tradisjon"}
        </Text>
        <Button
          title={t("organizeDugnad") || "Organiser dugnad"}
          onPress={() => {
            Alert.alert(
              t("notImplemented") || "Ikke implementert", 
              t("dugnadComingSoon") || "Dugnad-organisering kommer snart"
            );
          }}
          variant="outline"
        />
      </Card>

      {/* Resource Sharing */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🤝 {t("resourceSharing") || "Ressursdeling"}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
          {t("shareAndBorrow") || "Del og lån ting med andre foreldre"}
        </Text>
        <Button
          title={t("viewMarketplace") || "Se markedsplass"}
          onPress={() => {
            Alert.alert(
              t("notImplemented") || "Ikke implementert",
              t("marketplaceComingSoon") || "Markedsplass kommer snart"
            );
          }}
          variant="outline"
        />
      </Card>

      {/* Democratic Decisions */}
      {group?.norwegianSettings?.democraticDecisions && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🗳️ {t("democraticDecisions") || "Demokratiske avgjørelser"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
            {t("norwegianConsensus") || "Avgjørelser tas i fellesskap, norsk tradisjon"}
          </Text>
          <Button
            title={t("proposeDecision") || "Foreslå avgjørelse"}
            onPress={() => {
              Alert.alert(
                t("notImplemented") || "Ikke implementert",
                t("votingComingSoon") || "Avstemning kommer snart"
              );
            }}
            variant="outline"
          />
        </Card>
      )}

      {/* Group Settings */}
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          ⚙️ {t("groupSettings") || "Gruppeinnstillinger"}
        </Text>
        
        {/* Language */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
            {t("language") || "Språk"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {group?.norwegianSettings?.primaryLanguage === "norwegian" ? "Norsk" : "English"}
          </Text>
        </View>

        {/* Privacy Level */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
            {t("privacyLevel") || "Personvernnivå"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>
            {group?.privacyLevel === "public" && (t("publicGroup") || "Offentlig gruppe")}
            {group?.privacyLevel === "school_only" && (t("schoolOnly") || "Kun skole")}
            {group?.privacyLevel === "grade_only" && (t("gradeOnly") || "Kun trinn")}
            {group?.privacyLevel === "invite_only" && (t("inviteOnly") || "Kun invitasjon")}
            {group?.privacyLevel === "private" && (t("private") || "Privat")}
          </Text>
        </View>

        {/* Norwegian Cultural Settings */}
        <View>
          <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            {t("norwegianFeatures") || "Norske funksjoner"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {group?.norwegianSettings?.respectQuietHours && (
              <View style={{
                backgroundColor: theme.colors.successSurface,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: theme.radius.sm,
              }}>
                <Text style={{ fontSize: 12, color: theme.colors.success }}>
                  🌙 {t("quietHours") || "Stilletid"}
                </Text>
              </View>
            )}
            {group?.norwegianSettings?.includeNorwegianHolidays && (
              <View style={{
                backgroundColor: theme.colors.accentCoral + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: theme.radius.sm,
              }}>
                <Text style={{ fontSize: 12, color: theme.colors.accentCoral }}>
                  🇳🇴 {t("norwegianHolidays") || "Norske høytider"}
                </Text>
              </View>
            )}
            {group?.norwegianSettings?.lagomPrinciple && (
              <View style={{
                backgroundColor: theme.colors.accentMint + "20",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: theme.radius.sm,
              }}>
                <Text style={{ fontSize: 12, color: theme.colors.accentMint }}>
                  ⚖️ {t("lagom") || "Lagom"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return renderOverviewTab();
      case 1: return renderConversationsTab();
      case 2: return renderEventsTab();
      case 3: return renderMembersTab();
      case 4: return renderPracticalTab();
      default: return renderOverviewTab();
    }
  };

  if (groupLoading) {
    return (
      <ScreenContainer>
        <TextSkeleton lines={1} style={{ marginBottom: 16 }} />
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 16 }}
        />
        <ListSkeleton count={5} />
      </ScreenContainer>
    );
  }

  if (!group) {
    return (
      <ScreenContainer>
        <EmptyState
          title={t("groupNotFound") || "Gruppe ikke funnet"}
          subtitle={t("groupMayBeDeleted") || "Gruppen kan være slettet eller du har ikke tilgang"}
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
        <Text style={{ fontSize: 20, fontWeight: "700", flex: 1, color: theme.colors.text }}>
          {group.name}
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

      {/* Tab Navigation */}
      <Tabs
        items={tabs}
        value={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
      />

      {/* Tab Content */}
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
        {renderTabContent()}
      </ScrollView>
    </ScreenContainer>
  );
}