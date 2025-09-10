import React, { useState, useEffect } from "react";
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../design/theme";
import { useNorwegianTheme } from "../design/SeasonalThemeProvider";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listChildren, type Child } from "../services/children";
import { kidsIntelligenceService, KidsIntelligenceData, CoordinationNeed } from "../services/kidsIntelligence";

import ScreenContainer from "../components/ScreenContainer";
import KidsIntelligenceCard from "../components/KidsIntelligenceCard";
import Button from "../components/Button";
import Card from "../components/Card";

interface KidsScreenState {
  children: Child[];
  intelligenceData: KidsIntelligenceData[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

export default function AIKidsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const norwegianTheme = useNorwegianTheme();
  const { householdId } = useHousehold();
  
  const [state, setState] = useState<KidsScreenState>({
    children: [],
    intelligenceData: [],
    loading: true,
    refreshing: false,
    error: null,
  });

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Load children and generate AI intelligence
  const loadKidsIntelligence = async (isRefresh = false) => {
    if (!householdId) return;

    try {
      setState(prev => ({ 
        ...prev, 
        loading: !isRefresh, 
        refreshing: isRefresh, 
        error: null 
      }));

      // Load children from household
      const children = await listChildren(householdId);
      
      // Generate AI intelligence for each child
      const intelligenceData = await kidsIntelligenceService.generateFamilyIntelligence(children);

      setState(prev => ({
        ...prev,
        children,
        intelligenceData,
        loading: false,
        refreshing: false,
      }));
    } catch (error) {
      console.error('Error loading kids intelligence:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: 'Kunne ikke laste barn-data',
      }));
    }
  };

  // Initialize data on mount
  useEffect(() => {
    loadKidsIntelligence();
  }, [householdId]);

  // Handle coordination needs
  const handleCoordination = (coordinationNeed: CoordinationNeed) => {
    Alert.alert(
      'Koordinering',
      `${coordinationNeed.description}\n\nVil du opprette en koordineringsgruppe?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { 
          text: 'Opprett gruppe', 
          onPress: () => {
            // TODO: Navigate to group creation with pre-filled coordination data
            console.log('Create coordination group:', coordinationNeed);
          }
        },
      ]
    );
  };

  // Handle viewing child details
  const handleViewDetails = (childId: string) => {
    const childData = state.intelligenceData.find(data => data.childId === childId);
    if (childData) {
      // TODO: Navigate to detailed child intelligence view
      console.log('View child details:', childData);
    }
  };

  // Render child selector for switching between kids
  const renderChildSelector = () => {
    if (state.children.length <= 1) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {/* All Kids option */}
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginRight: 8,
              borderRadius: 20,
              backgroundColor: selectedChildId === null ? 
                theme.colors.primary : 
                theme.colors.surfaceVariant,
              borderWidth: 1,
              borderColor: selectedChildId === null ? 
                theme.colors.primary : 
                theme.colors.outline,
            }}
            onPress={() => setSelectedChildId(null)}
          >
            <Text style={{
              color: selectedChildId === null ? 
                theme.colors.onPrimary : 
                theme.colors.onSurface,
              fontWeight: selectedChildId === null ? '600' : '400',
              fontSize: 14,
            }}>
              Alle barn
            </Text>
          </TouchableOpacity>

          {/* Individual child options */}
          {state.children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 8,
                borderRadius: 20,
                backgroundColor: selectedChildId === child.id ? 
                  theme.colors.primary : 
                  theme.colors.surfaceVariant,
                borderWidth: 1,
                borderColor: selectedChildId === child.id ? 
                  theme.colors.primary : 
                  theme.colors.outline,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => setSelectedChildId(child.id)}
            >
              {child.emoji && (
                <Text style={{ fontSize: 16, marginRight: 6 }}>
                  {child.emoji}
                </Text>
              )}
              <Text style={{
                color: selectedChildId === child.id ? 
                  theme.colors.onPrimary : 
                  theme.colors.onSurface,
                fontWeight: selectedChildId === child.id ? '600' : '400',
                fontSize: 14,
              }}>
                {child.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Generate family coordination insights
  const getFamilyCoordinationInsights = () => {
    if (state.intelligenceData.length === 0) return null;

    const allAnomalies = state.intelligenceData.flatMap(data => data.anomalies);
    const allCoordinationNeeds = state.intelligenceData.flatMap(data => data.weekAhead.familyCoordinationNeeds);
    const allSuggestions = state.intelligenceData.flatMap(data => data.suggestions.carpoolOpportunities);

    return {
      totalAnomalies: allAnomalies.length,
      highPriorityAnomalies: allAnomalies.filter(a => a.impact === 'high').length,
      coordinationOpportunities: allCoordinationNeeds.length,
      carpoolSuggestions: allSuggestions.length,
    };
  };

  const familyInsights = getFamilyCoordinationInsights();

  // Render AI intelligence card for each child
  const renderIntelligenceCard = ({ item }: { item: KidsIntelligenceData }) => (
    <KidsIntelligenceCard
      key={item.childId}
      intelligenceData={item}
      onCoordinate={handleCoordination}
      onViewDetails={handleViewDetails}
      variant="default"
    />
  );

  // Render family coordination summary
  const renderFamilyInsights = () => {
    if (!familyInsights || state.intelligenceData.length === 0) return null;

    return (
      <Card style={{ marginBottom: 16, padding: 16 }}>
        {/* Norwegian Greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons 
            name={norwegianTheme.season === 'winter' ? 'snow' : 
                  norwegianTheme.season === 'summer' ? 'sunny' : 
                  norwegianTheme.season === 'spring' ? 'flower' : 'leaf'} 
            size={20} 
            color={norwegianTheme.norwegianColors.seasonal.summerSun}
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
            {norwegianTheme.helpers.getSeasonalGreeting()}
          </Text>
        </View>

        {/* Family Intelligence Summary */}
        <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 }}>
          AI-oversikt for {state.children.length} barn
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* Anomalies */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: familyInsights.highPriorityAnomalies > 0 ? theme.colors.error + '20' : theme.colors.success + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: familyInsights.highPriorityAnomalies > 0 ? theme.colors.error : theme.colors.success
              }}>
                {familyInsights.totalAnomalies}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' }}>
              Endringer
            </Text>
          </View>

          {/* Coordination */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: theme.colors.primary
              }}>
                {familyInsights.coordinationOpportunities}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' }}>
              Koordinering
            </Text>
          </View>

          {/* Carpool */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: norwegianTheme.norwegianColors.seasonal.springGreen + '40',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600',
                color: theme.colors.success
              }}>
                {familyInsights.carpoolSuggestions}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary, textAlign: 'center' }}>
              Kjøring
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <Card style={{ padding: 24, alignItems: 'center' }}>
      <Ionicons 
        name="people-circle" 
        size={64} 
        color={theme.colors.textSecondary} 
        style={{ marginBottom: 16 }}
      />
      <Text style={{ 
        fontSize: 18, 
        fontWeight: '600', 
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8
      }}>
        Ingen barn registrert
      </Text>
      <Text style={{ 
        fontSize: 14, 
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20
      }}>
        Legg til barn for å få AI-drevet koordinering og planlegging
      </Text>
      <Button
        title="Legg til barn"
        onPress={() => {
          // TODO: Navigate to add child flow
          Alert.alert('Info', 'Legg til barn funksjonalitet kommer snart!');
        }}
      />
    </Card>
  );

  // Render error state
  const renderErrorState = () => (
    <Card style={{ padding: 24, alignItems: 'center' }}>
      <Ionicons 
        name="warning" 
        size={48} 
        color={theme.colors.error} 
        style={{ marginBottom: 16 }}
      />
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '600', 
        color: theme.colors.error,
        textAlign: 'center',
        marginBottom: 8
      }}>
        {state.error}
      </Text>
      <Button
        title="Prøv igjen"
        onPress={() => loadKidsIntelligence()}
        variant="outline"
      />
    </Card>
  );

  if (state.loading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons 
            name="people" 
            size={48} 
            color={theme.colors.primary} 
            style={{ marginBottom: 16 }}
          />
          <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
            Henter AI-intelligence...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={selectedChildId ? 
          state.intelligenceData.filter(data => data.childId === selectedChildId) : 
          state.intelligenceData
        }
        renderItem={renderIntelligenceCard}
        keyExtractor={(item) => item.childId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => loadKidsIntelligence(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            {renderChildSelector()}
            {renderFamilyInsights()}
            {state.error && renderErrorState()}
          </View>
        )}
        ListEmptyComponent={!state.error ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button for Quick Actions */}
      {state.intelligenceData.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
          onPress={() => {
            Alert.alert(
              'Hurtighandlinger',
              'Velg handling:',
              [
                { text: 'Koordiner transport', onPress: () => console.log('Coordinate transport') },
                { text: 'Opprett familie-arrangement', onPress: () => console.log('Create family event') },
                { text: 'Del ressurser', onPress: () => console.log('Share resources') },
                { text: 'Avbryt', style: 'cancel' },
              ]
            );
          }}
        >
          <Ionicons name="add" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}