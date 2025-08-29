import React from "react";
import { View, Text, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { fetchTodayTasks, fetchOverdueTasks, fetchUpcomingTasks } from "../services/tasks";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import Input from "../components/Input";

export default function SearchScreen() {
  const theme = useTheme();
  const { householdId } = useHousehold();
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);

  const run = React.useCallback(async () => {
    if (!householdId) return setItems([]);
    const [today, overdue, upcoming] = await Promise.all([
      fetchTodayTasks(householdId),
      fetchOverdueTasks(householdId),
      fetchUpcomingTasks(householdId),
    ]);
    const all = [...today, ...overdue, ...upcoming];
    const term = q.toLowerCase();
    setItems(
      term ? all.filter((t) => t.title.toLowerCase().includes(term)) : []
    );
  }, [householdId, q]);

  React.useEffect(() => {
    const id = setTimeout(run, 150);
    return () => clearTimeout(id);
  }, [run]);

  return (
    <ScreenContainer>
  <Input placeholder="Search tasks" value={q} onChangeText={setQ} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>{item.title}</Text>
            <Text style={{ color: theme.colors.muted }}>{item.type}</Text>
          </View>
        )}
        ListEmptyComponent={q ? (
          <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 24 }}>No results</Text>
        ) : (
          <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 24 }}>Type to search…</Text>
        )}
      />
    </ScreenContainer>
  );
}
