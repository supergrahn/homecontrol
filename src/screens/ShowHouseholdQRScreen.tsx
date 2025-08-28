import React from "react";
import { View, Text, ActivityIndicator, Button, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { createInvite } from "../services/invites";
import QRCode from "react-native-qrcode-svg";

export default function ShowHouseholdQRScreen() {
  const { t } = useTranslation();
  const { householdId, households } = useHousehold();
  const roleInHh = households.find((h) => h.id === householdId)?.role;
  const isAdmin = roleInHh === "admin";
  const [loading, setLoading] = React.useState(true);
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<"adult" | "admin">("adult");

  const generate = React.useCallback(async () => {
    if (!householdId) {
      setError(t("noHouseholdSelected") || "No household selected");
      setLoading(false);
      return;
    }
    if (!isAdmin) {
      setError(t("notAllowed") || "Not allowed");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await createInvite(householdId, "", role);
      const link = res.url || null;
      if (!link) {
        setError(t("inviteLinkUnavailable") || "Invite link unavailable");
        setUrl(null);
      } else {
        setUrl(link);
      }
    } catch (e) {
      setError(String(e));
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }, [householdId, isAdmin, role, t]);

  React.useEffect(() => {
    generate();
  }, [generate]);

  React.useEffect(() => {
    // regenerate when role changes
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>{error}</Text>
        <Button title={t("close") || "Close"} onPress={() => {}} />
      </View>
    );
  }

  if (!url) {
    return null;
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
        {t("showHouseholdQr") || "Show Household QR"}
      </Text>
      {/* Role selector */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {([
          { key: "adult", label: t("role.adult") || "adult" },
          { key: "admin", label: t("role.admin") || "admin" },
        ] as const).map((opt) => (
          <TouchableOpacity key={opt.key} onPress={() => setRole(opt.key)}>
            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: role === opt.key ? "#111" : "#eee",
              }}
            >
              <Text style={{ color: role === opt.key ? "#fff" : "#111" }}>{opt.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {url ? (
        <>
          <QRCode value={url} size={240} />
          <Text style={{ marginTop: 16, textAlign: "center", color: "#666" }}>{url}</Text>
        </>
      ) : null}
    </View>
  );
}
