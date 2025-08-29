import React from "react";
import { View, Text, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listChildren, addChild, renameChild, deleteChild, type Child } from "../services/children";
import Input from "../components/Input";
import Button from "../components/Button";

export default function KidsScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const [kids, setKids] = React.useState<Child[]>([]);
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("🙂");
  const [color, setColor] = React.useState("#FDE68A");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  const load = React.useCallback(async () => {
    if (!householdId) return setKids([]);
    setKids(await listChildren(householdId));
  }, [householdId]);

  React.useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!householdId || !name.trim()) return;
    await addChild(householdId, name.trim(), emoji, color);
    setName("");
    load();
  };

  return (
    <ScreenContainer>
      <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 8 }}>
        {(t("kids") as string) || "Kids"}
      </Text>
      {!householdId ? <Text style={{ color: theme.colors.muted }}>{t("selectHouseholdToContinue")}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
  <Input placeholder={(t("name") as string) || "Name"} value={name} onChangeText={setName} containerStyle={{ flex: 1 }} />
  <Input placeholder="\ud83d\ude42" value={emoji} onChangeText={setEmoji} containerStyle={{ width: 64 }} />
  <Input placeholder="#FDE68A" value={color} onChangeText={setColor} autoCapitalize="characters" containerStyle={{ width: 100 }} />
  <Button title={(t("add") as string) || "Add"} onPress={create} disabled={!householdId} />
      </View>
      <FlatList
        data={kids}
        keyExtractor={(k) => k.id}
        renderItem={({ item }) => {
          const isEditing = editing === item.id;
          return (
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color || theme.colors.card, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 16 }}>{item.emoji || "🙂"}</Text>
              </View>
              {isEditing ? (
                <>
      <Input value={editName} onChangeText={setEditName} containerStyle={{ flex: 1 }} />
  <Button title={(t("save") as string) || "Save"} accessibilityLabel={(t("save") as string) || "Save"} accessibilityHint={(t("hint.saveChanges") as string) || "Saves your edits."} onPress={async () => { if (!householdId) return; await renameChild(householdId, item.id, editName.trim() || item.displayName, item.emoji, item.color); setEditing(null); load(); }} />
  <Button title={(t("cancel") as string) || "Cancel"} accessibilityLabel={(t("cancel") as string) || "Cancel"} accessibilityHint={(t("hint.cancelEdit") as string) || "Cancels editing."} onPress={() => setEditing(null)} variant="link" />
                </>
              ) : (
                <>
                  <Text style={{ flex: 1, color: theme.colors.text }}>{item.displayName}</Text>
      <Button title={(t("edit") as string) || "Edit"} onPress={() => { setEditing(item.id); setEditName(item.displayName); }} />
  <Button title={(t("delete") as string) || "Delete"} accessibilityLabel={(t("delete") as string) || "Delete"} accessibilityHint={(t("hint.deleteChild") as string) || "Deletes this child profile."} onPress={async () => { if (!householdId) return; await deleteChild(householdId, item.id); load(); }} variant="outline" />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: theme.colors.muted }}>{(t("noKidsYet") as string) || "No kids yet."}</Text>}
      />
    </ScreenContainer>
  );
}
