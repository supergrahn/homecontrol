import React from "react";
import { View, Text, TouchableOpacity, Alert, Share, Switch, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useNavigation } from "@react-navigation/native";
import {
  createHousehold,
  updateHouseholdSettings,
} from "../services/households";
import {
  leaveHousehold,
  listMembers,
  type Member,
  removeMember,
  setMemberRole,
} from "../services/members";
import { deleteHouseholdRecursive } from "../services/functions";
import { useToast } from "../components/ToastProvider";
import { createInvite as createInviteFn } from "../services/invites";
import { listInvites, revokeInvite, type Invite } from "../services/invites";
import { getUserSettings, updateUserSettings } from "../services/users";
import {
  registerForPushNotificationsAsync,
  savePushToken,
} from "../services/push";
import { auth, db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import * as Notifications from "expo-notifications";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createCalendarShare,
  revokeCalendarShare,
  listCalendarShares,
  type CalendarShare,
} from "../services/calendar";
import { getFunctions, httpsCallable } from "firebase/functions";
import { flushOutbox } from "../services/outbox";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme, useThemeMode } from "../design/theme";
import Input from "../components/Input";
import Button from "../components/Button";
// AsyncStorage imported above; avoid duplicate import

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { householdId, households, selectHousehold } = useHousehold();
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"adult">("adult");
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [qhStart, setQhStart] = React.useState("21:00");
  const [qhEnd, setQhEnd] = React.useState("07:00");
  const [qhTz, setQhTz] = React.useState<string | undefined>(undefined);
  const [qhMode, setQhMode] = React.useState<"hard" | "soft">("hard");
  const [notifEnabled, setNotifEnabled] = React.useState<boolean>(true);
  const toast = useToast();
  const currentHousehold = households.find((h) => h.id === householdId);
  const isAdmin = currentHousehold?.role === "admin";
  const [hhTz, setHhTz] = React.useState<string>("");
  const [hhHour, setHhHour] = React.useState<string>("7");
  const [escalation, setEscalation] = React.useState<boolean>(false);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [digestOverdue, setDigestOverdue] = React.useState(true);
  const [digestUpcoming, setDigestUpcoming] = React.useState(true);
  const [digestWins, setDigestWins] = React.useState(false);
  const [digestTime, setDigestTime] = React.useState("07:00");
  const [shares, setShares] = React.useState<CalendarShare[]>([]);
  const [loadingShares, setLoadingShares] = React.useState(false);
  const [outboxCount, setOutboxCount] = React.useState<number>(0);
  const [nightBefore, setNightBefore] = React.useState<boolean>(false);
  React.useEffect(() => {
    (async () => {
      try {
        if (
          householdId &&
          households.find((h) => h.id === householdId)?.role === "admin"
        ) {
          setInvites(await listInvites(householdId));
        } else {
          setInvites([]);
        }
      } catch {}
      // Load outbox count
      try {
        const s = await AsyncStorage.getItem("outbox.v1");
        const arr = s ? JSON.parse(s) : [];
        setOutboxCount(Array.isArray(arr) ? arr.length : 0);
      } catch {}
      // Load quiet hours & night-before
      try {
        const s = await getUserSettings();
        if (s.quietHours?.start) setQhStart(s.quietHours.start);
        if (s.quietHours?.end) setQhEnd(s.quietHours.end);
        if (s.quietHours?.tz) setQhTz(s.quietHours.tz);
        if (s.quietHours?.mode === "soft") setQhMode("soft");
        if (typeof s.notificationsEnabled === "boolean")
          setNotifEnabled(s.notificationsEnabled);
        if (typeof s.nightBeforeReminder === "boolean")
          setNightBefore(!!s.nightBeforeReminder);
      } catch {}
      // Prefill household settings from Firestore
      // Load digest prefs (per-user per-household)
      try {
        if (householdId) {
          const fn = httpsCallable(getFunctions(), "getDigestPreferences");
          const res: any = await fn({ householdId });
          const p = res?.data?.prefs || {};
          const sec = p.sections || {};
          setDigestOverdue(sec.overdue !== false);
          setDigestUpcoming(sec.upcoming !== false);
          setDigestWins(sec.wins === true);
          const sch = p.schedule || {};
          if (typeof sch.time === "string") setDigestTime(sch.time);
        }
      } catch {}
      // Load calendar shares
      try {
        if (householdId) {
          setLoadingShares(true);
          setShares(await listCalendarShares(householdId));
        } else {
          setShares([]);
        }
      } catch {
      } finally {
        setLoadingShares(false);
      }
      try {
        if (householdId) {
          const snap = await (
            await import("firebase/firestore")
          ).getDoc(
            (await import("firebase/firestore")).doc(
              (await import("../firebase")).db,
              `households/${householdId}`
            )
          );
          const data = snap.data() as any;
          if (data?.timezone) setHhTz(String(data.timezone));
          if (typeof data?.digestHour === "number")
            setHhHour(String(data.digestHour));
          if (typeof data?.escalationEnabled === "boolean")
            setEscalation(Boolean(data.escalationEnabled));
        }
      } catch {}
    })();
  }, [householdId, households]);

  // Reactive members list
  React.useEffect(() => {
    if (!householdId) {
      setMembers([]);
      return;
    }
    const ref = collection(db, `households/${householdId}/members`);
    const unsub = onSnapshot(
      ref,
      async () => {
        try {
          setMembers(await listMembers(householdId));
        } catch {}
      },
      () => {}
    );
    return () => unsub();
  }, [householdId]);
  return (
    <ScreenContainer>
      {/* Account */}
      <View style={{ marginTop: 8, paddingVertical: 8 }}>
        <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("account") || "Account"}
        </Text>
        <Button
          title={(t("logOut") as string) || "Log out"}
          accessibilityLabel={(t("logOut") as string) || "Log out"}
          accessibilityHint={(t("hint.logOut") as string) || "Signs you out of this device."}
          variant="outline"
          onPress={async () => {
            try {
              await AsyncStorage.removeItem("@hc:selected_household");
            } catch {}
            try {
              await signOut(auth);
            } catch {}
          }}
        />
      </View>
      {/* Language (above Appearance) */}
      <View style={{ marginTop: 8, paddingVertical: 8 }}>
        <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("language") || "Language"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Button
            title="English"
            variant={i18n.language?.startsWith("en") ? "primary" : "outline"}
            onPress={() => {
              if (!i18n.language?.startsWith("en")) void i18n.changeLanguage("en");
            }}
          />
          <Button
            title="Norsk"
            variant={i18n.language?.startsWith("no") ? "primary" : "outline"}
            onPress={() => {
              if (!i18n.language?.startsWith("no")) void i18n.changeLanguage("no");
            }}
          />
        </View>
      </View>
      {/* Appearance */}
      <View style={{ marginTop: 8, paddingVertical: 8 }}>
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("appearance") || "Appearance"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: theme.colors.muted }}>
            {(t("themeMode") as string) || "Theme"}
          </Text>
          <Button
            title={`Theme: ${mode}`}
            onPress={() =>
              setMode(
                mode === "system"
                  ? "dark"
                  : mode === "dark"
                  ? "light"
                  : "system"
              )
            }
          />
        </View>
      </View>

      {/* Insights */}
      <View style={{ marginTop: 8, paddingVertical: 8 }}>
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("insights") || "Insights"}
        </Text>
        <Button
          title={(t("workloadHeatmap") as string) || "Workload heatmap"}
          onPress={() => navigation.navigate("Heatmap" as never)}
        />
      </View>
      {/* Outbox */}
      <View style={{ marginTop: 16, paddingVertical: 8 }}>
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("syncPendingActions") || "Sync pending actions"}
        </Text>
        <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>
          {t("pendingCount") || "Pending"}: {outboxCount}
        </Text>
        <Button
          title={(t("retrySync") as string) || "Retry sync"}
          onPress={async () => {
            try {
              await flushOutbox();
            } finally {
              try {
                const s = await AsyncStorage.getItem("outbox.v1");
                const arr = s ? JSON.parse(s) : [];
                setOutboxCount(Array.isArray(arr) ? arr.length : 0);
              } catch {}
            }
          }}
        />
      </View>
      {/* Night-before reminder */}
      <View style={{ marginTop: 16, paddingVertical: 8 }}>
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
          {t("nightBefore") || "Night-before reminder"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: theme.colors.text }}>
            {t("nightBeforeHint") || "Send a preview of tomorrow around 20:00."}
          </Text>
          <Switch
            value={nightBefore}
            onValueChange={async (v) => {
              setNightBefore(v);
              try {
                await updateUserSettings({ nightBeforeReminder: v });
              } catch {}
            }}
          />
        </View>
      </View>
      {/* Widgets dev preview */}
      <View style={{ marginTop: 16, paddingVertical: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
            color: theme.colors.text,
          }}
        >
          Widget Preview
        </Text>
  <Button title="Open preview" onPress={() => navigation.navigate("WidgetPreview" as never)} />
      </View>
  <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 12 }}>
        {t("selectHousehold")}
      </Text>
      {households.map((h) => (
        <View
          key={h.id}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <TouchableOpacity onPress={() => selectHousehold(h.id)} accessibilityRole="button" accessibilityLabel={`Switch to household ${h.name || h.id}`}>
            <Text
              style={{
                fontWeight: h.id === householdId ? "700" : "400",
                color: theme.colors.text,
              }}
            >
              {h.name || h.id} {h.role ? `· ${t(`role.${h.role}`)}` : ""}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            {h.role === "admin" ? (
              <Button
                title={t("delete")}
                accessibilityLabel={t("delete")}
                // Destructive action hint
                accessibilityHint={(t("hint.deleteHousehold") as string) || "Deletes this household and its data."}
                onPress={() => {
                  Alert.alert(
                    t("deleteHouseholdTitle"),
                    t("deleteHouseholdConfirm"),
                    [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("delete"),
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await deleteHouseholdRecursive(h.id);
                            toast.show(t("householdDeleted"), {
                              type: "success",
                            });
                          } catch (e) {
                            console.error(e);
                            toast.show(t("actionFailed"), { type: "error" });
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            ) : (
              <Button
                title={t("leave")}
                accessibilityLabel={t("leave")}
                accessibilityHint={(t("hint.leaveHousehold") as string) || "Leaves this household."}
                onPress={() => {
                  Alert.alert(
                    t("leaveHouseholdTitle"),
                    t("leaveHouseholdConfirm"),
                    [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("leave"),
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await leaveHousehold(h.id);
                            toast.show(t("leftHousehold"), { type: "success" });
                          } catch (e) {
                            console.error(e);
                            toast.show(t("actionFailed"), { type: "error" });
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            )}
          </View>
        </View>
      ))}
      <View style={{ height: 16 }} />
      {!!householdId ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            {t("showHouseholdQr") || "Show Household QR"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title={t("showHouseholdQr") || "Show Household QR"}
              onPress={() => navigation.navigate("ShowHouseholdQR")}
            />
            <Button
              title={t("scanHouseholdQr") || "Scan Household QR"}
              onPress={() => navigation.navigate("ScanInvite")}
            />
            <Button
              title={t("shareHouseholdInvite") || "Share Household Invite"}
              onPress={async () => {
                try {
                  if (!householdId) return;
                  const res = await createInviteFn(householdId, "", "adult");
                  const link = res.url || undefined;
                  if (link) {
                    await Share.share({ message: link });
                  } else {
                    Alert.alert(
                      t("inviteLinkUnavailable") || "Invite link unavailable"
                    );
                  }
                } catch (e: any) {
                  const code = String(e?.code || e?.message || "");
                  const msg = code.includes("resource-exhausted")
                    ? (t("tooManyInvites") as string) ||
                      "Too many invites; try again later"
                    : (t("actionFailed") as string) || "Something went wrong.";
                  Alert.alert(msg);
                }
              }}
            />
            <Button
              title={t("shareCalendar") || "Share calendar (ICS)"}
              onPress={async () => {
                try {
                  if (!householdId) return;
                  const { url } = await createCalendarShare(householdId);
                  await Share.share({ message: url });
                } catch (e) {
                  Alert.alert("Error", String(e));
                }
              }}
            />
            <Button
              title={t("revokeCalendarShare") || "Revoke calendar shares"}
              onPress={async () => {
                try {
                  if (!householdId) return;
                  setLoadingShares(true);
                  setShares(await listCalendarShares(householdId));
                } finally {
                  setLoadingShares(false);
                }
              }}
            />
            <Button
              title={(t("manageTemplates") as string) || "Manage templates"}
              onPress={() => navigation.navigate("ManageTemplates")}
            />
          </View>
          {/* Filters & sort utilities */}
          <View style={{ marginTop: 8 }}>
            <Button
              title={(t("resetToDefaults") as string) || "Reset to defaults"}
              onPress={async () => {
                try {
                  if (!householdId) return;
                  await AsyncStorage.multiRemove([
                    `@hc:filters:${householdId}:today`,
                    `@hc:filters:${householdId}:overdue`,
                    `@hc:filters:${householdId}:upcoming`,
                  ]);
                  toast.show((t("filtersReset") as string) || "Filters reset", {
                    type: "success",
                  });
                } catch (e) {
                  console.error(e);
                  toast.show(t("actionFailed"), { type: "error" });
                }
              }}
            />
          </View>
          {/* Existing calendar shares */}
          {shares.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                Calendar shares
              </Text>
              {shares.map((s) => {
                const created = (s.createdAt as any)?.toDate
                  ? (s.createdAt as any).toDate()
                  : s.createdAt;
                const revoked = (s.revokedAt as any)?.toDate
                  ? (s.revokedAt as any).toDate()
                  : s.revokedAt;
                return (
          <View
                    key={s.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 6,
                      borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 12, color: theme.colors.muted }}>
                        {String(s.id).slice(0, 8)}…
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
              color: s.active ? theme.colors.text : theme.colors.primary,
                        }}
                      >
                        {s.active ? "Active" : "Revoked"}
                        {created
                          ? ` · created ${new Date(created).toLocaleString()}`
                          : ""}
                        {revoked
                          ? ` · revoked ${new Date(revoked).toLocaleString()}`
                          : ""}
                      </Text>
                    </View>
                    {s.active ? (
                      <Button
                        title={t("revoke") || "Revoke"}
                        variant="outline"
                        textStyle={{ color: theme.colors.error }}
                        style={{ borderColor: theme.colors.error }}
                        accessibilityLabel={t("revoke") || "Revoke"}
                        accessibilityHint={(t("hint.revokeCalendarShare") as string) || "Revokes this calendar share."}
                        onPress={async () => {
                          if (!householdId) return;
                          Alert.alert(
                            t("confirm") || "Confirm",
                            (t("revokeCalendarConfirm") as string) ||
                              "Revoke this calendar share?",
                            [
                              { text: t("cancel"), style: "cancel" },
                              {
                                text: t("revoke") || "Revoke",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await revokeCalendarShare(
                                      householdId,
                                      s.id
                                    );
                                    setShares(
                                      await listCalendarShares(householdId)
                                    );
                                  } catch (e) {
                                    Alert.alert("Error", String(e));
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : loadingShares ? (
            <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
              Loading calendar shares…
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Templates shortcuts */}
      {!!householdId ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            {t("templates") || "Templates"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title={(t("manageTemplates") as string) || "Manage templates"}
              onPress={() => navigation.navigate("ManageTemplates")}
            />
            <Button
              title={
                (t("insertFromTemplate") as string) || "Insert from template"
              }
              onPress={() => navigation.navigate("TemplatePicker")}
            />
          </View>
        </View>
      ) : null}

      <View style={{ height: 16 }} />
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
        {t("createHousehold")}
      </Text>
  <Input placeholder={t("householdName")} value={name} onChangeText={setName} containerStyle={{ marginBottom: 8 }} />
      <Button
        title={saving ? "…" : t("createHousehold")}
        disabled={!name.trim() || saving}
        onPress={async () => {
          try {
            setSaving(true);
            const id = await createHousehold(name.trim());
            setName("");
            await selectHousehold(id);
          } catch (e) {
            console.error("Create household failed", e);
          } finally {
            setSaving(false);
          }
        }}
      />
      {/* Quiet hours */}
      <View style={{ height: 24 }} />
  <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
        {t("quietHours") || "Quiet hours"}
      </Text>
      <View style={{ marginBottom: 8 }}>
        <Button
          title={t("sendTestNotification") || "Send test notification"}
          onPress={async () => {
            try {
              const fn = httpsCallable(getFunctions(), "sendTestPush");
              const res = await fn({});
              Alert.alert("Push", JSON.stringify(res.data));
            } catch (e) {
              Alert.alert("Push Error", String(e));
            }
          }}
        />
        <View style={{ height: 8 }} />
        <Button
          title={t("runDigestDryRun") || "Run digest dry-run (local)"}
          onPress={async () => {
            try {
              if (!householdId) return;
              const fn = httpsCallable(getFunctions(), "runDigestDryRun");
              const res: any = await fn({ householdId });
              const counts = res?.data?.summary?.counts || { today: 0, overdue: 0 };
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Daily summary (dry-run)",
                  body: `Today ${counts.today} · Overdue ${counts.overdue}`,
                  data: { type: "digest.daily.dryrun", hid: householdId, counts },
                },
                trigger: null,
              });
            } catch (e) {
              Alert.alert("Error", String(e));
            }
          }}
        />
      </View>
      {/* Digest preferences */}
      {!!householdId ? (
        <View style={{ marginBottom: 8, marginTop: 16 }}>
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            Digest
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ flex: 1, color: theme.colors.text }}>
              Include overdue
            </Text>
            <Switch value={digestOverdue} onValueChange={setDigestOverdue} />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ flex: 1, color: theme.colors.text }}>
              Include today/upcoming
            </Text>
            <Switch value={digestUpcoming} onValueChange={setDigestUpcoming} />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ flex: 1, color: theme.colors.text }}>
              Include wins
            </Text>
            <Switch value={digestWins} onValueChange={setDigestWins} />
          </View>
          <Input placeholder="07:00" value={digestTime} onChangeText={setDigestTime} containerStyle={{ marginBottom: 8 }} />
          <Button
            title="Save digest preferences"
            onPress={async () => {
              try {
                if (!householdId) return;
                const fn = httpsCallable(getFunctions(), "setDigestPreferences");
                await fn({
                  householdId,
                  prefs: {
                    sections: { overdue: digestOverdue, upcoming: digestUpcoming, wins: digestWins },
                    schedule: { time: digestTime },
                  },
                });
                toast.show("Saved", { type: "success" });
              } catch (e) {
                Alert.alert("Error", String(e));
              }
            }}
          />
        </View>
      ) : null}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text style={{ marginRight: 8, color: theme.colors.text }}>
          {t("notifications") || "Notifications"}
        </Text>
        <Switch
          value={notifEnabled}
          onValueChange={async (val) => {
            setNotifEnabled(val);
            try {
              await updateUserSettings({ notificationsEnabled: val });
              if (val) {
                const token = await registerForPushNotificationsAsync();
                await savePushToken(token ?? null);
              } else {
                await savePushToken(null);
              }
            } catch {}
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
  <Input placeholder="21:00" value={qhStart} onChangeText={setQhStart} containerStyle={{ flex: 1 }} />
  <Input placeholder="07:00" value={qhEnd} onChangeText={setQhEnd} containerStyle={{ flex: 1 }} />
      </View>
      {/* Quiet-hours mode */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ marginRight: 8, color: theme.colors.text }}>
          Quiet-hours mode
        </Text>
        <Button
          title={qhMode === "hard" ? "Hard (delay)" : "Soft (silent)"}
          onPress={() => setQhMode(qhMode === "hard" ? "soft" : "hard")}
        />
      </View>
      <Input
        placeholder={t("timezoneOptional") || "Europe/Oslo (optional)"}
        value={qhTz || ""}
        onChangeText={setQhTz}
        autoCapitalize="none"
        containerStyle={{ marginTop: 8 }}
      />
      <View style={{ marginTop: 8 }}>
        <Button
          title={t("saveQuietHours") || "Save quiet hours"}
          onPress={async () => {
            try {
              const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
              if (!timeRe.test(qhStart) || !timeRe.test(qhEnd)) {
                toast.show(
                  t("invalidTime") || "Enter time as HH:mm (00-23:59).",
                  { type: "error" }
                );
                return;
              }
              if (qhTz && !qhTz.includes("/")) {
                toast.show(
                  t("invalidTimezone") ||
                    "Enter a valid IANA timezone like Europe/Oslo.",
                  { type: "error" }
                );
                return;
              }
              await updateUserSettings({
                quietHours: {
                  start: qhStart,
                  end: qhEnd,
                  tz: qhTz,
                  mode: qhMode,
                },
              });
              toast.show(t("saved") || "Saved", { type: "success" });
            } catch (e) {
              console.error(e);
              toast.show(t("actionFailed"), { type: "error" });
            }
          }}
        />
      </View>

      {/* Household settings (admin) */}
      {!!householdId ? (
        <>
          <View style={{ height: 24 }} />
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            {t("members") || "Members"}
          </Text>
          {members.length === 0 ? (
            <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>
              {t("noMembers") || "No members yet"}
            </Text>
          ) : null}
          {members.map((m) => (
        <View
              key={m.userId}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                {/* avatar circle */}
        <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
          backgroundColor: theme.colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {m.photoURL ? (
                    <Image
                      source={{ uri: m.photoURL }}
                      style={{ width: 36, height: 36 }}
                    />
                  ) : (
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                      {(m.displayName || m.userId).slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={{ fontWeight: "500", color: theme.colors.text }}>
                  {m.displayName || m.userId}
                </Text>
        <Text style={{ color: theme.colors.muted }}>
                  {t(`role.${m.role || "adult"}`) || m.role || "adult"}
                </Text>
              </View>
              {isAdmin && m.userId !== auth.currentUser?.uid ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    title={t("makeAdmin") || "Make admin"}
                    accessibilityLabel={t("makeAdmin") || "Make admin"}
                    accessibilityHint={(t("hint.makeAdmin") as string) || "Grants admin permissions to this member."}
                    onPress={() => {
                      if (!householdId) return;
                      Alert.alert(
                        t("confirm") || "Confirm",
                        (t("confirmMakeAdmin") as string) ||
                          "Make this member an admin?",
                        [
                          { text: t("cancel"), style: "cancel" },
                          {
                            text: t("makeAdmin") || "Make admin",
                            onPress: async () => {
                              try {
                                await setMemberRole(
                                  householdId,
                                  m.userId,
                                  "admin"
                                );
                                setMembers(await listMembers(householdId));
                              } catch {}
                            },
                          },
                        ]
                      );
                    }}
                  />
                  {m.role === "admin" ? (
                    <Button
                      title={t("demoteToAdult") || "Demote to adult"}
                      accessibilityLabel={t("demoteToAdult") || "Demote to adult"}
                      accessibilityHint={(t("hint.demote") as string) || "Removes admin permissions from this member."}
                      onPress={() => {
                        if (!householdId) return;
                        Alert.alert(
                          t("confirm") || "Confirm",
                          (t("confirmDemote") as string) ||
                            "Demote this member to adult?",
                          [
                            { text: t("cancel"), style: "cancel" },
                            {
                              text: t("demote") || "Demote",
                              onPress: async () => {
                                try {
                                  await setMemberRole(
                                    householdId,
                                    m.userId,
                                    "adult"
                                  );
                                  setMembers(await listMembers(householdId));
                                } catch {}
                              },
                            },
                          ]
                        );
                      }}
                    />
                  ) : null}
                  <Button
                    title={t("remove") || "Remove"}
                    accessibilityLabel={t("remove") || "Remove"}
                    accessibilityHint={(t("hint.removeMember") as string) || "Removes this member from the household."}
                    onPress={() => {
                      if (!householdId) return;
                      const adminCount = members.filter(
                        (x) => x.role === "admin"
                      ).length;
                      if (m.role === "admin" && adminCount <= 1) {
                        Alert.alert(
                          t("notAllowed") || "Not allowed",
                          (t("cannotRemoveLastAdmin") as string) ||
                            "You can’t remove the last admin."
                        );
                        return;
                      }
                      Alert.alert(
                        t("confirm") || "Confirm",
                        (t("confirmRemoveMember") as string) ||
                          "Remove this member?",
                        [
                          { text: t("cancel"), style: "cancel" },
                          {
                            text: t("remove") || "Remove",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await removeMember(householdId, m.userId);
                                setMembers(await listMembers(householdId));
                              } catch {}
                            },
                          },
                        ]
                      );
                    }}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
      {!!householdId && isAdmin ? (
        <>
          <View style={{ height: 24 }} />
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            {t("householdSettings") || "Household settings"}
          </Text>
          {/* Escalation toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ marginRight: 8, color: theme.colors.text }}>
              {t("escalationEnabled") || "Escalation (due-soon ping)"}
            </Text>
            <Switch value={escalation} onValueChange={setEscalation} />
          </View>

          <Input
            placeholder={t("timezoneOptional") || "Europe/Oslo (optional)"}
            value={hhTz}
            onChangeText={setHhTz}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 8 }}
          />
          <Input
            placeholder={t("digestHour") || "Digest hour (0-23)"}
            value={hhHour}
            onChangeText={setHhHour}
            keyboardType="number-pad"
            containerStyle={{ marginBottom: 8 }}
          />
          <Button
            title={t("save") || "Save"}
            onPress={async () => {
              try {
                if (hhTz && !hhTz.includes("/")) {
                  toast.show(
                    t("invalidTimezone") ||
                      "Enter a valid IANA timezone like Europe/Oslo.",
                    { type: "error" }
                  );
                  return;
                }
                const hourNum = Number(hhHour);
                if (Number.isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
                  toast.show(t("invalidHour") || "Enter an hour 0-23.", {
                    type: "error",
                  });
                  return;
                }
                await updateHouseholdSettings(householdId, {
                  timezone: hhTz || undefined,
                  digestHour: hourNum,
                  escalationEnabled: escalation,
                });
                toast.show(t("saved") || "Saved", { type: "success" });
              } catch (e) {
                console.error(e);
                toast.show(t("actionFailed"), { type: "error" });
              }
            }}
          />
        </>
      ) : null}
      {/* Admin-only: Create invite */}
      {!!householdId &&
      households.find((h) => h.id === householdId)?.role === "admin" ? (
        <>
          <View style={{ height: 24 }} />
          <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
            {t("invites") || "Invites"}
          </Text>
          <Input
            placeholder={t("email")}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginBottom: 8 }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <Button
              title={(t("role.adult") as string) || "adult"}
              onPress={() => setInviteRole("adult")}
            />
          </View>
          <Button
            title={t("createInvite") || "Create invite"}
            onPress={async () => {
              try {
                if (!inviteEmail.trim()) return;
                const res = await createInviteFn(
                  householdId,
                  inviteEmail.trim(),
                  inviteRole
                );
                setInviteEmail("");
                setInviteRole("adult");
                toast.show(t("inviteCreated") || "Invite created", {
                  type: "success",
                });
                // Offer share of a deep link immediately
                if (res?.inviteId && (res?.url || res?.token)) {
                  const link =
                    res.url ||
                    `homecontrol://invite?hid=${encodeURIComponent(householdId)}&inviteId=${encodeURIComponent(res.inviteId)}&token=${encodeURIComponent(res.token!)}`;
                  try {
                    await Share.share({ message: link });
                  } catch {}
                }
                // Refresh invites list
                try {
                  setInvites(await listInvites(householdId));
                } catch {}
              } catch (e) {
                console.error(e);
                toast.show(t("actionFailed"), { type: "error" });
              }
            }}
          />

          {/* Existing invites */}
            <View style={{ marginTop: 16 }}>
            {invites.length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>
                {t("noInvites") || "No invites yet."}
              </Text>
            ) : (
              invites.map((inv) => (
                <View
                  key={inv.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text>
                    {inv.email} · {t(`role.${inv.role}`)} ·{" "}
                    {t(`invite.status.${inv.status}`)}
                  </Text>
                  {inv.status === "pending" ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Button
                        title={t("revoke") || "Revoke"}
                        onPress={async () => {
                          try {
                            await revokeInvite(householdId, inv.id);
                            setInvites(await listInvites(householdId));
                          } catch {}
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}
