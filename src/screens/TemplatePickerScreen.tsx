import React from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listTemplates, touchTemplateLastUsed } from "../services/templates";

export default function TemplatePickerScreen({ route }: any) {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const { householdId } = useHousehold();
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<{ id: string; name: string; items: string[]; usageCount?: number | null }[]>([]);

  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      const list = await listTemplates(householdId);
      setItems(list);
    })();
  }, [householdId]);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = [...items].sort((a, b) => {
      const at = (a as any).lastUsedAt ? new Date((a as any).lastUsedAt).getTime() : 0;
      const bt = (b as any).lastUsedAt ? new Date((b as any).lastUsedAt).getTime() : 0;
      return bt - at;
    });
    if (!term) return base;
    return base.filter((t) => t.name.toLowerCase().includes(term));
  }, [items, q]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        {t("templates") || "Templates"}
      </Text>
      <TextInput
        placeholder={t("search") || "Search"}
        value={q}
        onChangeText={setQ}
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 8 }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" }}
            onPress={async () => {
              nav.goBack();
              const cb = route?.params?.onPick as undefined | ((name: string, items: string[]) => void);
              // touch last used
              try {
                if (householdId) await touchTemplateLastUsed(householdId, item.id);
              } catch {}
              if (cb) cb(item.name, item.items);
            }}
          >
            <Text style={{ fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: "#666" }}>
              {item.items.length} {t("checklistType") || "checklist"}
              {typeof item.usageCount === "number" && item.usageCount > 0
                ? ` · ${t("usedTimes", { count: item.usageCount }) || `used ${item.usageCount}`}`
                : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: "#666" }}>{t("nothingYet") || "Nothing yet."}</Text>}
      />
    </View>
  );
}
