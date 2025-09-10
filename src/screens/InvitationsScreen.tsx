/**
 * InvitationsScreen
 * 
 * Screen for managing pending group and event invitations with Norwegian cultural context.
 * Features categorized invites, rich previews, cultural awareness, and smart filtering.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useNorwegianTheme, useNorwegianGreeting, useSchoolContext } from "../design/SeasonalThemeProvider";
import { auth } from "../firebase";
import Card from "../components/Card";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import ScreenContainer from "../components/ScreenContainer";
import { 
  formatNorwegianDate, 
  formatNorwegianTime,
  getCulturalContext,
  getNorwegianInvitationEtiquette,
  isQuietHours
} from "../utils/norwegianUtils";

// Mock types - in real implementation these would come from models
interface Invitation {
  id: string;
  type: 'group' | 'event';
  title: string;
  description?: string;
  from: {
    name: string;
    role?: 'parent' | 'teacher' | 'admin' | 'neighbor';
  };
  groupType?: 'school_class' | 'sfo_group' | 'aks_group' | 'hobby_group' | 'neighborhood';
  eventType?: 'school_event' | 'birthday' | 'activity' | 'meeting' | 'cultural';
  scheduledFor?: Date;
  deadline?: Date;
  location?: string;
  schoolContext?: {
    grade?: string;
    teacher?: string;
    schoolName?: string;
  };
  culturalContext?: {
    isTraditional?: boolean;
    isHoliday?: boolean;
    requiresDressCode?: boolean;
  };
  urgency: 'low' | 'medium' | 'high';
  createdAt: Date;
  metadata?: {
    participantCount?: number;
    childrenExpected?: boolean;
    foodProvided?: boolean;
    costInvolved?: boolean;
  };
}

type InviteCategory = 'all' | 'groups' | 'events' | 'urgent' | 'school';

export default function InvitationsScreen() {
  const theme = useTheme();
  const norwegianTheme = useNorwegianTheme();
  const { greeting, shouldShowQuietHours } = useNorwegianGreeting();
  const { isSchoolHours, shouldShowSchoolNote } = useSchoolContext();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = auth.currentUser;

  const [activeCategory, setActiveCategory] = useState<InviteCategory>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - in real implementation this would come from a service
  const mockInvitations: Invitation[] = [
    {
      id: '1',
      type: 'group',
      title: 'Klasse 3A Foreldregruppe',
      description: 'Bli med i foreldregruppen for klasse 3A på Bjørndal skole',
      from: { name: 'Anne Hansen', role: 'parent' },
      groupType: 'school_class',
      schoolContext: {
        grade: '3A',
        teacher: 'Kari Olsen',
        schoolName: 'Bjørndal skole'
      },
      urgency: 'medium',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      metadata: {
        participantCount: 15,
        childrenExpected: false,
      }
    },
    {
      id: '2',
      type: 'event',
      title: 'Leos bursdagsfest',
      description: '8-års bursdag med kaker og aktiviteter i hagen',
      from: { name: 'Maria Eriksen', role: 'parent' },
      eventType: 'birthday',
      scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      location: 'Storgata 12, Oslo',
      urgency: 'high',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      metadata: {
        participantCount: 8,
        childrenExpected: true,
        foodProvided: true,
      }
    },
    {
      id: '3',
      type: 'group',
      title: 'SFO Gruppe Regnbueland',
      description: 'Aktivitetsgruppe for barn i 1.-4. klasse',
      from: { name: 'Tom Andreassen', role: 'teacher' },
      groupType: 'sfo_group',
      schoolContext: {
        schoolName: 'Regnbueland barneskole'
      },
      urgency: 'low',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      metadata: {
        participantCount: 20,
        childrenExpected: true,
      }
    },
  ];

  // Fetch invitations (mock implementation)
  const { data: invitations = mockInvitations, isLoading, refetch } = useQuery({
    queryKey: ['invitations', user?.uid],
    queryFn: () => Promise.resolve(mockInvitations),
    enabled: !!user,
  });

  // Filter invitations by category
  const filteredInvitations = React.useMemo(() => {
    let filtered = invitations;

    switch (activeCategory) {
      case 'groups':
        filtered = filtered.filter(inv => inv.type === 'group');
        break;
      case 'events':
        filtered = filtered.filter(inv => inv.type === 'event');
        break;
      case 'urgent':
        filtered = filtered.filter(inv => inv.urgency === 'high' || 
          (inv.deadline && inv.deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000));
        break;
      case 'school':
        filtered = filtered.filter(inv => 
          inv.groupType?.includes('school') || 
          inv.groupType?.includes('sfo') || 
          inv.groupType?.includes('aks') ||
          inv.eventType === 'school_event'
        );
        break;
    }

    return filtered.sort((a, b) => {
      // Sort by urgency, then by deadline
      if (a.urgency === 'high' && b.urgency !== 'high') return -1;
      if (b.urgency === 'high' && a.urgency !== 'high') return 1;
      
      const aDeadline = a.deadline?.getTime() || Infinity;
      const bDeadline = b.deadline?.getTime() || Infinity;
      return aDeadline - bDeadline;
    });
  }, [invitations, activeCategory]);

  // Handle invitation response
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ invitationId, response }: { invitationId: string; response: 'accept' | 'decline' }) => {
      // Mock implementation - in real app this would call a service
      return { invitationId, response };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', user?.uid] });
      
      const invitation = invitations.find(inv => inv.id === data.invitationId);
      const etiquette = getNorwegianInvitationEtiquette({
        isFamily: invitation?.from.role === 'parent',
        isSchool: !!invitation?.schoolContext,
        urgency: invitation?.urgency || 'medium',
        timeUntilEvent: invitation?.scheduledFor 
          ? (invitation.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60) 
          : 0,
      });

      Alert.alert(
        data.response === 'accept' ? 'Invitasjon akseptert' : 'Invitasjon avslått',
        data.response === 'accept' 
          ? 'Du har takket ja til invitasjonen. Arrangøren vil få beskjed.'
          : 'Du har takket nei til invitasjonen. Takk for raskt svar.',
      );
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleInvitationResponse = (invitationId: string, response: 'accept' | 'decline') => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation) return;

    // Check for cultural considerations
    const cultural = getCulturalContext();
    const etiquette = getNorwegianInvitationEtiquette({
      isFamily: invitation.from.role === 'parent',
      isSchool: !!invitation.schoolContext,
      urgency: invitation.urgency,
      timeUntilEvent: invitation.scheduledFor 
        ? (invitation.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60) 
        : 0,
    });

    // Show appropriate confirmation based on Norwegian etiquette
    const confirmationMessage = response === 'accept' 
      ? etiquette.patterns.accept[0]
      : etiquette.patterns.decline[0];

    Alert.alert(
      response === 'accept' ? 'Bekreft deltakelse' : 'Bekreft avslag',
      `${confirmationMessage}\n\n${etiquette.culturalNote}`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { 
          text: response === 'accept' ? 'Ja, delta' : 'Nei, ikke delta', 
          onPress: () => respondToInvitationMutation.mutate({ invitationId, response })
        },
      ]
    );
  };

  const renderInvitationCard = (invitation: Invitation) => {
    const cultural = getCulturalContext();
    const isUrgent = invitation.urgency === 'high' || 
      (invitation.deadline && invitation.deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000);

    return (
      <Card key={invitation.id} style={[styles.invitationCard, isUrgent && styles.urgentCard]}>
        {/* Header with type and urgency */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeChip, { backgroundColor: norwegianTheme.resolveSeasonalColor('fjordBlue.100') }]}>
            <Ionicons 
              name={invitation.type === 'group' ? 'people' : 'calendar'} 
              size={14} 
              color={norwegianTheme.resolveSeasonalColor('fjordBlue.600')}
            />
            <Text style={[styles.typeText, { color: norwegianTheme.resolveSeasonalColor('fjordBlue.600') }]}>
              {invitation.type === 'group' ? 'Gruppe' : 'Arrangement'}
            </Text>
          </View>
          
          {isUrgent && (
            <View style={[styles.urgentChip, { backgroundColor: theme.colors.error + '20' }]}>
              <Ionicons name="time" size={12} color={theme.colors.error} />
              <Text style={[styles.urgentText, { color: theme.colors.error }]}>Haster</Text>
            </View>
          )}
        </View>

        {/* Title and description */}
        <Text style={[styles.invitationTitle, { color: theme.colors.text }]}>
          {invitation.title}
        </Text>
        
        {invitation.description && (
          <Text style={[styles.invitationDescription, { color: theme.colors.textSecondary }]}>
            {invitation.description}
          </Text>
        )}

        {/* From and context */}
        <View style={styles.contextSection}>
          <Text style={[styles.fromText, { color: theme.colors.textSecondary }]}>
            Fra: {invitation.from.name}
            {invitation.from.role === 'teacher' && ' (Lærer)'}
            {invitation.from.role === 'admin' && ' (Administrator)'}
          </Text>

          {invitation.schoolContext && (
            <Text style={[styles.schoolContext, { color: norwegianTheme.resolveSeasonalColor('school.schoolRed.600') }]}>
              {invitation.schoolContext.schoolName}
              {invitation.schoolContext.grade && ` - Klasse ${invitation.schoolContext.grade}`}
              {invitation.schoolContext.teacher && ` - ${invitation.schoolContext.teacher}`}
            </Text>
          )}
        </View>

        {/* Event details */}
        {invitation.scheduledFor && (
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                {formatNorwegianDate(invitation.scheduledFor, 'long')} kl. {formatNorwegianTime(invitation.scheduledFor)}
              </Text>
            </View>
            
            {invitation.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {invitation.location}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Metadata */}
        {invitation.metadata && (
          <View style={styles.metadataSection}>
            {invitation.metadata.participantCount && (
              <View style={styles.metadataChip}>
                <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
                  {invitation.metadata.participantCount} deltakere
                </Text>
              </View>
            )}
            
            {invitation.metadata.childrenExpected && (
              <View style={styles.metadataChip}>
                <Ionicons name="happy-outline" size={14} color={norwegianTheme.resolveSeasonalColor('auroraGreen.600')} />
                <Text style={[styles.metadataText, { color: norwegianTheme.resolveSeasonalColor('auroraGreen.600') }]}>
                  Barn velkommen
                </Text>
              </View>
            )}

            {invitation.metadata.foodProvided && (
              <View style={styles.metadataChip}>
                <Ionicons name="restaurant-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
                  Mat inkludert
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Deadline */}
        {invitation.deadline && (
          <Text style={[styles.deadlineText, { color: isUrgent ? theme.colors.error : theme.colors.textSecondary }]}>
            Svar innen: {formatNorwegianDate(invitation.deadline, 'medium')} kl. {formatNorwegianTime(invitation.deadline)}
          </Text>
        )}

        {/* Cultural note for quiet hours */}
        {shouldShowQuietHours && cultural.timeContext.isQuietHours && (
          <View style={[styles.culturalNote, { backgroundColor: theme.colors.warning + '10' }]}>
            <Ionicons name="moon-outline" size={16} color={theme.colors.warning} />
            <Text style={[styles.culturalNoteText, { color: theme.colors.warning }]}>
              Stille timer (20:00-07:00) - svar kan vente til i morgen
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Takk nei"
            variant="outline"
            onPress={() => handleInvitationResponse(invitation.id, 'decline')}
            style={styles.declineButton}
            iconLeft={<Ionicons name="close" size={16} color={theme.colors.textSecondary} />}
          />
          
          <Button
            title="Takk ja"
            variant="primary"
            onPress={() => handleInvitationResponse(invitation.id, 'accept')}
            style={styles.acceptButton}
            iconLeft={<Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
          />
        </View>
      </Card>
    );
  };

  const renderCategoryButton = (category: InviteCategory, label: string, icon: string, count?: number) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        {
          backgroundColor: activeCategory === category 
            ? norwegianTheme.resolveSeasonalColor('fjordBlue.100')
            : 'transparent',
          borderColor: activeCategory === category 
            ? norwegianTheme.resolveSeasonalColor('fjordBlue.300')
            : theme.colors.border,
        }
      ]}
      onPress={() => setActiveCategory(category)}
    >
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={activeCategory === category 
          ? norwegianTheme.resolveSeasonalColor('fjordBlue.600')
          : theme.colors.textSecondary
        } 
      />
      <Text style={[
        styles.categoryButtonText,
        {
          color: activeCategory === category 
            ? norwegianTheme.resolveSeasonalColor('fjordBlue.600')
            : theme.colors.textSecondary
        }
      ]}>
        {label}
        {count !== undefined && count > 0 && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const categoryCounts = React.useMemo(() => {
    const counts = {
      all: invitations.length,
      groups: invitations.filter(inv => inv.type === 'group').length,
      events: invitations.filter(inv => inv.type === 'event').length,
      urgent: invitations.filter(inv => inv.urgency === 'high' || 
        (inv.deadline && inv.deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000)).length,
      school: invitations.filter(inv => 
        inv.groupType?.includes('school') || 
        inv.groupType?.includes('sfo') || 
        inv.groupType?.includes('aks') ||
        inv.eventType === 'school_event').length,
    };
    return counts;
  }, [invitations]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>Laster invitasjoner...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header with greeting */}
      <View style={styles.header}>
        <Text style={[styles.greetingText, { color: theme.colors.text }]}>
          {greeting}
        </Text>
        <Text style={[styles.subheaderText, { color: theme.colors.textSecondary }]}>
          Du har {invitations.length} ventende invitasjon{invitations.length !== 1 ? 'er' : ''}
        </Text>
      </View>

      {/* Category filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {renderCategoryButton('all', 'Alle', 'list', categoryCounts.all)}
        {renderCategoryButton('urgent', 'Haster', 'time', categoryCounts.urgent)}
        {renderCategoryButton('school', 'Skole', 'school', categoryCounts.school)}
        {renderCategoryButton('groups', 'Grupper', 'people', categoryCounts.groups)}
        {renderCategoryButton('events', 'Arrangementer', 'calendar', categoryCounts.events)}
      </ScrollView>

      {/* Invitations list */}
      <ScrollView
        style={styles.invitationsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredInvitations.length === 0 ? (
          <EmptyState
            title="Ingen invitasjoner"
            description={
              activeCategory === 'all' 
                ? "Du har ingen ventende invitasjoner akkurat nå."
                : `Ingen invitasjoner i kategorien "${activeCategory}".`
            }
            icon="mail-outline"
          />
        ) : (
          filteredInvitations.map(renderInvitationCard)
        )}
        
        {/* Bottom spacing */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  subheaderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  invitationsList: {
    flex: 1,
    padding: 16,
  },
  invitationCard: {
    marginBottom: 16,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  urgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invitationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  invitationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  contextSection: {
    marginBottom: 12,
  },
  fromText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  schoolContext: {
    fontSize: 13,
    fontWeight: '600',
  },
  eventDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  metadataSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metadataChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  culturalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  culturalNoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});