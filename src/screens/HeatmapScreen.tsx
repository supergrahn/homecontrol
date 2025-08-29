import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { listMembers, type Member } from "../services/members";
import { getWorkloadHeatmap, type Heatmap } from "../services/workload";
import { useNavigation } from "@react-navigation/native";

export default function HeatmapScreen() {
  const { householdId } = useHousehold();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [heatmap, setHeatmap] = React.useState<Heatmap | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string | "ALL">(
    "ALL"
  );
  const [range, setRange] = React.useState<7 | 14 | 30>(7);
  const [showBlocked, setShowBlocked] = React.useState(true);
  const [showUpcoming, setShowUpcoming] = React.useState(true);

  React.useEffect(() => {
    navigation.setOptions({ title: "Workload heatmap" });
  }, [navigation]);

  // Load members once per household
  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      try {
        const m = await listMembers(householdId);
        setMembers(m);
      } catch {}
    })();
  }, [householdId]);

  // Load heatmap when filters change
  React.useEffect(() => {
    (async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        const types: ("blocked" | "upcoming")[] = [];
        if (showUpcoming) types.push("upcoming");
        if (showBlocked) types.push("blocked");
        const h = await getWorkloadHeatmap(householdId, {
          rangeDays: range,
          types,
        });
        setHeatmap(h);
      } catch {
        setHeatmap(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId, range, showBlocked, showUpcoming]);

  const usersToShow = React.useMemo(() => {
    const base = members.map((m) => ({
      userId: m.userId,
      display: m.displayName || m.userId,
    }));
    return (
      [{ userId: "ALL", display: "All" }] as {
        userId: string;
        display: string;
      }[]
    ).concat(base);
  }, [members]);

  const ranges: (7 | 14 | 30)[] = [7, 14, 30];

  return (
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      {/* Filters */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 6 }}>Filters</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        >
          {usersToShow.map((u) => {
            const active = selectedUserId === u.userId;
            return (
              <TouchableOpacity
                key={u.userId}
                onPress={() => setSelectedUserId(u.userId as any)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${u.display}`}
                accessibilityState={{ selected: active }}
                 style={{
                   paddingHorizontal: 10,
                   paddingVertical: 6,
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderRadius: 16,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.text }} numberOfLines={1}>
                  {u.display}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          {ranges.map((d) => {
            const active = range === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setRange(d)}
                accessibilityRole="button"
                accessibilityLabel={`Range ${d} days`}
                accessibilityState={{ selected: active }}
                 style={{
                   paddingHorizontal: 10,
                   paddingVertical: 6,
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                  borderRadius: 16,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: active ? theme.colors.onPrimary : theme.colors.text }}>{d}d</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {[
            {
              key: "upcoming",
              label: "Upcoming",
              value: showUpcoming,
              setter: setShowUpcoming,
            },
            {
              key: "blocked",
              label: "Blocked",
              value: showBlocked,
              setter: setShowBlocked,
            },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => t.setter(!t.value)}
              accessibilityRole="button"
              accessibilityLabel={`${t.label} ${t.value ? "on" : "off"}`}
              accessibilityState={{ selected: t.value }}
               style={{
                 paddingHorizontal: 10,
                 paddingVertical: 6,
                backgroundColor: t.value ? theme.colors.primary : theme.colors.card,
                borderRadius: 16,
                marginRight: 8,
              }}
            >
              <Text style={{ color: t.value ? "#fff" : theme.colors.text }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: theme.colors.muted, marginTop: 4, fontSize: 12 }}>
          Toggle members, types, and 7/14/30-day ranges to explore workload.
        </Text>
      </View>

      {/* Heatmap grid */}
      {loading && (
        <View style={{ paddingTop: 32 }}>
          <ActivityIndicator />
        </View>
      )}
      {!loading && heatmap && (
        <View>
          <View style={{ flexDirection: "row", marginBottom: 6 }}>
            <View style={{ width: 120 }} />
            {heatmap.days.map((d) => (
              <Text key={d} style={{ width: 32, textAlign: "center", color: theme.colors.muted, fontSize: 11 }}>
                {d.slice(5)}
              </Text>
            ))}
          </View>
          {(selectedUserId === "ALL"
            ? members.map((m) => m.userId)
            : [selectedUserId]
          ).map((uid) => (
            <View
              key={uid}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={{ width: 120, color: theme.colors.text }} numberOfLines={1}>
                {uid === "ALL"
                  ? "All"
                  : members.find((m) => m.userId === uid)?.displayName || uid}
              </Text>
              {heatmap.days.map((day) => {
                const key = `${day}|${uid}`;
                const count =
                  selectedUserId === "ALL"
                    ? members
                        .map((m) => heatmap.cells[`${day}|${m.userId}`] || 0)
                        .reduce((a, b) => a + b, 0)
                    : heatmap.cells[key] || 0;
                const intensity = Math.min(1, count / 3);
                const bg =
                  intensity === 0
                    ? theme.colors.card
                    : `rgba(99,102,241,${0.2 + 0.6 * intensity})`;
                return (
                  <View
                    key={`${day}-${uid}`}
                    style={{
                      width: 32,
                      height: 22,
                      marginRight: 4,
                      backgroundColor: bg,
                      borderRadius: 3,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 10, color: intensity === 0 ? theme.colors.muted : theme.colors.text }}>
                      {count || ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {!loading && !heatmap && (
        <Text style={{ color: theme.colors.muted }}>No data yet.</Text>
      )}
    </ScreenContainer>
  );
}
