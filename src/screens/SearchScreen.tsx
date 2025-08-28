import React from "react";
import { View, Text, TextInput, FlatList } from "react-native";
import { fetchTodayTasks, fetchOverdueTasks, fetchUpcomingTasks } from "../services/tasks";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function SearchScreen() {
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
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Search tasks"
        value={q}
        onChangeText={setQ}
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text style={{ fontWeight: "600" }}>{item.title}</Text>
            <Text style={{ color: "#666" }}>{item.type}</Text>
          </View>
        )}
        ListEmptyComponent={q ? (
          <Text style={{ color: "#666", textAlign: "center", marginTop: 24 }}>No results</Text>
        ) : (
          <Text style={{ color: "#666", textAlign: "center", marginTop: 24 }}>Type to search…</Text>
        )}
      />
    </View>
  );
}
