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
import { createHousehold } from "../services/households";
import { acceptInvite } from "../services/invites";
import { parseInviteFromUrl } from "../services/inviteLinks";
import * as Clipboard from "expo-clipboard";
import Input from "../components/Input";
import Button from "../components/Button";
import { setUserDisplayName } from "../services/user";
import { auth } from "../firebase";

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
                {t("createHousehold")}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                {t("onboarding.createOrJoin") ||
                  "Create a household or join with an invite link."}
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
                        const id = await createHousehold(trimmed);
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
                      const id = await createHousehold(trimmed);
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

              {/* Join via invite link */}
              <View style={{ height: 24 }} />
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
