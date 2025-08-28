import React from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { createHousehold } from "../services/households";
import { acceptInvite } from "../services/invites";
import { parseInviteFromUrl } from "../services/inviteLinks";
import * as Clipboard from "expo-clipboard";

export default function CreateHouseholdScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { selectHousehold } = useHousehold();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState("");
  const [parsed, setParsed] = React.useState<
    | { householdId: string; inviteId: string; token: string }
    | null
  >(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const canSkip = true; // always allow skipping onboarding

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
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        {t("createHousehold")}
      </Text>
      <Text style={{ color: "#555", marginBottom: 8 }}>
        {t("onboarding.createOrJoin") || "Create a household or join with an invite link."}
      </Text>
      <TextInput
        placeholder={t("householdName")}
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 8 }}
      />
      <Button
        title={saving ? "…" : t("createHousehold")}
        disabled={!name.trim() || saving}
        onPress={async () => {
          try {
            setSaving(true);
            const trimmed = name.trim();
            if (trimmed.length < 2) {
              Alert.alert(t("validation.householdNameShort") || "Please enter at least 2 characters");
              return;
            }
            const id = await createHousehold(trimmed);
            await selectHousehold(id);
            navigation.replace("MainTabs");
          } finally {
            setSaving(false);
          }
        }}
      />
      {/* Join via invite link */}
      <View style={{ height: 24 }} />
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        {t("onboarding.haveInviteLink") || "Have an invite link?"}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            placeholder={t("onboarding.pasteInviteLink") || "Paste invite link"}
            value={inviteUrl}
            onChangeText={setInviteUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ borderWidth: 1, borderColor: parseError ? "#f66" : "#ddd", borderRadius: 8, padding: 10 }}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={t("pasteFromClipboard") || "Paste from clipboard"}
            onPress={async () => {
              try {
                const val = await Clipboard.getStringAsync();
                if (val) setInviteUrl(val.trim());
              } catch {}
            }}
          />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
          <Button
            title={t("scanQrInvite") || "Scan QR invite"}
            onPress={() => navigation.navigate("ScanInvite")}
          />
        </View>
      </View>
      {parseError ? (
        <Text style={{ color: "#c00", marginBottom: 8 }}>{parseError}</Text>
      ) : null}
      <Button
        title={t("joinHousehold") || t("join") || "Join"}
        disabled={!parsed}
        onPress={async () => {
          if (!parsed) return;
          try {
            await acceptInvite(parsed.householdId, parsed.inviteId, parsed.token);
            await selectHousehold(parsed.householdId);
            navigation.replace("MainTabs");
          } catch (e: any) {
            const code = String(e?.code || e?.message || "");
            const msg =
              code.includes("not-found")
                ? t("inviteNotFound") || "Invite not found"
                : code.includes("failed-precondition")
                  ? t("inviteExpiredOrInvalid") || "Invite expired or invalid"
                  : code.includes("permission-denied")
                    ? t("inviteBadToken") || "Invite token invalid"
                    : t("actionFailed") || "Something went wrong.";
            Alert.alert(msg);
          }
        }}
      />
      {canSkip ? (
        <View style={{ marginTop: 12 }}>
          <Button title={t("skip") || "Skip"} onPress={() => navigation.replace("MainTabs")} />
        </View>
      ) : null}
    </View>
  );
}
