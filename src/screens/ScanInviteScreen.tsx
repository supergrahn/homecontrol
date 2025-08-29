import React from "react";
import { View, Text, Alert, Platform } from "react-native";
import Button from "../components/Button";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { parseInviteFromUrl } from "../services/inviteLinks";
import { acceptInvite } from "../services/invites";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function ScanInviteScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { selectHousehold } = useHousehold();
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [scanned, setScanned] = React.useState(false);
  const [Scanner, setScanner] = React.useState<any | null>(null);
  const [scannerError, setScannerError] = React.useState<string | null>(null);
  const [pasting, setPasting] = React.useState(false);

  React.useEffect(() => {
    // Scanner module intentionally disabled in this build to avoid native linking issues.
    // Fallback to paste-from-clipboard flow only.
    setScanner(null);
    setScannerError(
      Platform.OS === "ios"
        ? (t("scannerUnavailableUseDevClient") as string) ||
            "QR scanner isn’t available in this build. Use a dev build with scanner support, or paste an invite link instead."
        : (t("scannerUnavailable") as string) ||
            "QR scanner isn’t available in this build. Paste an invite link instead."
    );
    setHasPermission(false);
  }, [t]);

  // Auto-accept invite if deep link params are provided
  React.useEffect(() => {
    (async () => {
      try {
        const hid = route?.params?.hid as string | undefined;
        const inviteId = route?.params?.inviteId as string | undefined;
        const token = route?.params?.token as string | undefined;
        if (hid && inviteId && token) {
          await acceptInvite(hid, inviteId, token);
          await selectHousehold(hid);
          navigation.replace("MainTabs");
        }
      } catch {}
    })();
  }, [route?.params, navigation, selectHousehold]);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const parsed = parseInviteFromUrl(data);
      if (!parsed) {
        Alert.alert(t("scannedInvalidInvite") || "Not a valid invite link");
        setScanned(false);
        return;
      }
      await acceptInvite(parsed.householdId, parsed.inviteId, parsed.token);
      await selectHousehold(parsed.householdId);
      navigation.replace("MainTabs");
    } catch (e) {
      Alert.alert(t("actionFailed") || "Something went wrong.", String(e));
      setScanned(false);
    }
  };

  const handlePasteInvite = async () => {
    try {
      setPasting(true);
      const data = await Clipboard.getStringAsync();
      if (!data) {
        Alert.alert(t("noClipboardData") || "Clipboard is empty.");
        return;
      }
      const parsed = parseInviteFromUrl(data);
      if (!parsed) {
        Alert.alert(t("scannedInvalidInvite") || "Not a valid invite link");
        return;
      }
      await acceptInvite(parsed.householdId, parsed.inviteId, parsed.token);
      await selectHousehold(parsed.householdId);
      navigation.replace("MainTabs");
    } catch (e) {
      Alert.alert(t("actionFailed") || "Something went wrong.", String(e));
    } finally {
      setPasting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{t("scanning") || "Scanning…"}</Text>
      </View>
    );
  }

  if (!Scanner) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          {scannerError ||
            (t("scannerUnavailableUseDevClient") as string) ||
            "QR scanner isn’t available. Use a development build to scan invites, or paste an invite link instead."}
        </Text>
        <View style={{ gap: 12, width: "100%" }}>
          <Button
            title={
              pasting
                ? t("pasting") || "Pasting…"
                : t("pasteInviteLink") || "Paste invite link"
            }
            onPress={handlePasteInvite}
            disabled={pasting}
          />
          <Button
            title={t("goBack") || "Go back"}
            onPress={() => navigation.goBack?.()}
          />
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          {t("cameraPermissionDenied") ||
            "Camera permission denied. Enable camera in settings."}
        </Text>
        <View style={{ gap: 12, width: "100%", marginTop: 12 }}>
          <Button
            title={
              pasting
                ? t("pasting") || "Pasting…"
                : t("pasteInviteLink") || "Paste invite link"
            }
            onPress={handlePasteInvite}
            disabled={pasting}
          />
          <Button
            title={t("goBack") || "Go back"}
            onPress={() => navigation.goBack?.()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Scanner style={{ flex: 1 }} onBarCodeScanned={handleScan as any} />
      {scanned ? (
        <View style={{ position: "absolute", bottom: 32, left: 16, right: 16 }}>
          <Button
            title={t("scanInvite") || "Scan invite"}
            onPress={() => setScanned(false)}
          />
        </View>
      ) : null}
    </View>
  );
}
