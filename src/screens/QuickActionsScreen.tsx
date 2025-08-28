import React from "react";
import { View, Text, TouchableOpacity, Share, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { createInvite } from "../services/invites";

export default function QuickActionsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { householdId, households } = useHousehold();
  const role = households.find((h) => h.id === householdId)?.role;
  const Item = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 14 }}>
      <Text style={{ fontSize: 17 }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 16 }}>
        {t("quickActions") || "Quick actions"}
      </Text>
      <Item label={t("newTask") || "New Task"} onPress={() => navigation.replace("AddTask")} />
  <Item label={(t("calendar") as string) || "Calendar"} onPress={() => navigation.replace("Calendar")} />
  <Item label={(t("manageTemplates") as string) || "Manage templates"} onPress={() => navigation.replace("ManageTemplates")} />
      {role === "admin" ? (
        <Item label={t("showHouseholdQr") || "Show Household QR"} onPress={() => navigation.replace("ShowHouseholdQR")} />
      ) : null}
      <Item label={t("scanHouseholdQr") || "Scan Household QR"} onPress={() => navigation.replace("ScanInvite")} />
      {role === "admin" ? (
        <Item
          label={t("shareHouseholdInvite") || "Share Household Invite"}
          onPress={async () => {
            try {
              if (!householdId) return;
              const res = await createInvite(householdId, "", "adult");
              const link = res.url || undefined;
              if (link) {
                await Share.share({ message: link });
              } else {
                Alert.alert(t("inviteLinkUnavailable") || "Invite link unavailable");
              }
            } catch (e: any) {
              const code = String(e?.code || e?.message || "");
              const msg = code.includes("resource-exhausted")
                ? (t("tooManyInvites") as string) || "Too many invites; try again later"
                : (t("actionFailed") as string) || "Something went wrong.";
              Alert.alert(msg);
            }
          }}
        />
      ) : null}
    </View>
  );
}
