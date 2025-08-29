import React from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { ActivityItem, fetchRecentActivity } from "../services/activityFeed";

export default function ActivityScreen() {
  const theme = useTheme();
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
    <ScreenContainer>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 8 }}>
            Recent activity
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>
              {prettyAction(item.action)}
            </Text>
            {item.payload?.title ? (
              <Text style={{ color: theme.colors.text }}>{item.payload.title}</Text>
            ) : null}
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {item.at ? new Date(item.at).toLocaleString() : ""}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 24 }}>
              No activity yet
            </Text>
          ) : null
        }
      />
    </ScreenContainer>
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
