import React from "react";
import { View, Text, Button, FlatList, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import {
  readNextUpWidget,
  refreshNextUpWidget,
  type NextUpPayload,
} from "../services/widgets";
import { useNavigation } from "@react-navigation/native";

export default function WidgetPreviewScreen() {
  const { householdId } = useHousehold();
  const nav = useNavigation<any>();
  const [payload, setPayload] = React.useState<NextUpPayload | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const data = await readNextUpWidget(householdId);
      setPayload(data);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  const refresh = React.useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const data = await refreshNextUpWidget(householdId);
      setPayload(data);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Button
          title={loading ? "…" : "Reload"}
          onPress={load}
          disabled={loading || !householdId}
        />
        <Button
          title={loading ? "…" : "Refresh from data"}
          onPress={refresh}
          disabled={loading || !householdId}
        />
      </View>
      <Text style={{ color: "#666", marginBottom: 8 }}>
        {payload?.updatedAt
          ? `Updated ${dayjs(payload.updatedAt).format("YYYY-MM-DD HH:mm:ss")}`
          : "No widget payload stored yet."}
      </Text>
      <FlatList
        data={payload?.tasks || []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <Text style={{ color: "#666" }}>No items.</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => nav.navigate("TaskDetail", { id: item.id })}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#eee",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>{item.title}</Text>
            <Text style={{ color: "#666", marginTop: 2 }}>
              {dayjs(item.when).format("ddd HH:mm")} · {item.status}
              {typeof item.priority === "number" ? ` · P${item.priority}` : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
