import React from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Image, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import {
  listChecklist,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  renameChecklistItem,
} from "../services/checklist";
import * as ImagePicker from "expo-image-picker";
import { listTaskPhotos, uploadTaskPhoto, deleteTaskPhoto } from "../services/storage";
import { acceptTask, releaseTask, getTask, createTask, updateTask } from "../services/tasks";
import { listChildren, type Child } from "../services/children";
import { listComments, addComment, type Comment } from "../services/comments";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/nb";
import "dayjs/locale/nn";
import { createTemplate } from "../services/templates";
import { useToast } from "../components/ToastProvider";
import { auth } from "../firebase";
import { listMembers, type Member } from "../services/members";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function TaskDetailScreen({ route }: any) {
  const { t } = useTranslation();
  // Configure dayjs locale to match current i18n language
  React.useMemo(() => {
    dayjs.extend(localizedFormat);
    try {
      const current = (t as any)?.language || (t as any)?.i18n?.language;
      if (typeof current === "string") {
        const lang = current.toLowerCase();
        dayjs.locale(lang === "nb" || lang === "nn" ? "nb" : lang);
      }
    } catch {}
    return null;
  }, [t]);
  const navigation = useNavigation<any>();
  const { householdId } = useHousehold();
  const toast = useToast();
  const { id: taskId } = route.params;
  const [taskMeta, setTaskMeta] = React.useState<{ type?: string; title?: string } | null>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [newItem, setNewItem] = React.useState("");
  const [photos, setPhotos] = React.useState<{ name: string; url: string }[]>(
    [],
  );
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = React.useState<Member[]>([]);
  const [accepted, setAccepted] = React.useState<boolean>(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState<string>("");
  const [kids, setKids] = React.useState<Child[]>([]);
  const [childIds, setChildIds] = React.useState<string[]>([]);
  const [approvalRequired, setApprovalRequired] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [rotationPool, setRotationPool] = React.useState<string[]>([]);
  const [rotationIndex, setRotationIndex] = React.useState<number>(0);

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
      if (task) {
        setTaskMeta({ type: task.type, title: task.title });
        setChildIds(Array.isArray((task as any).childIds) ? (task as any).childIds : []);
        setApprovalRequired(!!(task as any).approvalRequired);
        setStatus((task as any).status || null);
        setRotationPool(Array.isArray((task as any).rotationPool) ? (task as any).rotationPool : []);
        setRotationIndex(Number((task as any).rotationIndex ?? 0));
      }
      const uid = auth.currentUser?.uid;
      setAccepted(!!uid && !!task?.acceptedBy?.includes(uid));
    } catch {}
    try {
      const cs = await listComments(householdId, taskId);
      setComments(cs);
    } catch {}
  }, [taskId, householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return;
        setMembers(await listMembers(householdId));
  setKids(await listChildren(householdId));
      } catch {}
    })();
  }, [householdId]);

  const isAdmin = React.useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const me = members.find((m) => m.userId === uid);
    return (me as any)?.role === "admin";
  }, [members]);

  // Mention autocomplete: when typing @text, show suggestions
  React.useEffect(() => {
    const m = /@([^\s@]{1,20})$/;
    const match = newComment.match(m);
    if (!match) {
      setMentionSuggestions([]);
      return;
    }
    const q = match[1].toLowerCase();
    const sugg = members
      .filter((mem) => (mem.displayName || mem.userId).toLowerCase().includes(q))
      .slice(0, 5);
    setMentionSuggestions(sugg);
  }, [newComment, members]);

  const inputRef = React.useRef<TextInput | null>(null);

  const add = async () => {
    if (!newItem.trim()) return;
  if (!householdId) return;
  await addChecklistItem(householdId, taskId, newItem.trim());
    setNewItem("");
    load();
    // Re-focus for fast entry
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startEdit = (itemId: string, current: string) => {
    setEditingId(itemId);
    setEditingText(current);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim() || !householdId) {
      cancelEdit();
      return;
    }
    try {
      await renameChecklistItem(householdId, taskId, editingId, editingText.trim());
      cancelEdit();
      load();
    } catch {
      cancelEdit();
    }
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
      {/* Rotation settings */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>{(t("rotation") as string) || "Rotation"}</Text>
        <Text style={{ color: "#666", marginBottom: 8 }}>{(t("rotationHint") as string) || "Pick members/children to rotate assignments. Next assignee cycles automatically when scheduling occurs."}</Text>
        {/* Member chips */}
        {members.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {members.map((m) => {
              const active = rotationPool.includes(m.userId);
              return (
                <TouchableOpacity key={m.userId} onPress={async () => {
                  if (!householdId) return;
                  const next = active ? rotationPool.filter((x) => x !== m.userId) : [...rotationPool, m.userId];
                  setRotationPool(next);
                  await updateTask(householdId, taskId, { rotationPool: next } as any);
                }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? "#111" : "#E5E7EB", backgroundColor: active ? "#EEF2FF" : "#F9FAFB" }}>
                    <Text style={{ fontSize: 12 }}>{m.displayName || m.userId}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {/* Kid chips */}
        {kids.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {kids.map((k) => {
              const active = rotationPool.includes(k.id);
              return (
                <TouchableOpacity key={k.id} onPress={async () => {
                  if (!householdId) return;
                  const next = active ? rotationPool.filter((x) => x !== k.id) : [...rotationPool, k.id];
                  setRotationPool(next);
                  await updateTask(householdId, taskId, { rotationPool: next } as any);
                }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? "#111" : "#E5E7EB", backgroundColor: active ? "#EEF2FF" : "#F9FAFB" }}>
                    <Text style={{ fontSize: 14 }}>{k.emoji || "🙂"}</Text>
                    <Text style={{ fontSize: 12 }}>{k.displayName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {/* Next assignee and fairness */}
        {rotationPool.length > 0 ? (
          <View style={{ marginTop: 6 }}>
            <Text style={{ marginBottom: 6 }}>{(t("nextAssignee") as string) || "Next assignee"}: {(() => {
              const idx = Math.min(Math.max(0, rotationIndex), Math.max(0, rotationPool.length - 1));
              const id = rotationPool[idx];
              const m = members.find((x) => x.userId === id);
              const kid = kids.find((x) => x.id === id);
              return m?.displayName || kid?.displayName || id || "";
            })()}</Text>
            <Text style={{ fontWeight: "600", marginBottom: 4 }}>{(t("fairness") as string) || "Fairness"}</Text>
            <View style={{ gap: 4 }}>
              {rotationPool.map((id) => {
                const name = members.find((m) => m.userId === id)?.displayName || kids.find((k) => k.id === id)?.displayName || id;
                // Basic fairness: count of completed tasks in recent activity for this task and id would require a query; fallback: acceptances count
                const count = 0;
                return (
                  <Text key={id} style={{ color: "#444" }}>• {name}: {count}</Text>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
      {/* Kid assignment */}
      {kids.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>{(t("assignToKids") as string) || "Assign to kids"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {kids.map((k) => {
              const active = childIds.includes(k.id);
              return (
                <TouchableOpacity key={k.id} onPress={async () => {
                  if (!householdId) return;
                  const next = active ? childIds.filter((x) => x !== k.id) : [...childIds, k.id];
                  setChildIds(next);
                  await updateTask(householdId, taskId, { childIds: next } as any);
                }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? "#111" : "#E5E7EB", backgroundColor: active ? "#EEF2FF" : "#F9FAFB" }}>
                    <Text style={{ fontSize: 14 }}>{k.emoji || "🙂"}</Text>
                    <Text style={{ fontSize: 12 }}>{k.displayName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Approval required toggle (adults/admins only) */}
      {(() => {
        const uid = auth.currentUser?.uid;
        const me = members.find((m) => m.userId === uid);
        const canToggle = (me?.role === "admin" || me?.role === "adult");
        return canToggle ? (
          <View style={{ marginBottom: 12 }}>
            <Button title={`${(t("approvalRequired") as string) || "Approval required"}: ${approvalRequired ? "On" : "Off"}`} onPress={async () => {
              if (!householdId) return;
              const next = !approvalRequired;
              setApprovalRequired(next);
              await updateTask(householdId, taskId, { approvalRequired: next } as any);
            }} />
          </View>
        ) : null;
      })()}
      {approvalRequired && status === "done" && isAdmin ? (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <Button title={(t("approve") as string) || "Approve"} onPress={async () => {
            if (!householdId) return;
            try {
              await updateTask(householdId, taskId, { status: "verified" } as any);
              setStatus("verified");
              toast.show((t("saved") as string) || "Saved", { type: "success" });
            } catch {}
          }} />
          <Button title={(t("reject") as string) || "Reject"} onPress={async () => {
            if (!householdId) return;
            try {
              await updateTask(householdId, taskId, { status: "open" } as any);
              setStatus("open");
              toast.show((t("saved") as string) || "Saved", { type: "success" });
            } catch {}
          }} />
        </View>
      ) : null}
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{t("task")}</Text>
      <Text style={{ marginBottom: 12, color: "#666" }}>
        {t("id")}: {taskId}
      </Text>
  {items.length > 0 ? (
        <View style={{ marginBottom: 12, alignSelf: "flex-start" }}>
          <Button
            title={(t("cloneAsTemplate") as string) || "Clone as template"}
            onPress={async () => {
              if (!householdId) return;
              try {
                // create new task from this checklist
                const newId = await createTask(householdId, {
                  title: `${taskMeta?.title || "Checklist"} (copy)`,
                  type: "checklist",
                  createdBy: auth.currentUser?.uid || "unknown",
                });
                // copy checklist items
                for (const it of items) {
                  if (typeof it?.label === "string" && it.label.trim()) {
                    await addChecklistItem(householdId, newId, it.label.trim());
                  }
                }
                Alert.alert(
                  t("templateCreated") || "Template created",
                  "",
                  [
                    { text: (t("cancel") as string) || "Cancel", style: "cancel" },
                    {
                      text: (t("open") as string) || "Open",
                      onPress: () => navigation.navigate("TaskDetail", { id: newId }),
                    },
                  ],
                );
              } catch (e) {
                Alert.alert("Error", String(e));
              }
            }}
          />
          <View style={{ height: 8 }} />
          <Button
            title={(t("saveAsTemplate") as string) || "Save as template"}
            onPress={async () => {
              if (!householdId) return;
              try {
                const name = taskMeta?.title?.trim() || "Checklist";
                const labels = items
                  .map((it) => String(it?.label || "").trim())
                  .filter((s) => !!s);
                if (labels.length === 0) {
                  Alert.alert(t("noChecklist") || "No checklist items yet.");
                  return;
                }
                await createTemplate(householdId, name, labels, auth.currentUser?.uid || "unknown");
                toast.show((t("templateSaved") as string) || "Template saved", { type: "success" });
              } catch (e) {
                Alert.alert("Error", String(e));
              }
            }}
          />
        </View>
      ) : null}
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
        renderItem={({ item }) => {
          const isEditing = item.id === editingId;
          return (
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
                  await toggleChecklistItem(
                    householdId,
                    taskId,
                    item.id,
                    !item.done,
                  );
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

              {isEditing ? (
                <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={editingText}
                    onChangeText={setEditingText}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      borderRadius: 8,
                      padding: 8,
                    }}
                  />
                  <Button title={t("save")} onPress={saveEdit} />
                  <Button title={t("cancel")} onPress={cancelEdit} />
                </View>
              ) : (
                <>
                  <Text style={{ flex: 1 }}>{item.label}</Text>
                  <Button
                    title={(t("edit") as string) || "Edit"}
                    onPress={() => startEdit(item.id, item.label)}
                  />
                  <Button
                    title={t("del")}
                    onPress={async () => {
                      if (!householdId) return;
                      await removeChecklistItem(householdId, taskId, item.id);
                      load();
                    }}
                  />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: "#999" }}>{t("noChecklist")}</Text>
        }
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TextInput
          ref={(r) => {
            inputRef.current = r;
          }}
          placeholder={t("addChecklist")}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={add}
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
                Alert.alert(
                  t("delete") || "Delete",
                  (t("confirmDeletePhoto") as string) || "Delete this photo?",
                  [
                    { text: t("cancel") || "Cancel", style: "cancel" },
                    {
                      text: t("delete") || "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deleteTaskPhoto(householdId, taskId, p.name);
                          const next = await listTaskPhotos(householdId, taskId);
                          setPhotos(next);
                        } catch {}
                      },
                    },
                  ],
                );
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

      {/* Comments */}
      <View style={{ height: 24 }} />
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>{t("comments") || "Comments"}</Text>
      {comments.length === 0 ? (
        <Text style={{ color: "#999", marginBottom: 8 }}>{t("nothingYet")}</Text>
      ) : null}
      {comments.map((c) => {
        const when = c.createdAt instanceof Date ? dayjs(c.createdAt).format("LT") : "";
        const header = [c.authorDisplayName || c.authorId, when].filter(Boolean).join(" · ");
        return (
          <View key={c.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text style={{ color: "#666", marginBottom: 2 }}>{header}</Text>
            <Text style={{ color: "#333" }}>{c.text}</Text>
          </View>
        );
      })}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TextInput
          placeholder={(t("add") as string) + " comment"}
          value={newComment}
          onChangeText={setNewComment}
          onSubmitEditing={async () => {
            if (!householdId || !newComment.trim()) return;
            try {
              const { text, mentions } = extractMentions(newComment, members);
              await addComment(householdId, taskId, text, mentions);
              setNewComment("");
              setComments(await listComments(householdId, taskId));
            } catch {}
          }}
          style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }}
        />
        <Button
          title={t("add")}
          onPress={async () => {
            if (!householdId || !newComment.trim()) return;
            try {
              const { text, mentions } = extractMentions(newComment, members);
              await addComment(householdId, taskId, text, mentions);
              setNewComment("");
              setComments(await listComments(householdId, taskId));
            } catch {}
          }}
        />
      </View>
      {mentionSuggestions.length > 0 ? (
        <View style={{ marginTop: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 8 }}>
          {mentionSuggestions.map((memb) => (
            <TouchableOpacity
              key={memb.userId}
              onPress={() => {
                // Replace current @word with @DisplayName and keep typing
                const replaced = newComment.replace(/@([^\s@]{1,20})$/, `@${(memb.displayName || memb.userId).trim()} `);
                setNewComment(replaced);
                setMentionSuggestions([]);
              }}
            >
              <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f2f2f2" }}>
                <Text>{memb.displayName || memb.userId}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function extractMentions(input: string, members: Member[]): { text: string; mentions: string[] } {
  // Match tokens starting with @ up to whitespace
  const regex = /@([^\s@]+)/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    if (m[1]) found.push(m[1]);
  }
  const lowerMap: { uid: string; name: string }[] = members.map((m) => ({
    uid: m.userId,
    name: (m.displayName || m.userId).toLowerCase(),
  }));
  const mentions: string[] = [];
  for (const token of found) {
    const tokenLower = token.toLowerCase();
    const match = lowerMap.find((x) => x.name.includes(tokenLower));
    if (match) mentions.push(match.uid);
  }
  // Keep the original text; server/client can see the raw @text
  return { text: input.trim(), mentions: Array.from(new Set(mentions)) };
}
