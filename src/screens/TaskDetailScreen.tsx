import React from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import {
  listChecklist,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
} from "../services/checklist";
import * as ImagePicker from "expo-image-picker";
import { listTaskPhotos, uploadTaskPhoto, deleteTaskPhoto } from "../services/storage";
import { acceptTask, releaseTask, getTask } from "../services/tasks";
import { auth } from "../firebase";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function TaskDetailScreen({ route }: any) {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const { id: taskId } = route.params;
  const [items, setItems] = React.useState<any[]>([]);
  const [newItem, setNewItem] = React.useState("");
  const [photos, setPhotos] = React.useState<{ name: string; url: string }[]>(
    [],
  );
  const [accepted, setAccepted] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    if (!householdId) return;
    const list = await listChecklist(householdId, taskId);
    setItems(list);
    try {
      const p = await listTaskPhotos(householdId, taskId);
      setPhotos(p);
    } catch {}
    try {
      const task = await getTask(householdId, taskId);
      const uid = auth.currentUser?.uid;
      setAccepted(!!uid && !!task?.acceptedBy?.includes(uid));
    } catch {}
  }, [taskId, householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!newItem.trim()) return;
  if (!householdId) return;
  await addChecklistItem(householdId, taskId, newItem.trim());
    setNewItem("");
    load();
  };

  const pickAndUpload = React.useCallback(async () => {
    // Request library permission
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    try {
      if (!householdId) return;
      await uploadTaskPhoto(householdId, taskId, uri, {
        contentType: asset.mimeType || undefined,
        fileName: asset.fileName || undefined,
      });
      const p = await listTaskPhotos(householdId, taskId);
      setPhotos(p);
    } catch {}
  }, [taskId, householdId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{t("task")}</Text>
      <Text style={{ marginBottom: 12, color: "#666" }}>
        {t("id")}: {taskId}
      </Text>
      <View style={{ marginBottom: 12 }}>
        <Button
          title={accepted ? (t("releaseTask") as string) || "Release" : (t("acceptTask") as string) || "I’ve got it"}
          onPress={async () => {
            if (!householdId) return;
            try {
              if (accepted) {
                await releaseTask(householdId, taskId);
                setAccepted(false);
              } else {
                await acceptTask(householdId, taskId);
                setAccepted(true);
              }
            } catch {}
          }}
        />
      </View>

      {!householdId ? (
        <Text style={{ color: "#b00020", marginBottom: 12 }}>
          {t("selectHouseholdToContinue")}
        </Text>
      ) : null}

      <Text style={{ fontWeight: "600", marginBottom: 8 }}>
        {t("checklist")}
      </Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <TouchableOpacity
              onPress={async () => {
                if (!householdId) return;
                await toggleChecklistItem(householdId, taskId, item.id, !item.done);
                load();
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#999",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
                backgroundColor: item.done ? "#4caf50" : "transparent",
              }}
            >
              {item.done ? <Text style={{ color: "#fff" }}>✓</Text> : null}
            </TouchableOpacity>
            <Text style={{ flex: 1 }}>{item.label}</Text>
            <Button
              title={t("del")}
              onPress={async () => {
                if (!householdId) return;
                await removeChecklistItem(householdId, taskId, item.id);
                load();
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#999" }}>{t("noChecklist")}</Text>
        }
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TextInput
          placeholder={t("addChecklist")}
          value={newItem}
          onChangeText={setNewItem}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            padding: 10,
          }}
        />
        <Button title={t("add")} onPress={add} />
      </View>

      {/* Photos */}
      <View style={{ height: 24 }} />
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>
        {t("photos") || "Photos"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {photos.map((p) => (
          <View key={p.name} style={{ position: "relative" }}>
            <Image
              source={{ uri: p.url }}
              style={{ width: 96, height: 96, borderRadius: 8 }}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!householdId) return;
                try {
                  await deleteTaskPhoto(householdId, taskId, p.name);
                  const next = await listTaskPhotos(householdId, taskId);
                  setPhotos(next);
                } catch {}
              }}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: "#0008",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel={(t("delete") as string) || "Delete"}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 8 }}>
        <Button title={t("addPhoto") || "Add photo"} onPress={pickAndUpload} />
      </View>
    </View>
  );
}
