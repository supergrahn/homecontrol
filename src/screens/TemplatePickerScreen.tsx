import React from "react";
import { Text, FlatList, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listTemplates, touchTemplateLastUsed } from "../services/templates";
import Input from "../components/Input";

export default function TemplatePickerScreen({ route }: any) {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const { householdId } = useHousehold();
  const theme = useTheme();
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
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 8 }}>
        {t("templates") || "Templates"}
      </Text>
      <Input
        placeholder={t("search") || "Search"}
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
      />
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
            onPress={async () => {
              nav.goBack();
              const cb = route?.params?.onPick as undefined | ((name: string, items: string[]) => void);
              // touch last used
              try {
                if (householdId) await touchTemplateLastUsed(householdId, item.id);
              } catch {}
              if (cb) cb(item.name, item.items);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Use template ${item.name}`}
          >
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>{item.name}</Text>
            <Text style={{ color: theme.colors.muted }}>
              {item.items.length} {t("checklistType") || "checklist"}
              {typeof item.usageCount === "number" && item.usageCount > 0
                ? ` · ${t("usedTimes", { count: item.usageCount }) || `used ${item.usageCount}`}`
                : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ color: theme.colors.muted }}>{t("nothingYet") || "Nothing yet."}</Text>}
      />
    </ScreenContainer>
  );
}
