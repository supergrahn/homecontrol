import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { createHousehold, findPotentialHouseholdMatches } from "../services/households";
import { acceptInvite } from "../services/invites";
import { parseInviteFromUrl } from "../services/inviteLinks";
import * as Clipboard from "expo-clipboard";
import Input from "../components/Input";
import Button from "../components/Button";
import { setUserDisplayName } from "../services/user";
import { auth } from "../firebase";
import { NorwegianFamilyStructure, NORWEGIAN_FAMILY_TEMPLATES } from "../models/Household";

export default function CreateHouseholdScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { selectHousehold } = useHousehold();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [yourName, setYourName] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState("");
  const [parsed, setParsed] = React.useState<{
    householdId: string;
    inviteId: string;
    token: string;
  } | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [suggestedHouseholds, setSuggestedHouseholds] = React.useState<any[]>([]);
  const [showFamilyStructure, setShowFamilyStructure] = React.useState(false);
  const [selectedFamilyStructure, setSelectedFamilyStructure] = React.useState<NorwegianFamilyStructure>("traditional");
  const nameRef = React.useRef<any>(null);
  const yourNameRef = React.useRef<any>(null);
  const inviteRef = React.useRef<any>(null);

  const canSkip = true; // always allow skipping onboarding

  // Prefill from existing profile
  React.useEffect(() => {
    const dn = auth.currentUser?.displayName || "";
    if (!yourName && dn) setYourName(dn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Try to parse invite link as user types/pastes
  React.useEffect(() => {
    if (!inviteUrl.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }
    try {
      const res = parseInviteFromUrl(inviteUrl.trim());
      if (res) {
        setParsed(res);
        setParseError(null);
      } else {
        setParsed(null);
        setParseError(t("invalidInviteLink") || "Invalid invite link");
      }
    } catch {
      setParsed(null);
      setParseError(t("invalidInviteLink") || "Invalid invite link");
    }
  }, [inviteUrl, t]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View
              style={{
                width: "100%",
                maxWidth: 480,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: theme.colors.text,
                }}
              >
                {t("onboarding.setupFamily") || "Set up your family"}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {t("onboarding.familySetupHint") ||
                  "Create your family's household or connect to an existing one."}
              </Text>
            </View>

            {/* Create form */}
            <View style={{ width: "100%", maxWidth: 480 }}>
              {/* Your name input */}
              <Input
                ref={yourNameRef}
                placeholder={t("yourName") || "Your name"}
                value={yourName}
                onChangeText={(v) => {
                  setYourName(v);
                  if (nameError) setNameError(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                containerStyle={{ marginBottom: 12 }}
                onSubmitEditing={() => nameRef.current?.focus?.()}
                accessibilityLabel={t("yourName") || "Your name"}
                testID="yourNameInput"
              />
              <Text
                style={{
                  color: theme.colors.muted,
                  marginTop: -4,
                  marginBottom: 8,
                }}
              >
                {t("yourNameHint") ||
                  "Shown to your household; you can change it later."}
              </Text>
              {nameError ? (
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={theme.colors.text}
                  />
                  <Text style={{ color: theme.colors.text, marginLeft: 8 }}>
                    {nameError}
                  </Text>
                </View>
              ) : null}
              {/* Create household input */}
              <Input
                ref={nameRef}
                placeholder={t("householdName")}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="go"
                containerStyle={{ marginBottom: 12 }}
                onSubmitEditing={async () => {
                  if (!name.trim() || saving) return;
                  try {
                    setSaving(true);
                    setCreateError(null);
                    const trimmed = name.trim();
                    if (trimmed.length < 2) {
                      setCreateError(
                        t("validation.householdNameShort") ||
                          "Please enter at least 2 characters"
                      );
                    } else {
                      const yn = yourName.trim();
                      if (!yn) {
                        setNameError(
                          t("validation.nameRequired") ||
                            "Please enter your name"
                        );
                      } else {
                        await setUserDisplayName(yn);
                        const id = await createHousehold(trimmed, selectedFamilyStructure);
                        await selectHousehold(id);
                        navigation.replace("MainTabs");
                      }
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                accessibilityLabel={t("householdName") || "Household name"}
                testID="householdNameInput"
              />
              {createError ? (
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={theme.colors.text}
                  />
                  <Text style={{ color: theme.colors.text, marginLeft: 8 }}>
                    {createError}
                  </Text>
                </View>
              ) : null}
              <Button
                title={saving ? "…" : (t("createHousehold") as string)}
                disabled={!name.trim() || saving}
                onPress={async () => {
                  try {
                    setSaving(true);
                    setCreateError(null);
                    const trimmed = name.trim();
                    if (trimmed.length < 2) {
                      setCreateError(
                        t("validation.householdNameShort") ||
                          "Please enter at least 2 characters"
                      );
                      return;
                    }
                    const yn = yourName.trim();
                    if (!yn) {
                      setNameError(
                        t("validation.nameRequired") || "Please enter your name"
                      );
                      return;
                    }
                    try {
                      await setUserDisplayName(yn);
                      const id = await createHousehold(trimmed, selectedFamilyStructure);
                      await selectHousehold(id);
                      navigation.replace("MainTabs");
                    } catch {
                      setCreateError(
                        t("actionFailed") || "Something went wrong."
                      );
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
              />

              {/* Norwegian Family Structure Selection */}
              <View style={{ height: 24 }} />
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ fontSize: 28, marginRight: 8 }}>🇳🇴</Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: theme.colors.text,
                      flex: 1,
                    }}
                  >
                    {t("onboarding.norwegianFamilies") || "Norske familier"}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.muted, marginBottom: 16 }}>
                  {t("onboarding.chooseFamilyStructure") || 
                   "Velg familiestrukturen som passer best for deres situasjon. Dette hjelper oss å tilpasse appen til deres behov."}
                </Text>
                
                {/* Family Structure Options */}
                {Object.entries(NORWEGIAN_FAMILY_TEMPLATES).map(([structureType, template]) => {
                  const isSelected = selectedFamilyStructure === structureType;
                  return (
                    <TouchableOpacity
                      key={structureType}
                      style={{
                        backgroundColor: isSelected ? theme.colors.primary + '15' : 'transparent',
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      onPress={() => setSelectedFamilyStructure(structureType as NorwegianFamilyStructure)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text style={{ fontSize: 24, marginRight: 12 }}>
                        {template.icon}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: isSelected ? theme.colors.primary : theme.colors.text,
                            marginBottom: 4,
                          }}
                        >
                          {template.displayName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.muted,
                            marginBottom: 8,
                          }}
                        >
                          {template.description}
                        </Text>
                        {template.culturalNotes.length > 0 && (
                          <Text style={{ fontSize: 12, color: theme.colors.muted, fontStyle: "italic" }}>
                            {template.culturalNotes[0]}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSelected ? theme.colors.primary : theme.colors.muted}
                      />
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    marginTop: 8,
                  }}
                  onPress={() => setShowFamilyStructure(!showFamilyStructure)}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={theme.colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ color: theme.colors.primary, fontWeight: "500" }}>
                    {showFamilyStructure 
                      ? (t("onboarding.lessInfo") || "Mindre info")
                      : (t("onboarding.moreInfo") || "Mer info om familietyper")
                    }
                  </Text>
                  <Ionicons
                    name={showFamilyStructure ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.primary}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                
                {showFamilyStructure && (
                  <View 
                    style={{ 
                      marginTop: 16, 
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "600", marginBottom: 12 }}>
                      {t("onboarding.whyFamilyStructure") || "Hvorfor spør vi om familiestruktur?"}
                    </Text>
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}>
                        • {t("onboarding.reasonScheduling") || "Tilpasser oppgaveplanlegging til deres rutiner"}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}>
                        • {t("onboarding.reasonCustody") || "Støtter delt omsorg og koordinering mellom husholdninger"}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}>
                        • {t("onboarding.reasonCultural") || "Respekterer norske familieverdier og kulturtradisjon"}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}>
                        • {t("onboarding.reasonNotifications") || "Sender relevant kommunikasjon til riktige personer"}
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.muted, marginTop: 12, fontSize: 12, fontStyle: "italic" }}>
                      {t("onboarding.changeLater") || "Du kan endre familiestruktur når som helst i innstillingene."}
                    </Text>
                  </View>
                )}
              </View>

              {/* Join via invite link */}
              <View style={{ height: 8 }} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  marginBottom: 8,
                  color: theme.colors.text,
                }}
              >
                {t("onboarding.haveInviteLink") || "Have an invite link?"}
              </Text>
              {/* Invite link input */}
              <Input
                ref={inviteRef}
                placeholder={
                  t("onboarding.pasteInviteLink") || "Paste invite link"
                }
                value={inviteUrl}
                onChangeText={setInviteUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                containerStyle={{}}
                onSubmitEditing={async () => {
                  if (!parsed || joining) return;
                  try {
                    setJoining(true);
                    setJoinError(null);
                    const yn = yourName.trim();
                    if (yn) {
                      try {
                        await setUserDisplayName(yn);
                      } catch {}
                    }
                    await acceptInvite(
                      parsed.householdId,
                      parsed.inviteId,
                      parsed.token
                    );
                    await selectHousehold(parsed.householdId);
                    navigation.replace("MainTabs");
                  } catch (e: any) {
                    const code = String(e?.code || e?.message || "");
                    const msg = code.includes("not-found")
                      ? (t("inviteNotFound") as string) || "Invite not found"
                      : code.includes("failed-precondition")
                        ? (t("inviteExpiredOrInvalid") as string) ||
                          "Invite expired or invalid"
                        : code.includes("permission-denied")
                          ? (t("inviteBadToken") as string) ||
                            "Invite token invalid"
                          : (t("actionFailed") as string) ||
                            "Something went wrong.";
                    setJoinError(msg);
                  } finally {
                    setJoining(false);
                  }
                }}
                accessibilityLabel={
                  t("onboarding.pasteInviteLink") || "Paste invite link"
                }
                testID="inviteLinkInput"
              />
              {parseError ? (
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name="warning"
                    size={18}
                    color={theme.colors.text}
                  />
                  <Text style={{ color: theme.colors.text, marginLeft: 8 }}>
                    {parseError}
                  </Text>
                </View>
              ) : null}
              {joinError ? (
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  accessibilityRole="alert"
                >
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={theme.colors.text}
                  />
                  <Text style={{ color: theme.colors.text, marginLeft: 8 }}>
                    {joinError}
                  </Text>
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const val = await Clipboard.getStringAsync();
                      if (val) setInviteUrl(val.trim());
                    } catch {}
                  }}
                  accessibilityRole="button"
                >
                  <Text
                    style={{ color: theme.colors.primary, fontWeight: "600" }}
                  >
                    {t("pasteFromClipboard") || "Paste from clipboard"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate("ScanInvite")}
                  accessibilityRole="button"
                >
                  <Text style={{ color: theme.colors.primary }}>
                    {t("scanQrInvite") || "Scan QR invite"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 12 }} />
              <Button
                title={
                  joining
                    ? "…"
                    : t("joinHousehold") || (t("join") as string) || "Join"
                }
                disabled={!parsed || joining}
                onPress={async () => {
                  if (!parsed) return;
                  try {
                    setJoining(true);
                    setJoinError(null);
                    const yn = yourName.trim();
                    if (yn) {
                      try {
                        await setUserDisplayName(yn);
                      } catch {}
                    }
                    await acceptInvite(
                      parsed.householdId,
                      parsed.inviteId,
                      parsed.token
                    );
                    await selectHousehold(parsed.householdId);
                    navigation.replace("MainTabs");
                  } catch (e: any) {
                    const code = String(e?.code || e?.message || "");
                    const msg = code.includes("not-found")
                      ? (t("inviteNotFound") as string) || "Invite not found"
                      : code.includes("failed-precondition")
                        ? (t("inviteExpiredOrInvalid") as string) ||
                          "Invite expired or invalid"
                        : code.includes("permission-denied")
                          ? (t("inviteBadToken") as string) ||
                            "Invite token invalid"
                          : (t("actionFailed") as string) ||
                            "Something went wrong.";
                    setJoinError(msg);
                  } finally {
                    setJoining(false);
                  }
                }}
              />

              {canSkip ? (
                <View style={{ marginTop: 12, alignItems: "flex-end" }}>
                  <TouchableOpacity
                    onPress={() => navigation.replace("MainTabs")}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: theme.colors.muted }}>
                      {t("skip") || "Skip"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
