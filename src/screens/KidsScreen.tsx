import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TextSkeleton } from "../components/SkeletonLoader";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import {
  listChildren,
  addChild,
  renameChild,
  deleteChild,
  type Child,
} from "../services/children";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import AddEditChildModal from "../components/AddEditChildModal";
import ChildDetailDrawer from "../components/ChildDetailDrawer";
import { appEvents } from "../events";
import Tabs from "../components/Tabs";
import { kidsIntelligenceService } from "../services/kidsIntelligence";
import { subscribeToTodaysAppointments, getTodaysAppointments, getUpcomingAppointments } from "../services/appointments";
import { Appointment } from "../models/Appointment";
import AppointmentCreationModal from "../components/appointments/AppointmentCreationModal";
import AppointmentCard from "../components/appointments/AppointmentCard";

// Get current Norwegian season
const getCurrentNorwegianSeason = () => {
  const month = new Date().getMonth();
  if (month >= 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'autumn';
};

// Generate content for non-school kids based on expert planning
const generateNonSchoolContent = (child: Child, season: string, t: any) => {
  const age = child.age || 4;
  const content = {
    earlyYearsActivities: [],
    seasonalActivities: [],
    culturalLearning: [],
    developmentTasks: [],
    weatherActivities: []
  };

  // Early Years Intelligence based on age
  if (age <= 3) {
    content.earlyYearsActivities = [
      t('sensoryPlay') || 'Sanseleik og utforsking',
      t('simpleRoutines') || 'Enkle rutiner og selvstendighet',
      t('motorSkills') || 'Grov- og finmotoriske ferdigheter'
    ];
  } else if (age <= 6) {
    content.earlyYearsActivities = [
      t('preschoolPrep') || 'Forberedelse til skole',
      t('socialSkills') || 'Sosiale ferdigheter',
      t('creativeDevelopment') || 'Kreativ utvikling'
    ];
  }

  // Seasonal Norwegian Activities
  switch (season) {
    case 'winter':
      content.seasonalActivities = [
        t('winterPlay') || 'Snølek og vinteraktiviteter',
        t('indoorCrafts') || 'Innendørs håndverk og pyssel',
        t('christmasPrep') || 'Juleforberedelser og tradisjoner'
      ];
      content.weatherActivities = [
        t('warmClothing') || 'Varme klær og refleksvest',
        t('shortOutings') || 'Korte turer i kulda',
        t('cozyIndoor') || 'Koselige innendørs aktiviteter'
      ];
      break;
    case 'spring':
      content.seasonalActivities = [
        t('natureTours') || 'Naturturer og blomsterplukking',
        t('easterActivities') || 'Påskeaktiviteter og tradisjoner',
        t('gardenPlay') || 'Hagearbeid og planting'
      ];
      content.weatherActivities = [
        t('layerClothing') || 'Lag-på-lag påkledning',
        t('rainGear') || 'Regntøy for vårvær',
        t('outdoorExploring') || 'Utendørs utforsking'
      ];
      break;
    case 'summer':
      content.seasonalActivities = [
        t('beachPlay') || 'Strand og sjø aktiviteter',
        t('berryPicking') || 'Bærplukking og naturopplevelser',
        t('cabinLife') || 'Hytteliv og friluftsliv'
      ];
      content.weatherActivities = [
        t('sunProtection') || 'Solkrem og lett påkledning',
        t('waterSafety') || 'Vannsikkerhet og bading',
        t('longDays') || 'Lange lyseDager utendørs'
      ];
      break;
    case 'autumn':
      content.seasonalActivities = [
        t('harvestTime') || 'Høsting og naturmaterialer',
        t('schoolPrep') || 'Forberedelse til skolestart',
        t('cozyTraditions') || 'Høstmys og tradisjoner'
      ];
      content.weatherActivities = [
        t('autumnClothing') || 'Høstklær og regntøy',
        t('forestWalks') || 'Skogsturer og naturlek',
        t('preparingForWinter') || 'Forberede seg til vinteren'
      ];
      break;
  }

  // Norwegian Cultural Learning
  content.culturalLearning = [
    t('norwegianSongs') || 'Norske sanger og rim',
    t('traditionalCrafts') || 'Tradisjonelle håndverk',
    t('nationalSymbols') || 'Nasjonale symboler og flagg',
    t('folkTales') || 'Eventyr og folkesagn'
  ];

  // Development-appropriate tasks
  if (age <= 3) {
    content.developmentTasks = [
      t('basicSelfCare') || 'Grunnleggende egenomsorg',
      t('simpleHelping') || 'Enkle hjelpetasks hjemme',
      t('followingRoutines') || 'Følge daglige rutiner'
    ];
  } else {
    content.developmentTasks = [
      t('familyChores') || 'Familieoppgaver og ansvar',
      t('independentPlay') || 'Selvstendig lek og aktivitet',
      t('helpingOthers') || 'Hjelpe søsken og familie'
    ];
  }

  return content;
};

export default function KidsScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const [kids, setKids] = React.useState<Child[]>([]);
  const [activeTab, setActiveTab] = React.useState(0);
  const [editChild, setEditChild] = React.useState<Child | null>(null);
  const [viewChild, setViewChild] = React.useState<Child | null>(null);
  const [showViewDrawer, setShowViewDrawer] = React.useState(false);
  const [schoolSummaries, setSchoolSummaries] = React.useState<Record<string, any>>({});
  const [loadingSummaries, setLoadingSummaries] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [familyIntelligence, setFamilyIntelligence] = React.useState<any>(null);
  const [loadingIntelligence, setLoadingIntelligence] = React.useState(false);
  const [todaysAppointments, setTodaysAppointments] = React.useState<Record<string, Appointment[]>>({});
  const [showAppointmentModal, setShowAppointmentModal] = React.useState(false);
  const [selectedChildForAppointment, setSelectedChildForAppointment] = React.useState<Child | null>(null);
  const [editingAppointment, setEditingAppointment] = React.useState<Appointment | null>(null);
  const currentSeason = getCurrentNorwegianSeason();

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    // Find the child associated with this appointment
    const child = children.find(c => c.id === appointment.childId);
    setSelectedChildForAppointment(child || null);
    setShowAppointmentModal(true);
  };

  const loadTodaysAppointments = React.useCallback(async () => {
    if (!householdId) return;
    
    try {
      // Load appointments for each child and family-wide appointments
      const appointmentsMap: Record<string, Appointment[]> = {};
      
      // Load family-wide appointments (no specific childId)
      const familyAppointments = await getTodaysAppointments(householdId);
      appointmentsMap['family'] = familyAppointments;
      
      // Load appointments for each child
      for (const child of kids) {
        const childAppointments = await getTodaysAppointments(householdId, child.id);
        appointmentsMap[child.id] = childAppointments;
      }
      
      setTodaysAppointments(appointmentsMap);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  }, [householdId, kids]);

  const load = React.useCallback(async () => {
    if (!householdId) return setKids([]);
    const children = await listChildren(householdId);
    setKids(children);
    
    // Load family intelligence data
    if (children.length > 0) {
      setLoadingIntelligence(true);
      try {
        const intelligence = await kidsIntelligenceService.generateFamilyIntelligence(children);
        setFamilyIntelligence(intelligence);
        
        // Extract school summaries for backward compatibility
        const summaries: Record<string, any> = {};
        intelligence.forEach(data => {
          summaries[data.childId] = {
            schedule: data.todaysSummary.schoolSchedule,
            anomalies: data.todaysSummary.anomalies,
            links: [],
            error: null
          };
        });
        setSchoolSummaries(summaries);
      } catch (error) {
        console.error('Failed to load family intelligence:', error);
      } finally {
        setLoadingIntelligence(false);
      }
    }
  }, [householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (kids.length > 0) {
      loadTodaysAppointments();
    }
  }, [kids, loadTodaysAppointments]);

  // Generate tab names
  const tabNames = React.useMemo(() => {
    const tabs = [(t("overview") as string) || "Oversikt"];
    kids.forEach(kid => {
      tabs.push(kid.displayName);
    });
    return tabs;
  }, [kids, t]);

  const renderAllKidsTab = () => (
    <View>
      {/* Today's Highlights */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          marginHorizontal: 16,
        }}
      >
        <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 12 }}>
          {(t("todaysHighlights") as string) || "Today's Highlights"}
        </Text>
        
        {loadingIntelligence ? (
          <TextSkeleton lines={3} />
        ) : familyIntelligence && familyIntelligence.length > 0 ? (
          familyIntelligence.map((data: any) => {
            const child = kids.find(k => k.id === data.childId);
            if (!child) return null;
            
            return (
              <View key={data.childId} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: child.color || theme.colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    {child.emoji ? (
                      <Text style={{ fontSize: 16 }}>{child.emoji}</Text>
                    ) : (
                      <Ionicons name="person" size={16} color={theme.colors.onPrimary} />
                    )}
                  </View>
                  <Text style={{ fontWeight: "600", color: theme.colors.text }}>{child.displayName}</Text>
                </View>
                
                {data.todaysSummary.anomalies.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    {data.todaysSummary.anomalies.slice(0, 2).map((anomaly: string, idx: number) => (
                      <Text key={idx} style={{ color: theme.colors.warning, fontSize: 12 }}>• {anomaly}</Text>
                    ))}
                  </View>
                )}
                
                {data.todaysSummary.coordinationTips.length > 0 && (
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {data.todaysSummary.coordinationTips[0]}
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: theme.colors.muted, textAlign: "center", paddingVertical: 20 }}>
            {(t("noHighlightsToday") as string) || "No highlights for today"}
          </Text>
        )}
      </View>

    </View>
  );

  // Render child with comprehensive content for non-school kids
  const renderNonSchoolChild = (child: Child) => {
    const nonSchoolContent = generateNonSchoolContent(child, currentSeason, t);
    
    return (
      <View style={{ paddingHorizontal: 16 }}>
        {/* Child Profile Header */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            marginHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: child.color || theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: child.hasDeviceAccess ? theme.colors.primary : theme.colors.border,
                }}
              >
                {child.emoji ? (
                  <Text style={{ fontSize: 24 }}>{child.emoji}</Text>
                ) : (
                  <Ionicons name="person" size={24} color={theme.colors.onPrimary} />
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ ...theme.typography.h2, color: theme.colors.text }}>
                  {child.displayName}
                </Text>
                <Text style={{ color: theme.colors.success, fontSize: 14 }}>
                  {(t("preschoolAge") as string) || "Førskolealder"} • {currentSeason}
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setViewChild(child);
                  setShowViewDrawer(true);
                }}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel={(t("viewDetails") as string) || "View details"}
              >
                <Ionicons name="eye-outline" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setEditChild(child);
                  setShowAddModal(true);
                }}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel={(t("editChild") as string) || "Edit child"}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Child Stats */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {child.age && (
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>
                  {child.age} {(t("yearsOld") as string) || "år"}
                </Text>
              </View>
            )}
            <View style={{ backgroundColor: theme.colors.accentSeafoam + "20", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.accentSeafoam, fontSize: 12, fontWeight: "600" }}>
                {(t("earlyYears") as string) || "Tidlige år"}
              </Text>
            </View>
            {child.hasDeviceAccess && (
              <View style={{ backgroundColor: theme.colors.primary, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="phone-portrait" size={12} color={theme.colors.onPrimary} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: "600" }}>
                  {(t("hasDevice") as string) || "Har enhet"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's Appointments */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("todaysAppointments") as string) || "Dagens avtaler"}
              </Text>
            </View>
          </View>
          
          {todaysAppointments[child.id] && todaysAppointments[child.id].length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              {todaysAppointments[child.id].map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  compact={true}
                  onPress={() => {/* TODO: Navigate to appointment details */}}
                  onEdit={() => handleEditAppointment(appointment)}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 12, fontStyle: 'italic' }}>
              {(t("noAppointmentsToday") as string) || "Ingen avtaler i dag"}
            </Text>
          )}
          
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
            }}
            onPress={() => {
              setSelectedChildForAppointment(child);
              setShowAppointmentModal(true);
            }}
          >
            <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
            <Text style={{ color: theme.colors.onPrimary, marginLeft: 4, fontWeight: "600", fontSize: 14 }}>
              {(t("addAppointment") as string) || "Legg til avtale"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Early Years Development Hub */}
        <View
          style={{
            backgroundColor: theme.colors.accentSeafoam + "15",
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.accentSeafoam,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="analytics-outline" size={20} color={theme.colors.accentSeafoam} />
            <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginLeft: 8 }}>
              {(t("developmentHub") as string) || "Utviklingssenter"}
            </Text>
          </View>
          {nonSchoolContent.earlyYearsActivities.map((activity: string, idx: number) => (
            <Text key={idx} style={{ color: theme.colors.text, fontSize: 14, marginBottom: 6 }}>• {activity}</Text>
          ))}
        </View>

        {/* Norwegian Seasonal Activities */}
        <View
          style={{
            backgroundColor: theme.colors.accentCoral + "15",
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.accentCoral,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons 
              name={currentSeason === 'winter' ? 'snow-outline' : currentSeason === 'spring' ? 'flower-outline' : currentSeason === 'summer' ? 'sunny-outline' : 'leaf-outline'} 
              size={20} 
              color={theme.colors.accentCoral} 
            />
            <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginLeft: 8 }}>
              {(t("seasonalActivities") as string) || "Sesong aktiviteter"} ({currentSeason})
            </Text>
          </View>
          {nonSchoolContent.seasonalActivities.map((activity: string, idx: number) => (
            <Text key={idx} style={{ color: theme.colors.text, fontSize: 14, marginBottom: 6 }}>• {activity}</Text>
          ))}
        </View>

        {/* Norwegian Cultural Learning */}
        <View
          style={{
            backgroundColor: theme.colors.primary + "10",
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.primary,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="flag-outline" size={20} color={theme.colors.primary} />
            <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginLeft: 8 }}>
              {(t("culturalLearning") as string) || "Kulturell læring"}
            </Text>
          </View>
          {nonSchoolContent.culturalLearning.map((learning: string, idx: number) => (
            <Text key={idx} style={{ color: theme.colors.text, fontSize: 14, marginBottom: 6 }}>• {learning}</Text>
          ))}
        </View>

        {/* Weather-Responsive Activities */}
        <View
          style={{
            backgroundColor: theme.colors.focus + "15",
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.focus,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="partly-sunny-outline" size={20} color={theme.colors.focus} />
            <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginLeft: 8 }}>
              {(t("weatherActivities") as string) || "Vær aktiviteter"}
            </Text>
          </View>
          {nonSchoolContent.weatherActivities.map((activity: string, idx: number) => (
            <Text key={idx} style={{ color: theme.colors.text, fontSize: 14, marginBottom: 6 }}>• {activity}</Text>
          ))}
        </View>

        {/* Development-Appropriate Tasks */}
        <View
          style={{
            backgroundColor: theme.colors.success + "10",
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.success,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
            <Text style={{ ...theme.typography.h2, color: theme.colors.text, marginLeft: 8 }}>
              {(t("developmentTasks") as string) || "Utviklingsoppgaver"}
            </Text>
          </View>
          {nonSchoolContent.developmentTasks.map((task: string, idx: number) => (
            <Text key={idx} style={{ color: theme.colors.text, fontSize: 14, marginBottom: 6 }}>• {task}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderChildTab = (child: Child) => {
    const intelligence = familyIntelligence?.find((data: any) => data.childId === child.id);
    
    // If child has no school, render comprehensive non-school content
    if (!child.school) {
      return renderNonSchoolChild(child);
    }
    
    // Original school-connected child content
    return (
      <View style={{ paddingHorizontal: 16 }}>
        {/* Child Profile Header */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            marginHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: child.color || theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: child.hasDeviceAccess ? theme.colors.primary : theme.colors.border,
                }}
              >
                {child.emoji ? (
                  <Text style={{ fontSize: 24 }}>{child.emoji}</Text>
                ) : (
                  <Ionicons name="person" size={24} color={theme.colors.onPrimary} />
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ ...theme.typography.h2, color: theme.colors.text }}>
                  {child.displayName}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
                  {child.school.name}
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setViewChild(child);
                  setShowViewDrawer(true);
                }}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel={(t("viewDetails") as string) || "View details"}
              >
                <Ionicons name="eye-outline" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setEditChild(child);
                  setShowAddModal(true);
                }}
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel={(t("editChild") as string) || "Edit child"}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Child Stats */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {child.age && (
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>
                  {(t("age") as string) || "Age"} {child.age}
                </Text>
              </View>
            )}
            
            {child.hasDeviceAccess && (
              <View style={{ backgroundColor: theme.colors.primary, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="phone-portrait" size={12} color={theme.colors.onPrimary} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: "600" }}>
                  {(t("hasDevice") as string) || "Has device"}
                </Text>
              </View>
            )}
            
            {child.rewardPoints && (
              <View style={{ backgroundColor: "#FFD700", borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="star" size={12} color="#000" style={{ marginRight: 4 }} />
                <Text style={{ color: "#000", fontSize: 12, fontWeight: "600" }}>
                  {child.rewardPoints} {(t("points") as string) || "points"}
                </Text>
              </View>
            )}
            
            {child.currentGrade && (
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "600" }}>
                  {child.currentGrade}. {(t("grade") as string) || "trinn"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's Appointments */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("todaysAppointments") as string) || "Dagens avtaler"}
              </Text>
            </View>
          </View>
          
          {todaysAppointments[child.id] && todaysAppointments[child.id].length > 0 ? (
            <View style={{ marginBottom: 12 }}>
              {todaysAppointments[child.id].map((appointment) => (
                <AppointmentCard 
                  key={appointment.id} 
                  appointment={appointment} 
                  compact={true}
                  onPress={() => {/* TODO: Navigate to appointment details */}}
                  onEdit={() => handleEditAppointment(appointment)}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 12, fontStyle: 'italic' }}>
              {(t("noAppointmentsToday") as string) || "Ingen avtaler i dag"}
            </Text>
          )}
          
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
            }}
            onPress={() => {
              setSelectedChildForAppointment(child);
              setShowAppointmentModal(true);
            }}
          >
            <Ionicons name="add" size={16} color={theme.colors.onPrimary} />
            <Text style={{ color: theme.colors.onPrimary, marginLeft: 4, fontWeight: "600", fontSize: 14 }}>
              {(t("addAppointment") as string) || "Legg til avtale"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Norwegian School Context */}
        {intelligence?.norwegianContext && (
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="flag-outline" size={18} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("norwegianContext") as string) || "Norwegian Context"}
              </Text>
            </View>
            
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 8 }}>
              {(t("currentSeason") as string) || "Current season"}: {intelligence.norwegianContext.currentSeason}
            </Text>
            
            {intelligence.norwegianContext.seasonalActivities.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "600", marginBottom: 4 }}>
                  {(t("seasonalActivities") as string) || "Seasonal Activities"}
                </Text>
                {intelligence.norwegianContext.seasonalActivities.slice(0, 3).map((activity: string, idx: number) => (
                  <Text key={idx} style={{ color: theme.colors.muted, fontSize: 12 }}>• {activity}</Text>
                ))}
              </View>
            )}
            
            {intelligence.norwegianContext.upcomingTraditions.length > 0 && (
              <View>
                <Text style={{ color: theme.colors.text, fontWeight: "600", marginBottom: 4 }}>
                  {(t("upcomingTraditions") as string) || "Upcoming Traditions"}
                </Text>
                {intelligence.norwegianContext.upcomingTraditions.map((tradition: any, idx: number) => (
                  <Text key={idx} style={{ color: theme.colors.primary, fontSize: 12, fontWeight: "500" }}>
                    • {tradition.name} ({new Date(tradition.date).toLocaleDateString('no-NO')})
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Today's Schedule */}
        {intelligence?.todaysSummary && (
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("todaysSchedule") as string) || "Today's Schedule"}
              </Text>
            </View>
            
            {intelligence.todaysSummary.schoolSchedule.length > 0 ? (
              intelligence.todaysSummary.schoolSchedule.map((slot: any, idx: number) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }}>
                  <View style={{ width: 60 }}>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>
                      {slot.startTime}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{slot.title}</Text>
                    {slot.location && (
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{slot.location}</Text>
                    )}
                  </View>
                  {slot.type === 'school' && <Ionicons name="school" size={16} color={theme.colors.primary} />}
                  {slot.type === 'sfo' && <Ionicons name="home" size={16} color={theme.colors.warning} />}
                  {slot.type === 'activity' && <Ionicons name="football" size={16} color={theme.colors.success} />}
                </View>
              ))
            ) : (
              <Text style={{ color: theme.colors.muted, textAlign: "center", paddingVertical: 20 }}>
                {(t("noScheduleToday") as string) || "No schedule for today"}
              </Text>
            )}
          </View>
        )}

        {/* Anomalies & Alerts */}
        {intelligence?.todaysSummary.anomalies.length > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.warningSurface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.colors.warningBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.warning }}>
                {(t("importantAlerts") as string) || "Important Alerts"}
              </Text>
            </View>
            
            {intelligence.todaysSummary.anomalies.map((anomaly: string, idx: number) => (
              <Text key={idx} style={{ color: theme.colors.warning, fontSize: 14, marginBottom: 4 }}>
                • {anomaly}
              </Text>
            ))}
          </View>
        )}

        {/* Coordination Tips */}
        {intelligence?.todaysSummary.coordinationTips.length > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("coordinationTips") as string) || "Coordination Tips"}
              </Text>
            </View>
            
            {intelligence.todaysSummary.coordinationTips.map((tip: string, idx: number) => (
              <Text key={idx} style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 4, lineHeight: 20 }}>
                • {tip}
              </Text>
            ))}
          </View>
        )}

        {/* AI Suggestions */}
        {intelligence?.suggestions && (
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, ...theme.typography.h2, color: theme.colors.text }}>
                {(t("suggestions") as string) || "Suggestions"}
              </Text>
            </View>
            
            {intelligence.suggestions.activityRecommendations.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "600", marginBottom: 4 }}>
                  {(t("activityRecommendations") as string) || "Activity Recommendations"}
                </Text>
                {intelligence.suggestions.activityRecommendations.slice(0, 2).map((rec: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "500" }}>• {rec.activity}</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginLeft: 8 }}>{rec.reason}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {intelligence.suggestions.familyTimeSuggestions.length > 0 && (
              <View>
                <Text style={{ color: theme.colors.text, fontWeight: "600", marginBottom: 4 }}>
                  {(t("familyTimeSuggestions") as string) || "Family Time Suggestions"}
                </Text>
                {intelligence.suggestions.familyTimeSuggestions.slice(0, 2).map((suggestion: string, idx: number) => (
                  <Text key={idx} style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 2 }}>• {suggestion}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      {/* Tabs */}
      {tabNames.length > 1 && (
        <View style={{ marginBottom: 16 }}>
          <Tabs
            items={tabNames}
            value={activeTab}
            onChange={setActiveTab}
            even={false}
          />
        </View>
      )}

      {/* Tab Content */}
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {activeTab === 0 ? (
          renderAllKidsTab()
        ) : (
          kids[activeTab - 1] ? renderChildTab(kids[activeTab - 1]) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 100 }}>
              <Text style={{ color: theme.colors.muted }}>
                {(t("childNotFound") as string) || "Child not found"}
              </Text>
            </View>
          )
        )}
      </ScrollView>
      
      {/* Empty state for no children */}
      {tabNames.length === 1 && (
        <View 
          style={{ 
            alignItems: "center", 
            padding: 32,
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            marginTop: 16,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="people"
            size={64}
            color={theme.colors.muted}
            style={{ marginBottom: 20 }}
          />
          <Text 
            style={{ 
              color: theme.colors.text, 
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {(t("children.welcome") as string) || "Welcome to your family organizer!"}
          </Text>
          <Text 
            style={{ 
              color: theme.colors.muted,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
              fontSize: 16,
            }}
          >
            {(t("children.addChildrenHint") as string) || 
             "Add your children's profiles to get started with family task management, school schedules, and reward tracking."}
          </Text>
          <Button
            title={(t("addFirstChild") as string) || "Add Your First Child"}
            onPress={() => setShowAddModal(true)}
            iconLeft={<Ionicons name="add" size={20} color={theme.colors.onPrimary} />}
          />
          
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <Text style={{ color: theme.colors.primary, fontWeight: "600", marginBottom: 8 }}>
              {(t("norwegianSchoolSupport") as string) || "Norwegian School Support"}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "center" }}>
              {(t("fullNorwegianIntegration") as string) || "Full integration with Norwegian school systems • Real-time updates • Cultural context"}
            </Text>
          </View>
        </View>
      )}

      <AddEditChildModal
        visible={showAddModal}
        child={editChild}
        onClose={() => {
          setShowAddModal(false);
          setEditChild(null);
        }}
        onSave={async (
          name: string,
          school: any | null,
          url: string | null
        ) => {
          if (!householdId) return;
          if (editChild) {
            // Editing existing child
            await renameChild(
              householdId,
              editChild.id,
              name.trim() || editChild.displayName,
              editChild.emoji,
              editChild.color
            );
          } else {
            // Adding new child
            await addChild(
              householdId,
              name.trim() || "Unnamed",
              undefined,
              undefined,
              school
            );
            // Fire-and-forget: if URL provided, call local crawler (dev only)
            if (url && url.startsWith("http")) {
              try {
                fetch(
                  `http://localhost:5055/crawl?url=${encodeURIComponent(url)}`
                ).catch(() => {});
              } catch {}
            }
          }
          setShowAddModal(false);
          setEditChild(null);
          load();
          appEvents.emit("kids:changed", { hid: householdId });
        }}
      />

      {/* Child details drawer */}
      <ChildDetailDrawer
        visible={showViewDrawer}
        child={viewChild}
        summary={viewChild ? schoolSummaries[viewChild.id] : null}
        hid={householdId || undefined}
        onClose={() => {
          setShowViewDrawer(false);
          setViewChild(null);
        }}
      />

      {/* Appointment creation modal */}
      <AppointmentCreationModal
        visible={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setSelectedChildForAppointment(null);
          setEditingAppointment(null);
        }}
        child={selectedChildForAppointment}
        householdId={householdId || ""}
        editingAppointment={editingAppointment}
        onSave={(appointment) => {
          // Refresh appointments after saving
          loadTodaysAppointments();
          // Show success message
          appEvents.emit("toast:show", {
            message: (t("appointments.created") as string) || "Avtale opprettet!",
            type: "success"
          });
        }}
      />
    </ScreenContainer>
  );
}