import React from "react";
import { View, Text, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { listMembers, type Member } from "../services/members";
import { getWorkloadHeatmap, type Heatmap } from "../services/workload";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { getFairnessStats, type FairnessUser } from "../services/stats";

export default function MembersScreen() {
  const theme = useTheme();
  const { householdId } = useHousehold();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<null | {
    users: FairnessUser[];
    totals: { completed: number; assigned: number };
  }>(null);
  const [heatmap, setHeatmap] = React.useState<Heatmap | null>(null);

  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        setMembers(await listMembers(householdId));
        try {
          const s = await getFairnessStats(householdId);
          setStats({ users: s.users, totals: s.totals });
        } catch {}
        try {
          const h = await getWorkloadHeatmap(householdId);
          setHeatmap(h);
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  return (
    <ScreenContainer>
      <Text style={{ ...theme.typography.h2, color: theme.colors.onSurface, marginBottom: 8 }}>
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
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>
              {item.displayName || item.userId}
            </Text>
            <Text style={{ color: theme.colors.muted }}>{item.role}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 24 }}>
              No members yet
            </Text>
          ) : null
        }
        ListHeaderComponent={
          stats ? (
            <View style={{ paddingVertical: 8 }}>
              <Text
                style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 4 }}
              >
                Fairness
              </Text>
              {stats.users.map((u) => (
                <View
                  key={u.userId}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ flex: 1, color: theme.colors.text }} numberOfLines={1}>
                    {members.find((m) => m.userId === u.userId)?.displayName ||
                      u.userId}
                  </Text>
                  <Text style={{ width: 64, textAlign: "right", color: theme.colors.text }}>
                    {u.completed}
                  </Text>
                  <Text
                    style={{
                      width: 64,
                      textAlign: "right",
                      color: u.delta < 0 ? "#cc3d3d" : "#2a7",
                    }}
                  >
                    {u.delta >= 0 ? "+" : ""}
                    {u.delta}
                  </Text>
                </View>
              ))}
              {heatmap ? (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 6 }}
                  >
                    Next 7 days
                  </Text>
                  <View style={{ flexDirection: "row", marginBottom: 6 }}>
                    <View style={{ width: 120 }} />
                    {heatmap.days.map((d) => (
                      <Text
                        key={d}
                        style={{
                          width: 28,
                          textAlign: "center",
                          color: theme.colors.muted,
                          fontSize: 11,
                        }}
                      >
                        {d.slice(5)}
                      </Text>
                    ))}
                  </View>
                  {members.map((m) => (
                    <View
                      key={m.userId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ width: 120, color: theme.colors.text }} numberOfLines={1}>
                        {m.displayName || m.userId}
                      </Text>
                      {heatmap.days.map((day) => {
                        const key = `${day}|${m.userId}`;
                        const count = heatmap.cells[key] || 0;
                        const intensity = Math.min(1, count / 3);
                        const bg =
                          intensity === 0
                            ? "#F3F4F6"
                            : `rgba(99,102,241,${0.2 + 0.6 * intensity})`;
                        return (
                          <View
                            key={key}
                            style={{
                              width: 28,
                              height: 20,
                              marginRight: 4,
                              backgroundColor: bg,
                              borderRadius: 3,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color: intensity === 0 ? theme.colors.muted : theme.colors.text,
                              }}
                            >
                              {count || ""}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}
