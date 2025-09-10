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
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";

import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  type EventType,
  type Event,
  type EventRecurrenceType,
  NORWEGIAN_EVENT_TEMPLATES,
  createEventFromTemplate,
} from "../models/Event";

// Mock service - would be real Firebase/API call
const createEvent = async (eventData: Omit<Event, "id">): Promise<Event> => {
  // Mock implementation
  throw new Error("Not implemented");
};

interface EventFormData {
  type?: EventType;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: {
    name: string;
    address?: string;
    isOnline?: boolean;
    meetingLink?: string;
  };
  maxAttendees?: number;
  minAttendees?: number;
  waitlistEnabled: boolean;
  cost?: {
    amount: number;
    description?: string;
    paymentDeadline?: Date;
    paymentMethods?: ("vipps" | "bank_transfer" | "cash" | "invoice")[];
  };
  weatherBackup?: {
    required: boolean;
    alternativeLocation?: string;
    alternativeActivity?: string;
    weatherThreshold?: string;
  };
  recurrence: {
    type: EventRecurrenceType;
    interval?: number;
    endDate?: Date;
  };
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
    specificGrades?: number[];
  };
  norwegianCulturalContext?: {
    traditionalElement?: string;
    seasonalContext?: string;
    weatherConsiderations?: string;
    giftGiving?: {
      expected: boolean;
      suggestions?: string[];
      maxAmount?: number;
    };
    dresscode?: string;
    languagePreference?: "norwegian" | "english" | "both";
  };
  coordination: {
    allowVolunteerSignup: boolean;
    allowResourceSharing: boolean;
    carpoolingEnabled: boolean;
  };
}

