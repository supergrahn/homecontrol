import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { appEvents } from "../events";
import { navRef } from "../firebase/providers/NavigationProvider";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../design/theme";

type Current = {
  hid: string;
  taskId: string;
  title?: string;
  startedAt?: string; // ISO
};

export default function LiveActivityOverlay() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [current, setCurrent] = React.useState<Current | null>(null);
  const [tick, setTick] = React.useState<number>(0);

  React.useEffect(() => {
    const onStart = async (payload: any) => {
      const { hid, taskId, title, startedAt } = payload || {};
      let finalTitle = title as string | undefined;
      try {
        if (!finalTitle && hid && taskId) {
          const snap = await getDoc(
            doc(db, `households/${hid}/tasks/${taskId}`)
          );
          if (snap.exists())
            finalTitle = String((snap.data() as any)?.title || "Task");
        }
      } catch {}
      setCurrent({ hid, taskId, title: finalTitle || "Task", startedAt });
    };
    const onEnd = (payload: any) => {
      const { taskId } = payload || {};
      setCurrent((prev) => (prev && prev.taskId === taskId ? null : prev));
    };
    const s1 = appEvents.addListener("task:accepted", onStart);
    const s2 = appEvents.addListener("task:completed", onEnd);
    const s3 = appEvents.addListener("task:released", onEnd);
    const iv = setInterval(() => setTick((x) => x + 1), 1000);
    return () => {
      s1.remove();
      s2.remove();
      s3.remove();
      clearInterval(iv);
    };
  }, []);

  if (!current) return null;
  const started = current.startedAt ? dayjs(current.startedAt) : null;
  // Use tick in the calculation to satisfy linter and force re-renders
  const elapsed = started
    ? dayjs().add(tick, "millisecond").diff(started, "second")
    : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: (insets.bottom || 0) + 64,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 12,
        zIndex: 999,
        elevation: 12,
        shadowColor: theme.colors.border,
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "700" }} numberOfLines={1}>
            {current.title || "Task"}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: 2 }}>
            In progress · {mm}:{ss}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            try {
              if (navRef.isReady()) {
                navRef.navigate("TaskDetail", { id: current.taskId } as any);
              }
            } catch {}
          }}
          style={{
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "600" }}>Open</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
