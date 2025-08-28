import React from "react";
import { View, Text, FlatList, Button, TouchableOpacity, Modal, Animated, PanResponder, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TaskCard from "../components/TaskCard";
import {
  fetchTodayTasks,
  fetchOverdueTasks,
  fetchUpcomingTasks,
} from "../services/tasks";
import { listChildren, type Child } from "../services/children";
import { fetchRecentActivity } from "../services/activity";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { fetchLatestDigest } from "../services/digest";
import dayjs from "dayjs";
import { appEvents } from "../App";
// import { createHousehold } from '../services/households';

// Household id from context

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"today" | "overdue" | "upcoming">(
    "today",
  );
  const { householdId, households, loading, selectHousehold } = useHousehold();
  const [tagFilter, setTagFilter] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [prioritySort, setPrioritySort] = React.useState<"none" | "high" | "low">("none");
  const [showAllTags, setShowAllTags] = React.useState(false);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [kidIds, setKidIds] = React.useState<string[]>([]);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [typePickerOpen, setTypePickerOpen] = React.useState(false);
  const sheetY = React.useRef(new Animated.Value(0)).current;
  const closeSheet = React.useCallback(() => {
    Animated.timing(sheetY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setTypePickerOpen(false);
      sheetY.setValue(0);
    });
  }, [sheetY]);
  const pan = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderMove: Animated.event([null, { dy: sheetY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 120) {
          closeSheet();
        } else {
          Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
  ).current;

  React.useEffect(() => {
    if (typePickerOpen) {
      sheetY.setValue(280);
      Animated.spring(sheetY, {
        toValue: 0,
        useNativeDriver: false,
        speed: 14,
        bounciness: 9,
      }).start();
    }
  }, [typePickerOpen, sheetY]);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    const sub = appEvents.addListener("show-overdue", () => setTab("overdue"));
    return () => {
      sub.remove();
    };
  }, []);

  const enabled = !!householdId;
  const today = useQuery({
    queryKey: ["today", householdId],
    queryFn: () => fetchTodayTasks(householdId!, { priorityOrder: prioritySort === "high" ? "desc" : prioritySort === "low" ? "asc" : undefined } as any),
    enabled,
  });
  const overdue = useQuery({
    queryKey: ["overdue", householdId],
    queryFn: () => fetchOverdueTasks(householdId!, { priorityOrder: prioritySort === "high" ? "desc" : prioritySort === "low" ? "asc" : undefined } as any),
    enabled,
  });
  const upcoming = useQuery({
    queryKey: ["upcoming", householdId],
    queryFn: () => fetchUpcomingTasks(householdId!, { priorityOrder: prioritySort === "high" ? "desc" : prioritySort === "low" ? "asc" : undefined } as any),
    enabled,
  });
  const digest = useQuery({
    queryKey: ["digest", householdId],
    queryFn: () => fetchLatestDigest(householdId!),
    enabled,
  });

  // If a digest arrives indicating zero 'today' but some overdue, switch to Overdue once
  React.useEffect(() => {
    const d = digest.data;
    if (d && d.counts) {
      if (d.counts.today === 0 && d.counts.overdue > 0 && tab === "today") {
        setTab("overdue");
      }
    }
  }, [digest.data, tab]);

  const list = tab === "today" ? today : tab === "overdue" ? overdue : upcoming;
  const activity = useQuery({
    queryKey: ["activity", householdId],
    queryFn: () => fetchRecentActivity(householdId!),
    enabled,
  });

  // Persist filters per household and tab
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return;
        const raw = await AsyncStorage.getItem(`@hc:filters:${householdId}:${tab}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.tagFilter === "string") {
            setTagFilter(parsed.tagFilter);
            setTagInput(parsed.tagFilter);
          }
          if (["none", "high", "low"].includes(parsed?.prioritySort)) setPrioritySort(parsed.prioritySort);
          if (Array.isArray(parsed?.kidIds)) setKidIds(parsed.kidIds);
        } else {
          setTagFilter("");
          setTagInput("");
          setPrioritySort("none");
          setKidIds([]);
        }
      } catch {}
    })();
  }, [householdId, tab]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return;
        await AsyncStorage.setItem(
          `@hc:filters:${householdId}:${tab}`,
          JSON.stringify({ tagFilter, prioritySort, kidIds }),
        );
      } catch {}
    })();
  }, [householdId, tab, tagFilter, prioritySort, kidIds]);

  // Debounce tag input -> tagFilter
  React.useEffect(() => {
    const h = setTimeout(() => setTagFilter(tagInput), 250);
    return () => clearTimeout(h);
  }, [tagInput]);

  // Collapse expanded tag chips when switching tabs/household
  React.useEffect(() => {
    setShowAllTags(false);
  }, [tab, householdId]);

  // Load kids for chips
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) { setKids([]); return; }
        const list = await listChildren(householdId);
        setKids(list);
      } catch { setKids([]); }
    })();
  }, [householdId]);

  const { displayData, kidCounts } = React.useMemo(() => {
    const raw = ((!!householdId ? list.data : []) || []).slice();
    // Tag filter first
    const terms = tagFilter
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const tagFiltered = terms.length
      ? raw.filter((task: any) => {
          const ctx = Array.isArray(task.context)
            ? task.context.map((x: string) => String(x).toLowerCase())
            : [];
          return terms.some((t) => ctx.includes(t));
        })
      : raw;
    // Build per-kid counts from tag-filtered set
    const map = new Map<string, number>();
    for (const t of tagFiltered as any[]) {
      const ids: string[] = Array.isArray((t as any).childIds) ? (t as any).childIds : [];
      for (const id of ids) map.set(id, (map.get(id) || 0) + 1);
    }
    // Apply kid filter
    const byKids = kidIds.length
      ? tagFiltered.filter((t: any) => {
          const ids: string[] = Array.isArray((t as any).childIds) ? (t as any).childIds : [];
          return ids.some((id) => kidIds.includes(id));
        })
      : tagFiltered;
    // Priority sort last
    if (prioritySort !== "none") {
      byKids.sort((a: any, b: any) => {
        const pa = typeof a.priority === "number" ? a.priority : 0;
        const pb = typeof b.priority === "number" ? b.priority : 0;
        return prioritySort === "high" ? pb - pa : pa - pb;
      });
    }
    return { displayData: byKids, kidCounts: map } as { displayData: any[]; kidCounts: Map<string, number> };
  }, [list.data, householdId, tagFilter, prioritySort, kidIds]);

  const refreshAll = React.useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["digest", householdId] }),
        qc.invalidateQueries({ queryKey: ["today", householdId] }),
        qc.invalidateQueries({ queryKey: ["overdue", householdId] }),
        qc.invalidateQueries({ queryKey: ["upcoming", householdId] }),
        qc.invalidateQueries({ queryKey: ["activity", householdId] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, qc, householdId]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {tab === "today"
            ? t("today")
            : tab === "overdue"
              ? t("overdue")
              : t("upcoming")}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Button
            title={
              householdId
                ? households.find((h) => h.id === householdId)?.name ||
                  householdId
                : t("selectHousehold")
            }
            onPress={() => setSelectorOpen(true)}
          />
          <Button
            title={t("add")}
            onPress={() => navigation.navigate("AddTask")}
          />
          <TouchableOpacity onPress={() => navigation.navigate("Activity")}
            accessibilityLabel={t("recentActivity")}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {!enabled && !loading ? (
        <View>
          <Text>
            {households.length > 0
              ? t("selectHouseholdToContinue")
              : t("noHouseholds")}
          </Text>
          {households.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <Button
                title={t("createHousehold")}
                onPress={() => navigation.navigate("Settings")}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["today", "overdue", "upcoming"] as const).map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: tab === key ? "#111" : "#eee",
              }}
            >
              <Text style={{ color: tab === key ? "#fff" : "#111" }}>
                {t(key)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily summary card */}
      {enabled ? (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: "#f7f7f7",
            borderWidth: 1,
            borderColor: "#eee",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", marginBottom: 4 }}>
              {t("dailySummary")}
            </Text>
            <Button
              title={t("refresh")}
              onPress={() => {
                qc.invalidateQueries({ queryKey: ["digest", householdId] });
                qc.invalidateQueries({ queryKey: ["today", householdId] });
                qc.invalidateQueries({ queryKey: ["overdue", householdId] });
                qc.invalidateQueries({ queryKey: ["upcoming", householdId] });
              }}
            />
          </View>
          {digest.isLoading ? (
            <Text>{t("loading")}</Text>
          ) : digest.data ? (
            <View>
              <Text>
                {t("dailySummaryCounts", {
                  today: digest.data.counts.today,
                  overdue: digest.data.counts.overdue,
                })}
              </Text>
              {!!(digest.data as any).samples ? (
                <Text style={{ color: "#666", marginTop: 4 }}>
                  {[
                    (digest.data as any).samples.todayTitles,
                    (digest.data as any).samples.overdueTitles,
                  ]
                    .flat()
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(" • ")}
                </Text>
              ) : null}
              {digest.data.counts.overdue > 0 ? (
                <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
                  <Button
                    title={t("viewOverdue")}
                    onPress={() => setTab("overdue")}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ color: "#666" }}>{t("noSummaryYet")}</Text>
          )}
        </View>
      ) : null}

    {enabled && list.isLoading ? (
        <Text>{t("loading")}</Text>
      ) : (
        <FlatList
      // Filtered+sorted client-side for now; can move to server later
      data={displayData}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refreshAll}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => navigation.navigate("TaskDetail", { id: item.id })}
              onChanged={() => {
                qc.invalidateQueries({ queryKey: ["today", householdId] });
                qc.invalidateQueries({ queryKey: ["overdue", householdId] });
                qc.invalidateQueries({ queryKey: ["upcoming", householdId] });
              }}
              showQuickAccept={tab === "today" || tab === "overdue"}
            />
          )}
          ListEmptyComponent={<Text>{t("noTasks")}</Text>}
        />
      )}

      {/* Filters */}
      {enabled ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>{t("filters") || "Filters"}</Text>
          {/* Kid chips */}
          {kids.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {kids.map((k) => {
                const active = kidIds.includes(k.id);
                const count = kidCounts.get(k.id) || 0;
                return (
                  <TouchableOpacity key={k.id} onPress={() => {
                    const next = active ? kidIds.filter((x) => x !== k.id) : [...kidIds, k.id];
                    setKidIds(next);
                  }}>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? "#111" : "#E5E7EB", backgroundColor: active ? "#EEF2FF" : "#F9FAFB" }}>
                      <Text style={{ fontSize: 14 }}>{k.emoji || "🙂"}</Text>
                      <Text style={{ fontSize: 12 }}>{k.displayName}</Text>
                      {count > 0 ? (
                        <View style={{ marginLeft: 4, backgroundColor: "#111", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: "#fff", fontSize: 10 }}>{count}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
              placeholder={(t("tagsFilter") as string) || "Filter by tags (comma-separated)"}
          value={tagInput}
          onChangeText={setTagInput}
              autoCapitalize="none"
              style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button
              title={(t("sortByPriorityHighFirst") as string) || "High priority first"}
              onPress={() => setPrioritySort("high")}
              color={prioritySort === "high" ? ("#111") : undefined}
            />
            <Button
              title={(t("sortByPriorityLowFirst") as string) || "Low priority first"}
              onPress={() => setPrioritySort("low")}
              color={prioritySort === "low" ? ("#111") : undefined}
            />
            <Button
              title={(t("clearFilters") as string) || "Clear"}
              onPress={() => {
                setTagFilter("");
                setTagInput("");
                setPrioritySort("none");
              }}
            />
          </View>
          {/* Quick tag chips from visible tasks (capped with +N more) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {(() => {
              const tagSet = new Set<string>();
              for (const task of displayData as any[]) {
                const ctx = Array.isArray(task?.context) ? task.context : [];
                for (const t of ctx) {
                  if (typeof t === "string" && t.trim()) tagSet.add(t.trim());
                }
              }
              const current = new Set(
                tagFilter
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              );
              const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
              const MAX_CHIPS = 12;
              const visibleTags = showAllTags ? tags : tags.slice(0, MAX_CHIPS);
              const hiddenCount = Math.max(0, tags.length - MAX_CHIPS);

              const chips = visibleTags.map((tg) => {
                const active = current.has(tg);
                return (
                  <TouchableOpacity
                    key={tg}
                    onPress={() => {
                      const next = new Set(current);
                      if (active) next.delete(tg); else next.add(tg);
                      const nextList = Array.from(next);
                      setTagInput(nextList.join(nextList.length > 1 ? ", " : ","));
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      backgroundColor: active ? "#111" : "#EEF2FF",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: active ? "#111" : "#E0E7FF",
                    }}>
                      <Text style={{ color: active ? "#fff" : "#3730A3", fontSize: 12 }}>#{tg}</Text>
                    </View>
                  </TouchableOpacity>
                );
              });

              if (hiddenCount > 0 && !showAllTags) {
                chips.push(
                  <TouchableOpacity key="more" onPress={() => setShowAllTags(true)} activeOpacity={0.8}>
                    <View style={{
                      backgroundColor: "#F3F4F6",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}>
                      <Text style={{ color: "#374151", fontSize: 12 }}>{t("moreCount", { count: hiddenCount })}</Text>
                    </View>
                  </TouchableOpacity>,
                );
              } else if (showAllTags && tags.length > MAX_CHIPS) {
                chips.push(
                  <TouchableOpacity key="less" onPress={() => setShowAllTags(false)} activeOpacity={0.8}>
                    <View style={{
                      backgroundColor: "#F3F4F6",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}>
                      <Text style={{ color: "#374151", fontSize: 12 }}>{t("showLess")}</Text>
                    </View>
                  </TouchableOpacity>,
                );
              }

              return chips;
            })()}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 16, gap: 8 }}>
        <Button
          title={t("templates")}
          onPress={() => navigation.navigate("Templates")}
        />
        <Button
          title="Settings"
          onPress={() => navigation.navigate("Settings")}
        />
      </View>

      {/* Floating + button */}
      <TouchableOpacity
        onPress={async () => {
          try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          setTypePickerOpen(true);
        }}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          right: 16,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#111",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
        accessibilityRole="button"
        accessibilityLabel={t("add")}
      >
        <Text style={{ color: "#fff", fontSize: 28, lineHeight: 28 }}>＋</Text>
      </TouchableOpacity>

      {/* Recent activity */}
      {enabled ? (
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              {t("recentActivity")}
            </Text>
            <Button title={t("viewTasks")} onPress={() => setTab("today")} />
          </View>
          {activity.isLoading ? (
            <Text>{t("loading")}</Text>
          ) : (
            <View>
              {(activity.data || []).map((a) => {
                const isTaskCreate = a.action === "task.create";
                const isTaskComplete = a.action === "task.complete";
                const isInviteAccept = a.action === "invite.accept";
                const title = (a as any).payload?.title;
                const line = isTaskCreate
                  ? `${t("add")} · ${title || a.taskId || ""}`
                  : isTaskComplete
                    ? `${t("markComplete")} · ${title || a.taskId || ""}`
                    : isInviteAccept
                      ? t("inviteAccepted")
                      : `${a.action}`;
                const time = a.at ? dayjs(a.at).format("HH:mm") : "";
                return (
                  <Text key={a.id} style={{ color: "#555", marginBottom: 4 }}>
                    {time ? `${time} — ` : ""}
                    {line}
                  </Text>
                );
              })}
              {(activity.data || []).length === 0 ? (
                <Text style={{ color: "#999" }}>{t("nothingYet")}</Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      <Modal
        visible={selectorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectorOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0006",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              {t("selectHousehold")}
            </Text>
            {households.map((h) => (
              <TouchableOpacity
                key={h.id}
                onPress={async () => {
                  await selectHousehold(h.id);
                  setSelectorOpen(false);
                }}
              >
                <View style={{ paddingVertical: 10 }}>
                  <Text
                    style={{ fontWeight: h.id === householdId ? "700" : "400" }}
                  >
                    {h.name || h.id}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ marginTop: 12 }}>
              <Button
                title={t("close")}
                onPress={() => setSelectorOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Type picker modal */}
      <Modal
        visible={typePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={closeSheet}
        >
          <BlurView
            tint="dark"
            intensity={30}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Animated.View
            style={{
              transform: [{ translateY: sheetY.interpolate({ inputRange: [-200, 0, 300], outputRange: [-30, 0, 300] }) }],
              backgroundColor: "#fff",
              padding: 12,
              paddingBottom: 16,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
            {...pan.panHandlers}
          >
            <View style={{ alignItems: "center", paddingVertical: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#ddd" }} />
            </View>
            {(["chore", "event", "deadline", "checklist"] as const).map((tk) => {
              const iconName =
                tk === "chore"
                  ? "construct-outline"
                  : tk === "event"
                    ? "calendar-outline"
                    : tk === "deadline"
                      ? "time-outline"
                      : "list-outline";
              return (
                <TouchableOpacity
                  key={tk}
                  onPress={async () => {
                    try { await Haptics.selectionAsync(); } catch {}
                    setTypePickerOpen(false);
                    navigation.navigate("AddTask", { type: tk });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name={iconName as any} size={20} color="#333" />
                    <Text style={{ fontSize: 16 }}>{t(tk)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ marginTop: 8 }}>
              <Button title={t("cancel")} onPress={() => setTypePickerOpen(false)} />
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