export default function CreateEventScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const theme = useTheme();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();

  const groupId = (route.params as any)?.groupId;
  const [currentStep, setCurrentStep] = React.useState(0);
  const [showDatePicker, setShowDatePicker] = React.useState<"start" | "end" | null>(null);
  const [showPaymentDeadlinePicker, setShowPaymentDeadlinePicker] = React.useState(false);

  const [formData, setFormData] = React.useState<EventFormData>({
    title: "",
    description: "",
    startTime: dayjs().add(1, "week").hour(17).minute(0).second(0).toDate(),
    endTime: dayjs().add(1, "week").hour(19).minute(0).second(0).toDate(),
    isAllDay: false,
    waitlistEnabled: false,
    recurrence: {
      type: "none",
    },
    coordination: {
      allowVolunteerSignup: false,
      allowResourceSharing: false,
      carpoolingEnabled: false,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["groupEvents", groupId] });
      navigation.navigate("EventDetail", { id: newEvent.id });
    },
    onError: (error) => {
      Alert.alert(
        t("error") || "Feil",
        t("failedToCreateEvent") || "Kunne ikke opprette arrangement"
      );
    },
  });

  const handleTemplateSelect = (type: EventType) => {
    const template = NORWEGIAN_EVENT_TEMPLATES[type];
    const templateEvent = template.template;

    // Get current date and apply template timing suggestions
    const now = dayjs();
    let startTime = now.add(1, "week").hour(17).minute(0).second(0);
    let endTime = startTime.add(2, "hours");

    // Apply template-specific timing if available
    if (template.norwegianContext.typicalTimings.length > 0) {
      const firstTiming = template.norwegianContext.typicalTimings[0];
      const timeMatch = firstTiming.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        startTime = startTime.hour(parseInt(timeMatch[1])).minute(parseInt(timeMatch[2]));
        endTime = startTime.add(2, "hours");
      }
    }

    // Special handling for Norwegian events
    if (type === "17_mai") {
      startTime = dayjs().year(dayjs().year() + (dayjs().month() > 4 ? 1 : 0)).month(4).date(17).hour(9).minute(0);
      endTime = startTime.hour(17).minute(0);
    } else if (type === "lucia") {
      startTime = dayjs().year(dayjs().year() + (dayjs().month() > 11 ? 1 : 0)).month(11).date(13).hour(18).minute(0);
      endTime = startTime.add(2, "hours");
    }

    setFormData(prev => ({
      ...prev,
      type,
      title: template.name,
      description: template.description,
      startTime: startTime.toDate(),
      endTime: endTime.toDate(),
      isAllDay: templateEvent.isAllDay || false,
      waitlistEnabled: templateEvent.waitlistEnabled || false,
      recurrence: templateEvent.recurrence || prev.recurrence,
      coordination: {
        ...prev.coordination,
        ...templateEvent.coordination,
      },
      norwegianCulturalContext: templateEvent.norwegianCulturalContext,
      weatherBackup: templateEvent.weatherBackup,
    }));

    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!householdId || !formData.type) return;

    try {
      const eventData = createEventFromTemplate(formData.type, {
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isAllDay: formData.isAllDay,
        location: formData.location,
        organizerId: "current-user-id", // Would come from auth context
        organizerName: "Current User", // Would come from auth context
        groupId,
        maxAttendees: formData.maxAttendees,
        minAttendees: formData.minAttendees,
        waitlistEnabled: formData.waitlistEnabled,
        cost: formData.cost,
        recurrence: formData.recurrence,
        ageRestrictions: formData.ageRestrictions,
        norwegianCulturalContext: formData.norwegianCulturalContext,
        coordination: formData.coordination,
        weatherBackup: formData.weatherBackup,
        privacy: {
          visibility: groupId ? "group_only" : "public",
          allowGuestInvites: true,
          shareAttendeeList: true,
        },
      });

      await createEventMutation.mutateAsync(eventData);
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0:
        return !!formData.type;
      case 1:
        return formData.title.trim().length > 0 && formData.startTime && formData.endTime;
      case 2:
        return true; // Settings are optional
      default:
        return false;
    }
  };

  const renderStepIndicator = () => (
    <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 24 }}>
      {[0, 1, 2].map((step) => (
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

  const renderTemplateSelection = () => (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("chooseEventType") || "Velg arrangementtype"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("eventTypeDescription") || "Velg fra norske kulturtradisjonelle maler eller lag ditt eget"}
      </Text>

      <ScrollView style={{ maxHeight: 500 }}>
        {/* Featured Norwegian Events */}
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🇳🇴 {t("norwegianTraditions") || "Norske tradisjoner"}
        </Text>
        {["17_mai", "lucia", "julebord", "friluftsliv"].map((type) => {
          const template = NORWEGIAN_EVENT_TEMPLATES[type as EventType];
          return (
            <TouchableOpacity
              key={type}
              onPress={() => handleTemplateSelect(type as EventType)}
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
                      {template.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontSize: 14 }}>
                      {template.norwegianContext.culturalSignificance}
                    </Text>
                    
                    {/* Timing suggestions */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                      {template.norwegianContext.typicalTimings.slice(0, 2).map((timing, index) => (
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
                            {timing}
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

        {/* Common Events */}
        <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 12, color: theme.colors.text }}>
          📅 {t("commonEvents") || "Vanlige arrangementer"}
        </Text>
        {["bursdagsfest", "skolearrangement", "foreldremøte", "klassetur", "idrett"].map((type) => {
          const template = NORWEGIAN_EVENT_TEMPLATES[type as EventType];
          return (
            <TouchableOpacity
              key={type}
              onPress={() => handleTemplateSelect(type as EventType)}
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
                      {template.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                      {template.description}
                    </Text>
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

        {/* Custom Option */}
        <TouchableOpacity
          onPress={() => handleTemplateSelect("custom")}
          style={{ marginBottom: 12 }}
        >
          <Card style={{
            borderColor: formData.type === "custom" ? theme.colors.primary : theme.colors.border,
            borderWidth: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 32, marginRight: 16 }}>⚙️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
                  {t("customEvent") || "Egendefinert arrangement"}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                  {t("createFromScratch") || "Lag ditt eget arrangement fra bunnen av"}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={formData.type === "custom" ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderBasicInfo = () => (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("eventDetails") || "Arrangementdetaljer"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("fillEventDetails") || "Fyll ut grunnleggende detaljer om arrangementet"}
      </Text>

      {/* Selected template display */}
      {formData.type && (
        <Card style={{ marginBottom: 16, backgroundColor: theme.colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {NORWEGIAN_EVENT_TEMPLATES[formData.type].icon}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}>
                {NORWEGIAN_EVENT_TEMPLATES[formData.type].name}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                {NORWEGIAN_EVENT_TEMPLATES[formData.type].norwegianContext.culturalSignificance}
              </Text>
            </View>
          </View>
        </Card>
      )}

      <Input
        label={t("eventTitle") || "Arrangementtittel"}
        placeholder={t("eventTitlePlaceholder") || "F.eks. 'Emma sin 7-årsdag'"}
        value={formData.title}
        onChangeText={(title) => setFormData(prev => ({ ...prev, title }))}
        containerStyle={{ marginBottom: 16 }}
      />

      <Input
        label={t("description") || "Beskrivelse"}
        placeholder={t("eventDescriptionPlaceholder") || "Beskriv arrangementet"}
        value={formData.description}
        onChangeText={(description) => setFormData(prev => ({ ...prev, description }))}
        multiline
        numberOfLines={3}
        containerStyle={{ marginBottom: 16 }}
      />

      {/* Date and Time */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          📅 {t("dateAndTime") || "Dato og tid"}
        </Text>

        {/* All Day Toggle */}
        <TouchableOpacity
          onPress={() => setFormData(prev => ({ ...prev, isAllDay: !prev.isAllDay }))}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: formData.isAllDay ? theme.colors.primary : "transparent",
            marginRight: 12,
            justifyContent: "center",
            alignItems: "center",
          }}>
            {formData.isAllDay && (
              <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
            )}
          </View>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>
            {t("allDayEvent") || "Heldagsarrangement"}
          </Text>
        </TouchableOpacity>

        {/* Start Time */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
            {t("startTime") || "Starttid"}
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker("start")}
            style={{
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              padding: 16,
            }}
          >
            <Text style={{ color: theme.colors.text }}>
              {dayjs(formData.startTime).format("DD. MMMM YYYY")}
              {!formData.isAllDay && ` • ${dayjs(formData.startTime).format("HH:mm")}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Time */}
        {!formData.isAllDay && (
          <View>
            <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
              {t("endTime") || "Sluttid"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker("end")}
              style={{
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 16,
              }}
            >
              <Text style={{ color: theme.colors.text }}>
                {dayjs(formData.endTime).format("DD. MMMM YYYY • HH:mm")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Location */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          📍 {t("location") || "Sted"}
        </Text>

        <Input
          placeholder={t("locationName") || "F.eks. 'Hjemme hos oss'"}
          value={formData.location?.name || ""}
          onChangeText={(name) => setFormData(prev => ({ 
            ...prev, 
            location: { ...prev.location, name } as any
          }))}
          containerStyle={{ marginBottom: 12 }}
        />

        <Input
          placeholder={t("address") || "Adresse (valgfritt)"}
          value={formData.location?.address || ""}
          onChangeText={(address) => setFormData(prev => ({ 
            ...prev, 
            location: { ...prev.location, address } as any
          }))}
          containerStyle={{ marginBottom: 12 }}
        />

        {/* Online Event Toggle */}
        <TouchableOpacity
          onPress={() => setFormData(prev => ({ 
            ...prev, 
            location: { 
              ...prev.location, 
              isOnline: !prev.location?.isOnline 
            } as any
          }))}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: formData.location?.isOnline ? theme.colors.primary : "transparent",
            marginRight: 12,
            justifyContent: "center",
            alignItems: "center",
          }}>
            {formData.location?.isOnline && (
              <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
            )}
          </View>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>
            💻 {t("onlineEvent") || "Nettbasert arrangement"}
          </Text>
        </TouchableOpacity>

        {formData.location?.isOnline && (
          <Input
            placeholder={t("meetingLink") || "Møtelenke (Zoom, Teams, etc.)"}
            value={formData.location?.meetingLink || ""}
            onChangeText={(meetingLink) => setFormData(prev => ({ 
              ...prev, 
              location: { ...prev.location, meetingLink } as any
            }))}
          />
        )}
      </Card>

      {/* Capacity */}
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          👥 {t("capacity") || "Kapasitet"}
        </Text>

        <Input
          label={t("maxAttendees") || "Maks antall deltakere"}
          placeholder={t("unlimitedIfEmpty") || "La stå tom for ubegrenset"}
          value={formData.maxAttendees?.toString() || ""}
          onChangeText={(value) => setFormData(prev => ({ 
            ...prev, 
            maxAttendees: value ? parseInt(value) || undefined : undefined
          }))}
          keyboardType="numeric"
          containerStyle={{ marginBottom: 12 }}
        />

        <TouchableOpacity
          onPress={() => setFormData(prev => ({ ...prev, waitlistEnabled: !prev.waitlistEnabled }))}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: formData.waitlistEnabled ? theme.colors.primary : "transparent",
            marginRight: 12,
            justifyContent: "center",
            alignItems: "center",
          }}>
            {formData.waitlistEnabled && (
              <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
            )}
          </View>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>
            {t("enableWaitlist") || "Aktiver venteliste"}
          </Text>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderAdvancedSettings = () => (
    <ScrollView>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, color: theme.colors.text }}>
        {t("advancedSettings") || "Avanserte innstillinger"}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginBottom: 24 }}>
        {t("customizeEventBehavior") || "Tilpass arrangementets funksjoner"}
      </Text>

      {/* Cost */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          💰 {t("costInformation") || "Kostnadsinformasjon"}
        </Text>

        <Input
          label={t("eventCost") || "Pris per person (NOK)"}
          placeholder={t("freeIfEmpty") || "La stå tom for gratis"}
          value={formData.cost?.amount?.toString() || ""}
          onChangeText={(value) => {
            const amount = value ? parseInt(value) || 0 : undefined;
            setFormData(prev => ({ 
              ...prev, 
              cost: amount ? { 
                ...prev.cost, 
                amount, 
                currency: "NOK" as const 
              } : undefined
            }));
          }}
          keyboardType="numeric"
          containerStyle={{ marginBottom: 12 }}
        />

        {formData.cost && (
          <>
            <Input
              label={t("costDescription") || "Kostnadsbeskrivelse"}
              placeholder={t("costDescriptionPlaceholder") || "F.eks. 'Inkluderer mat og aktiviteter'"}
              value={formData.cost.description || ""}
              onChangeText={(description) => setFormData(prev => ({ 
                ...prev, 
                cost: { ...prev.cost!, description }
              }))}
              containerStyle={{ marginBottom: 12 }}
            />

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
                {t("paymentDeadline") || "Betalingsfrist"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentDeadlinePicker(true)}
                style={{
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 16,
                }}
              >
                <Text style={{ color: theme.colors.text }}>
                  {formData.cost.paymentDeadline 
                    ? dayjs(formData.cost.paymentDeadline).format("DD. MMMM YYYY")
                    : t("selectDate") || "Velg dato"
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Payment Methods */}
            <View>
              <Text style={{ fontWeight: "600", marginBottom: 8, color: theme.colors.text }}>
                {t("paymentMethods") || "Betalingsmåter"}
              </Text>
              {[
                { key: "vipps", label: "📱 Vipps" },
                { key: "bank_transfer", label: "🏦 Bankoverføring" },
                { key: "cash", label: "💵 Kontant" },
                { key: "invoice", label: "📄 Faktura" },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    const methods = formData.cost?.paymentMethods || [];
                    const hasMethod = methods.includes(key as any);
                    const newMethods = hasMethod 
                      ? methods.filter(m => m !== key)
                      : [...methods, key as any];
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      cost: { ...prev.cost!, paymentMethods: newMethods }
                    }));
                  }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                    backgroundColor: formData.cost?.paymentMethods?.includes(key as any) ? theme.colors.primary : "transparent",
                    marginRight: 12,
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                    {formData.cost?.paymentMethods?.includes(key as any) && (
                      <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
                    )}
                  </View>
                  <Text style={{ fontWeight: "600", color: theme.colors.text }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* Weather Backup */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          ☔ {t("weatherBackup") || "Værreserve"}
        </Text>

        <TouchableOpacity
          onPress={() => setFormData(prev => ({ 
            ...prev, 
            weatherBackup: prev.weatherBackup ? undefined : { required: true }
          }))}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
        >
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            backgroundColor: formData.weatherBackup ? theme.colors.primary : "transparent",
            marginRight: 12,
            justifyContent: "center",
            alignItems: "center",
          }}>
            {formData.weatherBackup && (
              <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
            )}
          </View>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>
            {t("weatherDependent") || "Væravhengig arrangement"}
          </Text>
        </TouchableOpacity>

        {formData.weatherBackup && (
          <>
            <Input
              label={t("alternativeLocation") || "Alternativ lokasjon"}
              placeholder={t("alternativeLocationPlaceholder") || "F.eks. 'Innendørs i gymsalen'"}
              value={formData.weatherBackup.alternativeLocation || ""}
              onChangeText={(alternativeLocation) => setFormData(prev => ({ 
                ...prev, 
                weatherBackup: { ...prev.weatherBackup!, alternativeLocation }
              }))}
              containerStyle={{ marginBottom: 12 }}
            />

            <Input
              label={t("weatherThreshold") || "Værterskel"}
              placeholder={t("weatherThresholdPlaceholder") || "F.eks. 'Kraftig regn', 'Under 0°C'"}
              value={formData.weatherBackup.weatherThreshold || ""}
              onChangeText={(weatherThreshold) => setFormData(prev => ({ 
                ...prev, 
                weatherBackup: { ...prev.weatherBackup!, weatherThreshold }
              }))}
            />
          </>
        )}
      </Card>

      {/* Coordination Features */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
          🤝 {t("coordinationFeatures") || "Koordineringsfunksjoner"}
        </Text>

        {Object.entries({
          allowVolunteerSignup: { label: t("volunteerSignup") || "Frivillig påmelding", icon: "🙋‍♀️" },
          allowResourceSharing: { label: t("resourceSharing") || "Ressursdeling", icon: "📦" },
          carpoolingEnabled: { label: t("carpooling") || "Samkjøring", icon: "🚗" },
        }).map(([key, config]) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setFormData(prev => ({
                ...prev,
                coordination: {
                  ...prev.coordination,
                  [key]: !(prev.coordination as any)[key],
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
                backgroundColor: (formData.coordination as any)[key] ? theme.colors.primary : "transparent",
                marginRight: 12,
                justifyContent: "center",
                alignItems: "center",
              }}>
                {(formData.coordination as any)[key] && (
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

      {/* Norwegian Cultural Context */}
      {formData.type !== "custom" && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12, color: theme.colors.text }}>
            🇳🇴 {t("norwegianCulturalContext") || "Norsk kulturell kontekst"}
          </Text>

          <Input
            label={t("traditionalElement") || "Tradisjonelt element"}
            placeholder={t("traditionalElementPlaceholder") || "F.eks. 'Bunadsgang og flagg'"}
            value={formData.norwegianCulturalContext?.traditionalElement || ""}
            onChangeText={(traditionalElement) => setFormData(prev => ({ 
              ...prev, 
              norwegianCulturalContext: { 
                ...prev.norwegianCulturalContext, 
                traditionalElement 
              }
            }))}
            containerStyle={{ marginBottom: 12 }}
          />

          <Input
            label={t("dresscode") || "Klesskode"}
            placeholder={t("dresscodePlaceholder") || "F.eks. 'Bunad eller fine klær'"}
            value={formData.norwegianCulturalContext?.dresscode || ""}
            onChangeText={(dresscode) => setFormData(prev => ({ 
              ...prev, 
              norwegianCulturalContext: { 
                ...prev.norwegianCulturalContext, 
                dresscode 
              }
            }))}
          />
        </Card>
      )}
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderTemplateSelection();
      case 1: return renderBasicInfo();
      case 2: return renderAdvancedSettings();
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
            {t("createEvent") || "Opprett arrangement"}
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
                ? (t("createEvent") || "Opprett arrangement")
                : (t("next") || "Neste")
            }
            onPress={() => {
              if (currentStep === 2) {
                handleSubmit();
              } else {
                setCurrentStep(prev => prev + 1);
              }
            }}
            disabled={!canProceedToNextStep() || createEventMutation.isPending}
            loading={createEventMutation.isPending}
            style={{ flex: 1 }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === "start" ? formData.startTime : formData.endTime}
          mode={formData.isAllDay ? "date" : "datetime"}
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate) {
              if (showDatePicker === "start") {
                setFormData(prev => ({ 
                  ...prev, 
                  startTime: selectedDate,
                  endTime: dayjs(selectedDate).add(2, "hours").toDate(),
                }));
              } else {
                setFormData(prev => ({ ...prev, endTime: selectedDate }));
              }
            }
          }}
        />
      )}

      {showPaymentDeadlinePicker && formData.cost && (
        <DateTimePicker
          value={formData.cost.paymentDeadline || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPaymentDeadlinePicker(false);
            if (selectedDate) {
              setFormData(prev => ({ 
                ...prev, 
                cost: { ...prev.cost!, paymentDeadline: selectedDate }
              }));
            }
          }}
        />
      )}
    </ScreenContainer>
  );
}