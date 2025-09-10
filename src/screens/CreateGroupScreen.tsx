import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  type GroupType,
  type GroupPrivacyLevel, 
  type Group,
  NORWEGIAN_GROUP_TEMPLATES,
  createGroupFromTemplate,
} from "../models/Group";
import { listChildren, type Child } from "../services/children";

// Mock service - would be real Firebase/API call
const createGroup = async (groupData: Omit<Group, "id">): Promise<Group> => {
  // Mock implementation
  throw new Error("Not implemented");
};

interface GroupFormData {
  type?: GroupType;
  name: string;
  description: string;
  privacyLevel: GroupPrivacyLevel;
  schoolId?: string;
  schoolName?: string;
  kommune?: string;
  grade?: number;
  className?: string;
  norwegianSettings: {
    primaryLanguage: "norwegian" | "english";
    respectQuietHours: boolean;
    includeNorwegianHolidays: boolean;
    democraticDecisions: boolean;
    lagomPrinciple: boolean;
  };
  communicationChannels: {
    allowAnnouncements: boolean;
    allowDiscussions: boolean;
    allowDirectMessages: boolean;
    allowEventCoordination: boolean;
    moderationEnabled: boolean;
  };
}

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = React.useState(0);
  const [children, setChildren] = React.useState<Child[]>([]);
  
  const [formData, setFormData] = React.useState<GroupFormData>({
    name: "",
    description: "",
    privacyLevel: "invite_only",
    norwegianSettings: {
      primaryLanguage: "norwegian",
      respectQuietHours: true,
      includeNorwegianHolidays: true,
      democraticDecisions: true,
      lagomPrinciple: true,
    },
    communicationChannels: {
      allowAnnouncements: true,
      allowDiscussions: true,
      allowDirectMessages: true,
      allowEventCoordination: true,
      moderationEnabled: false,
    },
  });

  // Load children for school integration
  React.useEffect(() => {
    const loadChildren = async () => {
      if (!householdId) return;
      try {
        const childrenData = await listChildren(householdId);
        setChildren(childrenData);
      } catch (error) {
        console.error("Failed to load children:", error);
      }
    };
    loadChildren();
  }, [householdId]);

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigation.navigate("GroupDetail", { id: newGroup.id });
    },
    onError: (error) => {
      Alert.alert(
        t("error") || "Feil",
        t("failedToCreateGroup") || "Kunne ikke opprette gruppe"
      );
    },
  });

  const handleTypeSelect = (type: GroupType) => {
    const template = NORWEGIAN_GROUP_TEMPLATES[type];
    setFormData(prev => ({
      ...prev,
      type,
      privacyLevel: template.suggestedPrivacy,
      communicationChannels: {
        ...prev.communicationChannels,
        ...template.defaultChannels,
      },
    }));

    // Auto-fill school info if type is school-related and we have children
    if ((type === "school_class" || type === "school_grade" || type === "sfo_group") && children.length > 0) {
      const firstChild = children[0];
      if (firstChild.school) {
        setFormData(prev => ({
          ...prev,
          schoolId: firstChild.school?.id,
          schoolName: firstChild.school?.name || firstChild.school?.title,
          kommune: firstChild.school?.municipality,
          grade: type === "school_grade" ? firstChild.currentGrade : undefined,
        }));
      }
    }

    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!householdId || !formData.type) return;

    try {
      const schoolContext = (formData.type === "school_class" || 
                           formData.type === "school_grade" || 
                           formData.type === "sfo_group") && formData.schoolId ? {
        schoolId: formData.schoolId,
        schoolName: formData.schoolName || "",
        kommune: formData.kommune || "",
        grade: formData.grade,
        className: formData.className,
        schoolYear: "2025-2026", // Current school year
      } : undefined;

      const groupData = createGroupFromTemplate(
        formData.type,
        formData.name,
        "current-user-id", // Would come from auth context
        schoolContext
      );

      // Override with form data
      const finalGroupData: Omit<Group, "id"> = {
        ...groupData,
        description: formData.description,
        privacyLevel: formData.privacyLevel,
        norwegianSettings: formData.norwegianSettings,
        communicationChannels: formData.communicationChannels,
      };

      await createGroupMutation.mutateAsync(finalGroupData);
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0:
        return !!formData.type;
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return true; // Settings are optional
      default:
        return false;
    }
  };

  const renderStepIndicator = () => (
    <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 24 }}>
      {[0, 1, 2, 3].map((step) => (
        <View
          key={step}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: step <= currentStep ? theme.colors.primary : theme.colors.border,
            justifyContent: "center",
            alignItems: "center",
            marginHorizontal: 8,
          }}
        >
          <Text style={{
            color: step <= currentStep ? theme.colors.onPrimary : theme.colors.textSecondary,
            fontWeight: "600",
          }}>
            {step + 1}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderTypeSelection = () => (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("chooseGroupType") || "Velg gruppetype"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("groupTypeDescription") || "Velg den typen gruppe som passer best for ditt formål"}
      </Text>

      <ScrollView style={{ maxHeight: 500 }}>
        {Object.entries(NORWEGIAN_GROUP_TEMPLATES).map(([type, template]) => {
          if (type === "custom") return null; // Skip custom for now

          return (
            <TouchableOpacity
              key={type}
              onPress={() => handleTypeSelect(type as GroupType)}
              style={{ marginBottom: 12 }}
            >
              <Card style={{
                borderColor: formData.type === type ? theme.colors.primary : theme.colors.border,
                borderWidth: 2,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 32, marginRight: 16 }}>
                    {template.icon}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
                      {template.displayName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                      {template.description}
                    </Text>
                    
                    {/* Norwegian context preview */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                      {template.norwegianContext.slice(0, 2).map((context, index) => (
                        <View
                          key={index}
                          style={{
                            backgroundColor: theme.colors.background,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: theme.radius.sm,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                            {context}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={formData.type === type ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderBasicInfo = () => (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("basicInformation") || "Grunnleggende informasjon"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("fillBasicDetails") || "Fyll ut grunnleggende detaljer om gruppen"}
      </Text>

      {/* Selected type display */}
      {formData.type && (
        <Card style={{ marginBottom: 16, backgroundColor: theme.colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {NORWEGIAN_GROUP_TEMPLATES[formData.type].icon}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
              {NORWEGIAN_GROUP_TEMPLATES[formData.type].displayName}
            </Text>
          </View>
        </Card>
      )}

      <Input
        label={t("groupName") || "Gruppenavn"}
        placeholder={t("groupNamePlaceholder") || "F.eks. 'Klasse 3A foreldre'"}
        value={formData.name}
        onChangeText={(name) => setFormData(prev => ({ ...prev, name }))}
        containerStyle={{ marginBottom: 16 }}
      />

      <Input
        label={t("description") || "Beskrivelse"}
        placeholder={t("groupDescriptionPlaceholder") || "Kort beskrivelse av gruppens formål"}
        value={formData.description}
        onChangeText={(description) => setFormData(prev => ({ ...prev, description }))}
        multiline
        numberOfLines={3}
        containerStyle={{ marginBottom: 16 }}
      />

      {/* School integration for school-based groups */}
      {(formData.type === "school_class" || formData.type === "school_grade" || formData.type === "sfo_group") && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🏫 {t("schoolIntegration") || "Skoleintegrasjon"}
          </Text>
          
          {formData.schoolName ? (
            <View>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                {formData.schoolName}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                {formData.kommune}
              </Text>
              {formData.grade && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                  {t("grade") || "Trinn"} {formData.grade}
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontStyle: "italic" }}>
              {t("noSchoolInfo") || "Ingen skoleinformasjon tilgjengelig"}
            </Text>
          )}

          {formData.type === "school_class" && (
            <Input
              label={t("className") || "Klassenavn"}
              placeholder={t("classNamePlaceholder") || "F.eks. '3A'"}
              value={formData.className || ""}
              onChangeText={(className) => setFormData(prev => ({ ...prev, className }))}
              containerStyle={{ marginTop: 12 }}
            />
          )}
        </Card>
      )}

      {/* Privacy Level */}
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🔒 {t("privacyLevel") || "Personvernnivå"}
        </Text>

        {(["public", "school_only", "grade_only", "invite_only", "private"] as GroupPrivacyLevel[]).map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setFormData(prev => ({ ...prev, privacyLevel: level }))}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: theme.radius.md,
              backgroundColor: formData.privacyLevel === level ? theme.colors.primary + "20" : "transparent",
              marginBottom: 8,
            }}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: formData.privacyLevel === level ? theme.colors.primary : theme.colors.border,
              backgroundColor: formData.privacyLevel === level ? theme.colors.primary : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}>
              {formData.privacyLevel === level && (
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.onPrimary,
                }} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontWeight: "600", 
                color: formData.privacyLevel === level ? theme.colors.primary : theme.colors.text 
              }}>
                {level === "public" && (t("publicGroup") || "Offentlig")}
                {level === "school_only" && (t("schoolOnly") || "Kun skole")}
                {level === "grade_only" && (t("gradeOnly") || "Kun trinn")}
                {level === "invite_only" && (t("inviteOnly") || "Kun invitasjon")}
                {level === "private" && (t("private") || "Privat")}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {level === "public" && (t("publicGroupDesc") || "Alle kan finne og bli med")}
                {level === "school_only" && (t("schoolOnlyDesc") || "Kun foreldre fra samme skole")}
                {level === "grade_only" && (t("gradeOnlyDesc") || "Kun foreldre fra samme trinn")}
                {level === "invite_only" && (t("inviteOnlyDesc") || "Må inviteres for å bli med")}
                {level === "private" && (t("privateDesc") || "Krever godkjenning fra administrator")}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );

  const renderSettings = () => (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("groupSettings") || "Gruppeinnstillinger"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("customizeGroupBehavior") || "Tilpass gruppens oppførsel og funksjoner"}
      </Text>

      {/* Norwegian Cultural Settings */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🇳🇴 {t("norwegianFeatures") || "Norske funksjoner"}
        </Text>

        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setFormData(prev => ({
              ...prev,
              norwegianSettings: {
                ...prev.norwegianSettings,
                respectQuietHours: !prev.norwegianSettings.respectQuietHours,
              },
            }))}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              backgroundColor: formData.norwegianSettings.respectQuietHours ? theme.colors.primary : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}>
              {formData.norwegianSettings.respectQuietHours && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                🌙 {t("respectQuietHours") || "Respekter stilletid"}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {t("quietHoursDesc") || "Pause meldinger mellom 20:00-07:00"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setFormData(prev => ({
              ...prev,
              norwegianSettings: {
                ...prev.norwegianSettings,
                includeNorwegianHolidays: !prev.norwegianSettings.includeNorwegianHolidays,
              },
            }))}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              backgroundColor: formData.norwegianSettings.includeNorwegianHolidays ? theme.colors.primary : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}>
              {formData.norwegianSettings.includeNorwegianHolidays && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                🎄 {t("norwegianHolidays") || "Norske høytider"}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {t("holidaysDesc") || "Inkluder norske høytider i kalenderen"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setFormData(prev => ({
              ...prev,
              norwegianSettings: {
                ...prev.norwegianSettings,
                democraticDecisions: !prev.norwegianSettings.democraticDecisions,
              },
            }))}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              backgroundColor: formData.norwegianSettings.democraticDecisions ? theme.colors.primary : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}>
              {formData.norwegianSettings.democraticDecisions && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                🗳️ {t("democraticDecisions") || "Demokratiske avgjørelser"}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {t("democraticDesc") || "Bruk avstemning for gruppevalg"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View>
          <TouchableOpacity
            onPress={() => setFormData(prev => ({
              ...prev,
              norwegianSettings: {
                ...prev.norwegianSettings,
                lagomPrinciple: !prev.norwegianSettings.lagomPrinciple,
              },
            }))}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              backgroundColor: formData.norwegianSettings.lagomPrinciple ? theme.colors.primary : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}>
              {formData.norwegianSettings.lagomPrinciple && (
                <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                ⚖️ {t("lagomPrinciple") || "Lagom-prinsippet"}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {t("lagomDesc") || "Balansert kommunikasjon, ikke for mye"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Communication Channels */}
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          💬 {t("communicationChannels") || "Kommunikasjonskanaler"}
        </Text>

        {Object.entries({
          allowAnnouncements: { label: t("announcements") || "Kunngjøringer", icon: "📢" },
          allowDiscussions: { label: t("discussions") || "Diskusjoner", icon: "💭" },
          allowDirectMessages: { label: t("directMessages") || "Direktemeldinger", icon: "💌" },
          allowEventCoordination: { label: t("eventCoordination") || "Arrangementkoordinering", icon: "📅" },
        }).map(([key, config]) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setFormData(prev => ({
                ...prev,
                communicationChannels: {
                  ...prev.communicationChannels,
                  [key]: !(prev.communicationChannels as any)[key],
                },
              }))}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                backgroundColor: (formData.communicationChannels as any)[key] ? theme.colors.primary : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
              }}>
                {(formData.communicationChannels as any)[key] && (
                  <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                  {config.icon} {config.label}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </Card>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderTypeSelection();
      case 1: return renderBasicInfo();
      case 2: return renderSettings();
      case 3: return renderInviteStep();
      default: return null;
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => {
              if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
              } else {
                navigation.goBack();
              }
            }}
            style={{ marginRight: 16, padding: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "700", flex: 1, color: theme.colors.text }}>
            {t("createGroup") || "Opprett gruppe"}
          </Text>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <ScrollView style={{ flex: 1 }}>
          {renderCurrentStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          {currentStep > 0 && (
            <Button
              title={t("previous") || "Forrige"}
              onPress={() => setCurrentStep(prev => prev - 1)}
              variant="outline"
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={
              currentStep === 2
                ? (t("createGroup") || "Opprett gruppe")
                : (t("next") || "Neste")
            }
            onPress={() => {
              if (currentStep === 2) {
                handleSubmit();
              } else {
                setCurrentStep(prev => prev + 1);
              }
            }}
            disabled={!canProceedToNextStep() || createGroupMutation.isPending}
            loading={createGroupMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}