import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { BarCodeScanner } from "expo-barcode-scanner";
import { parseInviteFromUrl } from "../services/inviteLinks";
import { acceptInvite } from "../services/invites";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function ScanInviteScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { selectHousehold } = useHousehold();
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [scanned, setScanned] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

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

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{t("scanning") || "Scanning…"}</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          {t("cameraPermissionDenied") || "Camera permission denied. Enable camera in settings."}
        </Text>
        <Button
          title={t("requestPermission") || "Request permission"}
          onPress={async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === "granted");
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        style={{ flex: 1 }}
        onBarCodeScanned={handleScan as any}
      />
      {scanned ? (
        <View style={{ position: "absolute", bottom: 32, left: 16, right: 16 }}>
          <Button title={t("scanInvite") || "Scan invite"} onPress={() => setScanned(false)} />
        </View>
      ) : null}
    </View>
  );
}
