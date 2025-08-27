import React from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { ActivityItem, fetchRecentActivity } from "../services/activityFeed";

export default function ActivityScreen() {
  const { householdId } = useHousehold();
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const data = await fetchRecentActivity(householdId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text style={{ fontWeight: "600" }}>{prettyAction(item.action)}</Text>
            {item.payload?.title ? (
              <Text style={{ color: "#333" }}>{item.payload.title}</Text>
            ) : null}
            <Text style={{ color: "#666", fontSize: 12 }}>
              {item.at ? new Date(item.at).toLocaleString() : ""}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: "#666", textAlign: "center", marginTop: 24 }}>
              No activity yet
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function prettyAction(action: string): string {
  switch (action) {
    case "task.create":
      return "Task created";
    case "task.complete":
      return "Task completed";
    case "invite.accept":
      return "Invite accepted";
    case "invite.create":
      return "Invite created";
    case "invite.revoke":
      return "Invite revoked";
    case "invite.expire":
      return "Invite expired";
    case "digest.daily":
      return "Daily summary";
    default:
      return action;
  }
}
