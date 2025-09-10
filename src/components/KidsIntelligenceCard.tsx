import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { useTheme } from "../design/theme";
import { useNorwegianTheme } from "../design/SeasonalThemeProvider";
import Card from "./Card";
import { KidsIntelligenceData, ScheduleAnomaly, CoordinationNeed } from "../services/kidsIntelligence";

interface KidsIntelligenceCardProps {
  intelligenceData: KidsIntelligenceData;
  onCoordinate?: (coordinationNeed: CoordinationNeed) => void;
  onViewDetails?: (childId: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function KidsIntelligenceCard({ 
  intelligenceData, 
  onCoordinate,
  onViewDetails,
  variant = 'default' 
}: KidsIntelligenceCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const norwegianTheme = useNorwegianTheme();
  
  const { child, todaysSummary, weekAhead, suggestions, anomalies, norwegianContext } = intelligenceData;
  
  // Get AI confidence indicator based on data completeness
  const getAIConfidence = (): 'high' | 'medium' | 'low' => {
    const completeness = (
      (todaysSummary.schoolSchedule.length > 0 ? 1 : 0) +
      (anomalies.length > 0 ? 1 : 0) +
      (todaysSummary.coordinationTips.length > 0 ? 1 : 0) +
      (suggestions.carpoolOpportunities.length > 0 ? 1 : 0)
    ) / 4;
    
    if (completeness > 0.7) return 'high';
    if (completeness > 0.4) return 'medium';
    return 'low';
  };
  
  const aiConfidence = getAIConfidence();
  
  // Get seasonal context icon
  const getSeasonalIcon = () => {
    switch (norwegianContext.currentSeason) {
      case 'winter': return 'snow';
      case 'spring': return 'flower';
      case 'summer': return 'sunny';
      case 'autumn': return 'leaf';
      default: return 'calendar';
    }
  };
  
  // Get urgency level for anomalies
  const getUrgencyColor = (anomaly: ScheduleAnomaly) => {
    switch (anomaly.impact) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return norwegianTheme.norwegianColors.seasonal.springGreen;
      default: return theme.colors.primary;
    }
  };

  if (variant === 'compact') {
    return (
      <Card style={{ marginBottom: 12, padding: 16 }}>
        {/* Compact Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: norwegianTheme.norwegianColors.fjordBlue[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12 
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: norwegianTheme.norwegianColors.fjordBlue[600] }}>
                {child.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                {child.displayName}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {norwegianContext.schoolType === 'grunnskole' ? `${child.currentGrade}. klasse` : norwegianContext.schoolType}
              </Text>
            </View>
          </View>
          
          {/* AI Confidence & Seasonal Indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons 
              name={getSeasonalIcon()} 
              size={16} 
              color={norwegianTheme.norwegianColors.seasonal.summerSun} 
              style={{ marginRight: 8 }}
            />
            <View style={{ 
              width: 8, 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: aiConfidence === 'high' ? theme.colors.success : 
                             aiConfidence === 'medium' ? theme.colors.warning : theme.colors.error 
            }} />
          </View>
        </View>
        
        {/* Anomalies Summary */}
        {anomalies.length > 0 && (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
            <Text style={{ marginLeft: 6, fontSize: 12, color: theme.colors.textSecondary }}>
              {anomalies.length} endring{anomalies.length !== 1 ? 'er' : ''} i planen
            </Text>
          </View>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      {/* Intelligence Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Child Avatar */}
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            backgroundColor: norwegianTheme.norwegianColors.fjordBlue[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12 
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '600', 
              color: norwegianTheme.norwegianColors.fjordBlue[600] 
            }}>
              {child.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
              {child.displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {norwegianContext.schoolType === 'grunnskole' ? `${child.currentGrade}. klasse` : norwegianContext.schoolType}
              </Text>
              {child.school?.name && (
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                  {' • '}{child.school.name}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Seasonal Context & AI Confidence */}
        <View style={{ alignItems: 'center' }}>
          <Ionicons 
            name={getSeasonalIcon()} 
            size={20} 
            color={norwegianTheme.norwegianColors.seasonal.summerSun} 
          />
          <Text style={{ fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 }}>
            AI: {aiConfidence}
          </Text>
        </View>
      </View>

      {/* Tomorrow's Preview */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: theme.colors.text,
          marginBottom: 8 
        }}>
          I morgen
        </Text>
        
        {/* Schedule Anomalies */}
        {anomalies.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {anomalies.slice(0, 2).map((anomaly) => (
              <View 
                key={anomaly.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: getUrgencyColor(anomaly) + '10',
                  padding: 8,
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <Ionicons 
                  name="alert-circle" 
                  size={16} 
                  color={getUrgencyColor(anomaly)} 
                  style={{ marginRight: 8 }}
                />
                <Text style={{ 
                  flex: 1,
                  fontSize: 12, 
                  color: theme.colors.text,
                  fontWeight: '500' 
                }}>
                  {anomaly.description}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Schedule Preview */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {todaysSummary.schoolSchedule.map((slot) => (
            <View 
              key={slot.id}
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginRight: 8,
                minWidth: 100,
              }}
            >
              <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '600' }}>
                {slot.startTime}-{slot.endTime}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text, marginTop: 2 }}>
                {slot.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* AI Coordination Tips */}
      {todaysSummary.coordinationTips.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: theme.colors.text,
            marginBottom: 6 
          }}>
            🤖 AI Tips
          </Text>
          
          {todaysSummary.coordinationTips.slice(0, 2).map((tip, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
              <Text style={{ color: norwegianTheme.norwegianColors.fjordBlue[400], marginRight: 6 }}>
                •
              </Text>
              <Text style={{ 
                flex: 1,
                fontSize: 12, 
                color: theme.colors.text,
                lineHeight: 16
              }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Weather Context */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: norwegianTheme.norwegianColors.seasonal.winterBlue + '20',
        padding: 8,
        borderRadius: 6,
        marginBottom: 12,
      }}>
        <Ionicons 
          name="cloudy" 
          size={16} 
          color={norwegianTheme.norwegianColors.fjordBlue[400]} 
          style={{ marginRight: 8 }}
        />
        <Text style={{ 
          flex: 1,
          fontSize: 12, 
          color: theme.colors.text,
          fontStyle: 'italic'
        }}>
          {todaysSummary.weatherContext}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: norwegianTheme.norwegianColors.fjordBlue[50],
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
            marginRight: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => onViewDetails?.(child.id)}
        >
          <Ionicons 
            name="calendar" 
            size={16} 
            color={norwegianTheme.norwegianColors.fjordBlue[600]} 
            style={{ marginRight: 6 }}
          />
          <Text style={{ 
            fontSize: 12, 
            fontWeight: '500',
            color: norwegianTheme.norwegianColors.fjordBlue[600] 
          }}>
            Detaljer
          </Text>
        </TouchableOpacity>
        
        {weekAhead.familyCoordinationNeeds.length > 0 && (
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: norwegianTheme.norwegianColors.seasonal.springGreen + '40',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => onCoordinate?.(weekAhead.familyCoordinationNeeds[0])}
          >
            <Ionicons 
              name="people" 
              size={16} 
              color={theme.colors.success} 
              style={{ marginRight: 6 }}
            />
            <Text style={{ 
              fontSize: 12, 
              fontWeight: '500',
              color: theme.colors.success 
            }}>
              Koordiner
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}