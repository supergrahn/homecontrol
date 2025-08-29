import React from "react";
import { View, Text, FlatList, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listTemplates, renameTemplate, deleteTemplate, createTemplate } from "../services/templates";
import { useToast } from "../components/ToastProvider";
import Input from "../components/Input";
import Button from "../components/Button";

export default function ManageTemplatesScreen() {
  const { t } = useTranslation();
  const { householdId, households } = useHousehold();
  const theme = useTheme();
  const toast = useToast();
  const isAdmin = households.find((h) => h.id === householdId)?.role === "admin";
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<{ id: string; name: string; items: string[] }[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>("");

  const load = React.useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const list = await listTemplates(householdId);
      setItems(list);
    } catch {}
    setLoading(false);
  }, [householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setEditingName(current);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveRename = async () => {
    if (!householdId || !editingId) return;
    const name = editingName.trim();
    if (!name) return cancelRename();
    if (items.some((t) => t.name.trim().toLowerCase() === name.toLowerCase() && t.id !== editingId)) {
      toast.show(t("nameExists") || "Name already exists", { type: "error" });
      return;
    }
    try {
      await renameTemplate(householdId, editingId, name);
      cancelRename();
      load();
      toast.show(t("renamed") || "Renamed", { type: "success" });
    } catch {
      toast.show(t("actionFailed"), { type: "error" });
    }
  };

  return (
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 12 }}>
        {t("manageTemplates") || "Manage templates"}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Button
          title={(t("newTemplate") as string) || "New template"}
          onPress={async () => {
            if (!householdId) return;
            Alert.prompt(
              t("newTemplate") || "New template",
              (t("enterTemplateName") as string) || "Enter a template name",
              async (text) => {
                const name = (text || "").trim();
                if (!name) return;
                if (items.some((t) => t.name.trim().toLowerCase() === name.toLowerCase())) {
                  toast.show(t("nameExists") || "Name already exists", { type: "error" });
                  return;
                }
                try {
                  await createTemplate(householdId, name, [], null);
                  toast.show(t("created") || "Created", { type: "success" });
                  load();
                } catch {
                  toast.show(t("actionFailed"), { type: "error" });
                }
              },
            );
          }}
        />
      </View>
  <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => {
          const isEditing = item.id === editingId;
          return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              {isEditing ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Input
                    value={editingName}
                    onChangeText={setEditingName}
                    returnKeyType="done"
                    style={{ flex: 1 }}
                  />
                  <Button title={t("save") || "Save"} onPress={saveRename} />
                  <Button title={t("cancel") || "Cancel"} onPress={cancelRename} variant="outline" />
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>{item.name}</Text>
        <Text style={{ color: theme.colors.muted }}>{item.items.length} {t("checklistType") || "checklist"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button title={t("rename") || "Rename"} onPress={() => startRename(item.id, item.name)} disabled={!isAdmin} />
                    <Button
                      title={t("delete") || "Delete"}
                      disabled={!isAdmin}
                      onPress={() => {
                        if (!householdId) return;
                        Alert.alert(
                          t("deleteTemplateTitle") || "Delete template",
                          (t("deleteTemplateConfirm") as string) || "Delete this template?",
                          [
                            { text: t("cancel") || "Cancel", style: "cancel" },
                            {
                              text: t("delete") || "Delete",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  await deleteTemplate(householdId, item.id);
                                  load();
                                  toast.show(t("deleted") || "Deleted", { type: "success" });
                                } catch {
                                  toast.show(t("actionFailed"), { type: "error" });
                                }
                              },
                            },
                          ],
                        );
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: theme.colors.muted }}>{t("nothingYet") || "Nothing yet."}</Text>}
      />
    </ScreenContainer>
  );
}
