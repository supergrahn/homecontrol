import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/theme";
import type { Child } from "../services/children";
import { Ionicons } from "@expo/vector-icons";
import { Task } from "../models/task";
import { fetchChildTasks } from "../services/tasks";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

export type ChildDetailDrawerProps = {
  visible: boolean;
  child: Child | null;
  summary?: any | null;
  onClose: () => void;
  hid?: string;
};

// Helpers to derive schedule rendering
function startOfWeek(date: Date): Date {
  // Monday as first day of week
  const js = new Date(date);
  const wd = js.getDay(); // 0..6, Sun=0
  const offset = (wd + 6) % 7; // Mon=0
  return dayjs(js).subtract(offset, "day").startOf("day").toDate();
}

function getItemDayIndex(item: any): number | null {
  if (!item) return null;
  if (item.date) {
    const d = new Date(item.date);
    return d.getDay();
  }
  if (typeof item.day === "number") return item.day % 7;
  if (typeof item.day === "string") {
    const map: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const key = item.day.toLowerCase().slice(0, 3);
    return map[key] ?? null;
  }
  return null;
}

function renderSchedule(
  schedule: any[],
  view: "day" | "week",
  anchor: Date,
  theme: any,
  t: (k: string, opts?: any) => any
) {
  const entries = Array.isArray(schedule) ? schedule : [];
  if (view === "day") {
    // Filter items for the anchor date if day is known; otherwise show all as a daily template
    const dayIdx = anchor.getDay();
    const items = entries.filter((it) => {
      const idx = getItemDayIndex(it);
      return idx == null || idx === dayIdx; // if unknown, include
    });
    if (items.length === 0) {
      return <Text style={{ color: theme.colors.muted }}>{t("noScheduleForDay") || "No schedule for this day."}</Text>;
    }
    return (
      <View>
        {items.map((it, i) => (
          <View key={i} style={{ paddingVertical: 6, flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 72 }}>
              <Text style={{ color: theme.colors.muted, fontVariant: ["tabular-nums"] }}>
                {it.time || ""}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{it.subject || it.title || (t("lesson") as string) || "Lesson"}</Text>
              {!!it.homework && (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {(t("homework") as string) || "Homework"}: {String(it.homework)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }
  // Week view
  const start = startOfWeek(anchor);
  const days: { label: string; date: Date; items: any[] }[] = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs(start).add(i, "day").toDate();
    const label = dayjs(date).format("ddd");
    const idx = date.getDay();
    const items = entries.filter((it) => {
      const dIdx = getItemDayIndex(it);
      return dIdx == null || dIdx === idx;
    });
    return { label, date, items };
  });
  const anyHasDayInfo = entries.some((it) => getItemDayIndex(it) != null);
  if (!anyHasDayInfo && entries.length > 0) {
    return (
      <View>
        <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>
          {t("weekViewNotAvailable") || "Week view not available; showing daily template."}
        </Text>
        {renderSchedule(entries, "day", anchor, theme, t)}
      </View>
    );
  }
  return (
    <View>
      {days.map((d, i) => (
        <View key={i} style={{ paddingVertical: 6 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: "700", marginBottom: 4 }}>
            {d.label} {dayjs(d.date).format("MMM D")}
          </Text>
          {d.items.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>—</Text>
          ) : (
            d.items.map((it, j) => (
              <View key={j} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 2 }}>
                <View style={{ width: 72 }}>
                  <Text style={{ color: theme.colors.muted, fontVariant: ["tabular-nums"] }}>
                    {it.time || ""}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.text }}>{it.subject || it.title || (t("lesson") as string) || "Lesson"}</Text>
              </View>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

export default function ChildDetailDrawer({
  visible,
  child,
  summary,
  onClose,
  hid,
}: ChildDetailDrawerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(screenWidth)).current;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [scheduleView, setScheduleView] = useState<"day" | "week">("day");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  useEffect(() => {
    if (visible) {
      translateX.setValue(screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(screenWidth);
    }
  }, [visible, screenWidth, translateX]);

  const handleCloseAnimated = () => {
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!visible || !child?.id || !hid) return;
      setLoadingTasks(true);
      setTasksError(null);
      try {
        const items = await fetchChildTasks(hid, child.id, {
          includeDone: false,
          limit: 10,
        });
        if (alive) setTasks(items);
      } catch {
        if (alive) setTasksError("Failed to load tasks");
      }
      if (alive) setLoadingTasks(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [visible, child, hid]);

  if (!child) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.colors.surface,
                transform: [{ translateX }],
                paddingTop: 20 + insets.top,
                paddingRight: 20 + insets.right,
                paddingBottom: 20 + insets.bottom,
                paddingLeft: 20 + insets.left,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* Header */}
              <View style={{ marginBottom: 16, position: "relative", minHeight: 32, justifyContent: "center" }}>
                <TouchableOpacity
                  accessibilityLabel={(t("close") as string) || "Close"}
                  onPress={handleCloseAnimated}
                  style={[styles.closeButton, { position: "absolute", top: 0, left: 0, padding: 12 }]}
                >
                  <Text style={[styles.closeText, { color: theme.colors.onSurface }]}>×</Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.onSurface,
                      textAlign: "center",
                      marginBottom: 0,
                      position: "absolute",
                      left: 0,
                      right: 0,
                    },
                  ]}
                >
                  {child.displayName}
                </Text>
              </View>

              {/* Profile card */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: child.color || theme.colors.card,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="person" size={22} color={theme.colors.onSurface} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>{child.displayName}</Text>
                    {!!child.school?.name && (
                      <Text style={{ color: theme.colors.muted }}>{child.school.name}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* School info card */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Ionicons name="school-outline" size={18} color={theme.colors.onSurface} />
                  <Text style={{ marginLeft: 8, color: theme.colors.onSurface, fontWeight: "700" }}>{t("school") || "School"}</Text>
                </View>
                {summary?.error ? (
                  <Text style={{ color: theme.colors.error }}>{t("schoolSummaryError") || "Could not fetch school info."}</Text>
                ) : (
                  <>
                    <Text style={{ color: theme.colors.text }}>
                      {(child.school && (child.school.name || child.school.title || child.school.displayName)) || (t("unknown") as string) || "Unknown"}
                    </Text>
                    {!!child.school?.address?.locality && (
                      <Text style={{ color: theme.colors.muted }}>{child.school.address.locality}</Text>
                    )}
                    {!!child.school?.website && (
                      <Text style={{ color: theme.colors.primary, textDecorationLine: "underline", marginTop: 6 }}>
                        {child.school.website}
                      </Text>
                    )}
                    {!!child.schoolGradeLabel && (
                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                        <View style={[styles.chip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                          <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                            {(t("grade") as string) || "Grade"}: {child.schoolGradeLabel}
                          </Text>
                        </View>
                      </View>
                    )}
                    {summary?.anomalies?.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: theme.colors.warning, fontWeight: "600", marginBottom: 4 }}>
                          {t("anomalies") || "Anomalies"}
                        </Text>
                        {summary.anomalies.map((a: string, i: number) => (
                          <Text key={i} style={{ color: theme.colors.warning }}>{"• "}{a}</Text>
                        ))}
                      </View>
                    )}
                    {summary?.links?.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ color: theme.colors.onSurface, fontWeight: "600", marginBottom: 4 }}>
                          {t("documents") || "Documents"}
                        </Text>
                        {summary.links.map((link: any, idx: number) => (
                          <Text key={idx} style={{ color: theme.colors.primary, textDecorationLine: "underline" }}>
                            {link.title || link.url}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Schedule card */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.onSurface} />
                    <Text style={{ marginLeft: 8, color: theme.colors.onSurface, fontWeight: "700" }}>{t("schedule") || "Schedule"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity onPress={() => setScheduleView("day")}> 
                      <Text style={{ color: scheduleView === "day" ? theme.colors.primary : theme.colors.text, fontWeight: "600" }}>{t("day") || "Day"}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.muted, marginHorizontal: 8 }}>|</Text>
                    <TouchableOpacity onPress={() => setScheduleView("week")}>
                      <Text style={{ color: scheduleView === "week" ? theme.colors.primary : theme.colors.text, fontWeight: "600" }}>{t("week") || "Week"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setAnchorDate(dayjs(anchorDate).subtract(1, scheduleView === "day" ? "day" : "week").toDate())}>
                    <Ionicons name="chevron-back" size={20} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                    {scheduleView === "day"
                      ? dayjs(anchorDate).format("ddd, MMM D")
                      : (t("weekOf", { date: dayjs(startOfWeek(anchorDate)).format("MMM D") }) as string) || `Week of ${dayjs(startOfWeek(anchorDate)).format("MMM D")}`}
                  </Text>
                  <TouchableOpacity onPress={() => setAnchorDate(dayjs(anchorDate).add(1, scheduleView === "day" ? "day" : "week").toDate())}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                </View>
                {renderSchedule(summary?.schedule || [], scheduleView, anchorDate, theme, t)}
              </View>

              {/* Events placeholder */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t("events") || "Events"}</Text>
                <Text style={{ color: theme.colors.muted }}>{t("noUpcomingEvents") || "No upcoming events yet."}</Text>
              </View>

              {/* Tasks */}
              <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{t("tasks") || "Tasks"}</Text>
                {loadingTasks ? (
                  <Text style={{ color: theme.colors.muted }}>{t("loading") || "Loading…"}</Text>
                ) : tasksError ? (
                  <Text style={{ color: theme.colors.error }}>{tasksError}</Text>
                ) : tasks.length === 0 ? (
                  <Text style={{ color: theme.colors.muted }}>{t("noTasksYet") || "No tasks yet."}</Text>
                ) : (
                  tasks.map((task) => (
                    <View key={task.id} style={{ paddingVertical: 6 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{task.title}</Text>
                      {task.nextOccurrenceAt && (
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                          {(t("next") as string) || "Next"}: {new Date(task.nextOccurrenceAt as any).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    padding: 20,
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
