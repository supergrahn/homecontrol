import React from "react";
import { View, Text, TextInput, Button, FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listChildren, addChild, renameChild, deleteChild, type Child } from "../services/children";

export default function KidsScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
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
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>{(t("kids") as string) || "Kids"}</Text>
      {!householdId ? <Text>{t("selectHouseholdToContinue")}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput placeholder={(t("name") as string) || "Name"} value={name} onChangeText={setName} style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="🙂" value={emoji} onChangeText={setEmoji} style={{ width: 64, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, textAlign: "center" }} />
        <TextInput placeholder="#FDE68A" value={color} onChangeText={setColor} style={{ width: 100, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }} />
        <Button title={(t("add") as string) || "Add"} onPress={create} disabled={!householdId} />
      </View>
      <FlatList
        data={kids}
        keyExtractor={(k) => k.id}
        renderItem={({ item }) => {
          const isEditing = editing === item.id;
          return (
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color || "#eee", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 16 }}>{item.emoji || "🙂"}</Text>
              </View>
              {isEditing ? (
                <>
                  <TextInput value={editName} onChangeText={setEditName} style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 8 }} />
                  <Button title={(t("save") as string) || "Save"} onPress={async () => { if (!householdId) return; await renameChild(householdId, item.id, editName.trim() || item.displayName, item.emoji, item.color); setEditing(null); load(); }} />
                  <Button title={(t("cancel") as string) || "Cancel"} onPress={() => setEditing(null)} />
                </>
              ) : (
                <>
                  <Text style={{ flex: 1 }}>{item.displayName}</Text>
                  <Button title={(t("edit") as string) || "Edit"} onPress={() => { setEditing(item.id); setEditName(item.displayName); }} />
                  <Button title={(t("delete") as string) || "Delete"} onPress={async () => { if (!householdId) return; await deleteChild(householdId, item.id); load(); }} />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: "#999" }}>{(t("noKidsYet") as string) || "No kids yet."}</Text>}
      />
    </View>
  );
}
