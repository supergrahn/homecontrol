import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Button,
  TextInput,
  Alert,
  Share,
  Switch,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
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
import { auth, db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { householdId, households, selectHousehold } = useHousehold();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"adult">("adult");
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [qhStart, setQhStart] = React.useState("21:00");
  const [qhEnd, setQhEnd] = React.useState("07:00");
  const [qhTz, setQhTz] = React.useState<string | undefined>(undefined);
  const [notifEnabled, setNotifEnabled] = React.useState<boolean>(true);
  const toast = useToast();
  const currentHousehold = households.find((h) => h.id === householdId);
  const isAdmin = currentHousehold?.role === "admin";
  const [hhTz, setHhTz] = React.useState<string>("");
  const [hhHour, setHhHour] = React.useState<string>("7");
  const [escalation, setEscalation] = React.useState<boolean>(false);
  const [members, setMembers] = React.useState<Member[]>([]);
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
      // Load quiet hours
      try {
        const s = await getUserSettings();
        if (s.quietHours?.start) setQhStart(s.quietHours.start);
        if (s.quietHours?.end) setQhEnd(s.quietHours.end);
        if (s.quietHours?.tz) setQhTz(s.quietHours.tz);
        if (typeof s.notificationsEnabled === "boolean")
          setNotifEnabled(s.notificationsEnabled);
      } catch {}
      // Prefill household settings from Firestore
      try {
        if (householdId) {
          const snap = await (await import("firebase/firestore")).getDoc(
            (await import("firebase/firestore")).doc(
              (await import("../firebase")).db,
              `households/${householdId}`,
            ),
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
      () => {},
    );
    return () => unsub();
  }, [householdId]);
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
        {t("selectHousehold")}
      </Text>
      {households.map((h) => (
        <View
          key={h.id}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          <TouchableOpacity onPress={() => selectHousehold(h.id)}>
            <Text style={{ fontWeight: h.id === householdId ? "700" : "400" }}>
              {h.name || h.id} {h.role ? `· ${t(`role.${h.role}`)}` : ""}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            {h.role === "admin" ? (
              <Button
                title={t("delete")}
                color="#b00020"
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
                    ],
                  );
                }}
              />
            ) : (
              <Button
                title={t("leave")}
                color="#b00020"
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
                    ],
                  );
                }}
              />
            )}
          </View>
        </View>
      ))}
      <View style={{ height: 16 }} />
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
        {t("createHousehold")}
      </Text>
      <TextInput
        placeholder={t("householdName")}
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 10,
          marginBottom: 8,
        }}
      />
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
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
        {t("quietHours") || "Quiet hours"}
      </Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text style={{ marginRight: 8 }}>
          {t("notifications") || "Notifications"}
        </Text>
        <Switch
          value={notifEnabled}
          onValueChange={async (val) => {
            setNotifEnabled(val);
            try {
              await updateUserSettings({ notificationsEnabled: val });
            } catch {}
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          placeholder="21:00"
          value={qhStart}
          onChangeText={setQhStart}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            padding: 10,
          }}
        />
        <TextInput
          placeholder="07:00"
          value={qhEnd}
          onChangeText={setQhEnd}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            padding: 10,
          }}
        />
      </View>
      <TextInput
        placeholder={t("timezoneOptional") || "Europe/Oslo (optional)"}
        value={qhTz || ""}
        onChangeText={setQhTz}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 10,
          marginTop: 8,
        }}
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
                  { type: "error" },
                );
                return;
              }
              if (qhTz && !qhTz.includes("/")) {
                toast.show(
                  t("invalidTimezone") ||
                    "Enter a valid IANA timezone like Europe/Oslo.",
                  { type: "error" },
                );
                return;
              }
              await updateUserSettings({
                quietHours: { start: qhStart, end: qhEnd, tz: qhTz },
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            {t("members") || "Members"}
          </Text>
          {members.length === 0 ? (
            <Text style={{ color: "#666", marginBottom: 8 }}>
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
                borderBottomColor: "#eee",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {/* avatar circle */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#ddd",
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
                    <Text style={{ fontWeight: "700", color: "#444" }}>
                      {(m.displayName || m.userId).slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={{ fontWeight: "500" }}>
                  {m.displayName || m.userId}
                </Text>
                <Text style={{ color: "#666" }}>
                  {t(`role.${m.role || "adult"}`) || m.role || "adult"}
                </Text>
              </View>
              {isAdmin && m.userId !== auth.currentUser?.uid ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    title={t("makeAdmin") || "Make admin"}
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
                                  "admin",
                                );
                                setMembers(await listMembers(householdId));
                              } catch {}
                            },
                          },
                        ],
                      );
                    }}
                  />
                  {m.role === "admin" ? (
                    <Button
                      title={t("demoteToAdult") || "Demote to adult"}
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
                                    "adult",
                                  );
                                  setMembers(await listMembers(householdId));
                                } catch {}
                              },
                            },
                          ],
                        );
                      }}
                    />
                  ) : null}
                  <Button
                    title={t("remove") || "Remove"}
                    color="#b00020"
                    onPress={() => {
                      if (!householdId) return;
                      const adminCount = members.filter((x) => x.role === "admin").length;
                      if (m.role === "admin" && adminCount <= 1) {
                        Alert.alert(
                          t("notAllowed") || "Not allowed",
                          (t("cannotRemoveLastAdmin") as string) ||
                            "You can’t remove the last admin.",
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
                        ],
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            {t("householdSettings") || "Household settings"}
          </Text>
          {/* Escalation toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ marginRight: 8 }}>{t("escalationEnabled") || "Escalation (due-soon ping)"}</Text>
            <Switch
              value={escalation}
              onValueChange={setEscalation}
            />
          </View>

          <TextInput
            placeholder={t("timezoneOptional") || "Europe/Oslo (optional)"}
            value={hhTz}
            onChangeText={setHhTz}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              marginBottom: 8,
            }}
          />
          <TextInput
            placeholder={t("digestHour") || "Digest hour (0-23)"}
            value={hhHour}
            onChangeText={setHhHour}
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              marginBottom: 8,
            }}
          />
          <Button
            title={t("save") || "Save"}
            onPress={async () => {
              try {
                if (hhTz && !hhTz.includes("/")) {
                  toast.show(
                    t("invalidTimezone") ||
                      "Enter a valid IANA timezone like Europe/Oslo.",
                    { type: "error" },
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            {t("invites") || "Invites"}
          </Text>
          <TextInput
            placeholder={t("email")}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              marginBottom: 8,
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <Button
              title={(t("role.adult") as string) || "adult"}
              onPress={() => setInviteRole("adult")}
              color={"#111"}
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
                  inviteRole,
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
              <Text style={{ color: "#666" }}>
                {t("noInvites") || "No invites yet."}
              </Text>
            ) : (
              invites.map((inv) => (
                <View
                  key={inv.id}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "#eee",
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
    </View>
  );
}
