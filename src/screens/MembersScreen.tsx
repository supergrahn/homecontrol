import React from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  Share,
  TouchableOpacity,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { listMembers, setMemberRole, type Member } from "../services/members";
import { getWorkloadHeatmap, type Heatmap } from "../services/workload";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { getFairnessStats, type FairnessUser } from "../services/stats";
import Card from "../components/Card";
import SettingsRow from "../components/SettingsRow";
import Button from "../components/Button";
import { useTranslation } from "react-i18next";
import { createInvite as createInviteFn } from "../services/invites";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";

export default function MembersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { householdId, households } = useHousehold();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<null | {
    users: FairnessUser[];
    totals: { completed: number; assigned: number };
  }>(null);
  const [heatmap, setHeatmap] = React.useState<Heatmap | null>(null);
  const roleInHh = households?.find((h) => h.id === householdId)?.role;
  const isAdmin = roleInHh === "admin";
  // Compute admin count once per render, not inside renderItem callback
  const adminCount = React.useMemo(
    () => members.filter((m) => m.role === "admin").length,
    [members]
  );

  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        setMembers(await listMembers(householdId));
        try {
          const s = await getFairnessStats(householdId);
          setStats({ users: s.users, totals: s.totals });
        } catch {}
        try {
          const h = await getWorkloadHeatmap(householdId);
          setHeatmap(h);
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  return (
    <ScreenContainer>
      <FlatList
        data={members}
        keyExtractor={(m) => m.userId}
        refreshing={loading}
        onRefresh={async () => {
          if (householdId) setMembers(await listMembers(householdId));
        }}
        renderItem={({ item, index }) => {
          const canEdit = isAdmin && item.userId !== auth.currentUser?.uid;
          const onToggleRole = () => {
            if (!householdId) return;
            if (item.role === "admin" && adminCount <= 1) {
              Alert.alert(
                t("notAllowed") || "Not allowed",
                (t("cannotRemoveLastAdmin") as string) ||
                  "You can’t remove the last admin."
              );
              return;
            }
            const makeAdmin = item.role !== "admin";
            Alert.alert(
              t("confirm") || "Confirm",
              makeAdmin
                ? (t("confirmMakeAdmin") as string) ||
                    "Make this member an admin?"
                : (t("confirmDemote") as string) ||
                    "Demote this member to adult?",
              [
                { text: t("cancel") || "Cancel", style: "cancel" },
                {
                  text: makeAdmin
                    ? (t("makeAdmin") as string) || "Make admin"
                    : (t("demote") as string) || "Demote",
                  onPress: async () => {
                    try {
                      await setMemberRole(
                        householdId,
                        item.userId,
                        makeAdmin ? "admin" : "adult"
                      );
                      setMembers(await listMembers(householdId));
                    } catch (e) {
                      Alert.alert(t("actionFailed") || "Something went wrong.");
                    }
                  },
                },
              ]
            );
          };
          return (
            <SettingsRow
              label={item.displayName || item.userId}
              right={
                item.role ? (
                  <TouchableOpacity
                    onPress={canEdit ? onToggleRole : undefined}
                    disabled={!canEdit}
                    accessibilityRole={canEdit ? "button" : undefined}
                    accessibilityLabel={
                      canEdit
                        ? (t("changeRole") as string) || "Change role"
                        : undefined
                    }
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor:
                        item.role === "admin"
                          ? theme.colors.accentMint
                          : theme.colors.surface,
                      opacity: canEdit ? 1 : 0.9,
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "600" }}
                    >
                      {t(`role.${item.role}`) || item.role}
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
              style={
                index === 0
                  ? { borderTopWidth: 1, borderColor: theme.colors.border }
                  : undefined
              }
            />
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text
              style={{
                color: theme.colors.muted,
                textAlign: "center",
                marginTop: 24,
              }}
            >
              No members yet
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Text
              style={{ ...theme.typography.h2, color: theme.colors.onSurface }}
            >
              {t("members") || "Members"}
            </Text>
            {householdId ? (
              <Card>
                <Text
                  style={{
                    ...theme.typography.subtitle,
                    color: theme.colors.onSurface,
                    marginBottom: 8,
                  }}
                >
                  {t("invites") || "Invites"}
                </Text>
                <View style={{ gap: 8 }}>
                  {isAdmin ? (
                    <Button
                      title={
                        (t("shareHouseholdInvite") as string) ||
                        "Share Household Invite"
                      }
                      onPress={async () => {
                        try {
                          if (!householdId) return;
                          const res = await createInviteFn(
                            householdId,
                            "",
                            "adult"
                          );
                          const link = res.url || undefined;
                          if (link) {
                            await Share.share({ message: link });
                          } else {
                            Alert.alert(
                              (t("inviteLinkUnavailable") as string) ||
                                "Invite link unavailable"
                            );
                          }
                        } catch (e: any) {
                          const code = String(e?.code || e?.message || "");
                          const msg = code.includes("resource-exhausted")
                            ? (t("tooManyInvites") as string) ||
                              "Too many invites; try again later"
                            : (t("actionFailed") as string) ||
                              "Something went wrong.";
                          Alert.alert(msg);
                        }
                      }}
                    />
                  ) : null}
                  {isAdmin ? (
                    <Button
                      title={
                        (t("showHouseholdQr") as string) || "Show Household QR"
                      }
                      onPress={() => navigation.navigate("ShowHouseholdQR")}
                    />
                  ) : null}
                  <Button
                    title={(t("scanInvite") as string) || "Scan invite"}
                    onPress={() => navigation.navigate("ScanInvite")}
                  />
                </View>
              </Card>
            ) : null}
            {stats ? (
              <Card>
                <Text
                  style={{
                    ...theme.typography.subtitle,
                    color: theme.colors.onSurface,
                    marginBottom: 6,
                  }}
                >
                  Fairness
                </Text>
                {stats.users.map((u) => (
                  <View
                    key={u.userId}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{ flex: 1, color: theme.colors.text }}
                      numberOfLines={1}
                    >
                      {members.find((m) => m.userId === u.userId)
                        ?.displayName || u.userId}
                    </Text>
                    <Text
                      style={{
                        width: 64,
                        textAlign: "right",
                        color: theme.colors.text,
                      }}
                    >
                      {u.completed}
                    </Text>
                    <Text
                      style={{
                        width: 64,
                        textAlign: "right",
                        color: u.delta < 0 ? "#cc3d3d" : "#2a7",
                      }}
                    >
                      {u.delta >= 0 ? "+" : ""}
                      {u.delta}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
            {heatmap ? (
              <Card>
                <Text
                  style={{
                    ...theme.typography.subtitle,
                    color: theme.colors.onSurface,
                    marginBottom: 6,
                  }}
                >
                  Next 7 days
                </Text>
                <View style={{ flexDirection: "row", marginBottom: 6 }}>
                  <View style={{ width: 120 }} />
                  {heatmap.days.map((d) => (
                    <Text
                      key={d}
                      style={{
                        width: 28,
                        textAlign: "center",
                        color: theme.colors.muted,
                        fontSize: 11,
                      }}
                    >
                      {d.slice(5)}
                    </Text>
                  ))}
                </View>
                {members.map((m) => (
                  <View
                    key={m.userId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{ width: 120, color: theme.colors.text }}
                      numberOfLines={1}
                    >
                      {m.displayName || m.userId}
                    </Text>
                    {heatmap.days.map((day) => {
                      const key = `${day}|${m.userId}`;
                      const count = heatmap.cells[key] || 0;
                      const intensity = Math.min(1, count / 3);
                      const bg =
                        intensity === 0
                          ? "#F3F4F6"
                          : `rgba(99,102,241,${0.2 + 0.6 * intensity})`;
                      return (
                        <View
                          key={key}
                          style={{
                            width: 28,
                            height: 20,
                            marginRight: 4,
                            backgroundColor: bg,
                            borderRadius: 3,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              color:
                                intensity === 0
                                  ? theme.colors.muted
                                  : theme.colors.text,
                            }}
                          >
                            {count || ""}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}
