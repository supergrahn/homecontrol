import React from "react";
import { View, Text, FlatList } from "react-native";
import { listMembers, type Member } from "../services/members";
import { useHousehold } from "../firebase/providers/HouseholdProvider";

export default function MembersScreen() {
  const { householdId } = useHousehold();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        setMembers(await listMembers(householdId));
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        Members
      </Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.userId}
        refreshing={loading}
        onRefresh={async () => {
          if (householdId) setMembers(await listMembers(householdId));
        }}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text style={{ fontWeight: "600" }}>{item.displayName || item.userId}</Text>
            <Text style={{ color: "#666" }}>{item.role}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <Text style={{ color: "#666", textAlign: "center", marginTop: 24 }}>
            No members yet
          </Text>
        ) : null}
      />
    </View>
  );
}
