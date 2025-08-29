import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { createTask } from "../services/tasks";
import { addChecklistItem } from "../services/checklist";
import { auth } from "../firebase";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useToast } from "../components/ToastProvider";
import { listTemplates } from "../services/templates";
import { listChildren, type Child } from "../services/children";
import Input from "../components/Input";
import Button from "../components/Button";

export default function AddTaskScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<
    "chore" | "event" | "deadline" | "checklist"
  >("chore");
  const [priority, setPriority] = React.useState<number | undefined>(undefined);
  const [tagsText, setTagsText] = React.useState<string>("");
  const inputRef = React.useRef<any>(null);
  const [lastTemplate, setLastTemplate] = React.useState<{ id: string; name: string; items: string[] } | null>(null);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [childIds, setChildIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setLastTemplate(null);
        const list = await listTemplates(householdId);
        const withTs = list
          .map((t: any) => ({ ...t, _ts: t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0 }))
          .sort((a, b) => b._ts - a._ts);
        setLastTemplate(withTs[0] || null);
      } catch {
        setLastTemplate(null);
      }
    })();
  }, [householdId]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setKids([]);
        setKids(await listChildren(householdId));
      } catch { setKids([]); }
    })();
  }, [householdId]);

  React.useEffect(() => {
    const initial = route?.params?.type as
      | "chore"
      | "event"
      | "deadline"
      | "checklist"
      | undefined;
    if (initial) setType(initial);
  }, [route?.params?.type]);

  const save = async () => {
    if (!title.trim()) return;
    if (!householdId) return;
    await createTask(householdId, {
      title: title.trim(),
      type,
      priority,
  childIds,
      context: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdBy: auth.currentUser?.uid || "unknown",
      // minimal — dueAt/startAt/rrule can be added via TaskDetail in MVP
    });
  toast.show((t("taskCreated") as string) || "Task created", { type: "success" });
    navigation.goBack();
  };

  const saveAndAddAnother = async () => {
    if (!title.trim()) return;
    if (!householdId) return;
    await createTask(householdId, {
      title: title.trim(),
      type,
      priority,
  childIds,
      context: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdBy: auth.currentUser?.uid || "unknown",
    });
    setTitle("");
    setPriority(undefined);
    setTagsText("");
  toast.show((t("taskCreated") as string) || "Task created", { type: "success" });
    // re-focus for fast entry
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface }}>
        {t("newTask")}
      </Text>
      <Input
        ref={(r) => {
          inputRef.current = r;
        }}
        placeholder={t("titleLabel")}
        value={title}
        onChangeText={setTitle}
        returnKeyType="done"
      />
      <Text style={{ color: theme.colors.text }}>{t("type")}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["chore", "event", "deadline", "checklist"] as const).map((tk) => (
          <Button
            key={tk}
            title={t(tk)}
            onPress={() => setType(tk)}
            variant={type === tk ? "primary" : "outline"}
          />
        ))}
      </View>
  <Text style={{ marginTop: 8, color: theme.colors.text }}>{t("priority") || "Priority"}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[undefined, 1, 2, 3].map((p) => (
          <Button
            key={String(p)}
            title={
              p === undefined
                ? (t("priorityNone") as string) || "None"
                : p === 1
                  ? (t("priorityLow") as string) || "Low"
                  : p === 2
                    ? (t("priorityMedium") as string) || "Medium"
                    : (t("priorityHigh") as string) || "High"
            }
            onPress={() => setPriority(p as any)}
            variant={priority === p ? "primary" : "outline"}
          />
        ))}
      </View>
      {/* Kid assignment chips */}
      {kids.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ marginBottom: 6, color: theme.colors.text }}>{(t("assignToKids") as string) || "Assign to kids"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {kids.map((k) => {
              const active = childIds.includes(k.id);
              return (
                <TouchableOpacity key={k.id} onPress={() => {
                  setChildIds((prev) => prev.includes(k.id) ? prev.filter((x) => x !== k.id) : [...prev, k.id]);
                }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? theme.colors.text : theme.colors.border, backgroundColor: theme.colors.card }}>
                    <Text style={{ fontSize: 14 }}>{k.emoji || "🙂"}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text }}>{k.displayName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      <Text style={{ marginTop: 8, color: theme.colors.text }}>{t("tags") || "Tags"}</Text>
  <Input
        placeholder={(t("tagsPlaceholder") as string) || "Comma-separated"}
        value={tagsText}
        onChangeText={setTagsText}
        autoCapitalize="none"
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title={t("save")} onPress={save} disabled={!householdId} />
        <Button
          title={(t("saveAndAddAnother") as string) || "Save and add another"}
          onPress={saveAndAddAnother}
          disabled={!householdId}
        />
      </View>
      <View style={{ height: 8 }} />
      {lastTemplate ? (
        <Button
          title={(t("useLastTemplate") as string) || `Use last template: ${lastTemplate.name}`}
          onPress={async () => {
            try {
              if (!householdId || !lastTemplate) return;
              const newId = await createTask(householdId, {
                title: title.trim() || lastTemplate.name,
                type: "checklist",
                createdBy: auth.currentUser?.uid || "unknown",
              });
              for (const it of lastTemplate.items) {
                await addChecklistItem(householdId, newId, it);
              }
              toast.show((t("templateInserted") as string) || "Template inserted", { type: "success" });
              navigation.replace("TaskDetail", { id: newId });
            } catch {}
          }}
          disabled={!householdId}
        />
      ) : null}
      <Button
        title={(t("insertFromTemplate") as string) || "Insert from template"}
        onPress={() => {
          navigation.navigate("TemplatePicker", {
            onPick: async (_name: string, items: string[]) => {
              try {
                if (!householdId) return;
                const newId = await createTask(householdId, {
                  title: title.trim() || _name,
                  type: "checklist",
                  createdBy: auth.currentUser?.uid || "unknown",
                });
                for (const it of items) {
                  await addChecklistItem(householdId, newId, it);
                }
                toast.show((t("templateInserted") as string) || "Template inserted", { type: "success" });
                navigation.replace("TaskDetail", { id: newId });
              } catch {}
            },
          });
        }}
        disabled={!householdId}
      />
  </ScreenContainer>
  );
}
