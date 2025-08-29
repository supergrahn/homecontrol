import React from "react";
import { View, Text, FlatList, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import EmptyState from "../components/EmptyState";
import { useTheme } from "../design/theme";
import ScreenContainer from "../components/ScreenContainer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import * as Haptics from "expo-haptics";
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
import { appEvents } from "../events";
// import { navRef } from "../firebase/providers/NavigationProvider";
// import { createHousehold } from '../services/households';
import Input from "../components/Input";
import Button from "../components/Button";

// Household id from context

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"today" | "overdue" | "upcoming">(
    "today"
  );
  const { householdId, households, loading } = useHousehold();
  const [tagFilter, setTagFilter] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [prioritySort, setPrioritySort] = React.useState<
    "none" | "high" | "low"
  >("none");
  const [showAllTags, setShowAllTags] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showQuick, setShowQuick] = React.useState(false);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [kidIds, setKidIds] = React.useState<string[]>([]);
  // const [selectorOpen, setSelectorOpen] = React.useState(false);
  // Removed local type picker; global FAB handles quick actions

  // (was: animate local type picker sheet)
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    const sub = appEvents.addListener("show-overdue", () => setTab("overdue"));
    const qa = appEvents.addListener("quickactions:toggle", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowQuick((v) => !v);
    });
    return () => {
      sub.remove();
      qa.remove();
    };
  }, []);

  // Enable smooth expand/collapse animations for filters
  React.useEffect(() => {
    if (Platform.OS === "android" && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const enabled = !!householdId;
  const today = useQuery({
    queryKey: ["today", householdId],
    queryFn: () =>
      fetchTodayTasks(householdId!, {
        priorityOrder:
          prioritySort === "high"
            ? "desc"
            : prioritySort === "low"
              ? "asc"
              : undefined,
      } as any),
    enabled,
  });
  const overdue = useQuery({
    queryKey: ["overdue", householdId],
    queryFn: () =>
      fetchOverdueTasks(householdId!, {
        priorityOrder:
          prioritySort === "high"
            ? "desc"
            : prioritySort === "low"
              ? "asc"
              : undefined,
      } as any),
    enabled,
  });
  const upcoming = useQuery({
    queryKey: ["upcoming", householdId],
    queryFn: () =>
      fetchUpcomingTasks(householdId!, {
        priorityOrder:
          prioritySort === "high"
            ? "desc"
            : prioritySort === "low"
              ? "asc"
              : undefined,
      } as any),
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
        const raw = await AsyncStorage.getItem(
          `@hc:filters:${householdId}:${tab}`
        );
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.tagFilter === "string") {
            setTagFilter(parsed.tagFilter);
            setTagInput(parsed.tagFilter);
          }
          if (["none", "high", "low"].includes(parsed?.prioritySort))
            setPrioritySort(parsed.prioritySort);
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
          JSON.stringify({ tagFilter, prioritySort, kidIds })
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
        if (!householdId) {
          setKids([]);
          return;
        }
        const list = await listChildren(householdId);
        setKids(list);
      } catch {
        setKids([]);
      }
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
      const ids: string[] = Array.isArray((t as any).childIds)
        ? (t as any).childIds
        : [];
      for (const id of ids) map.set(id, (map.get(id) || 0) + 1);
    }
    // Apply kid filter
    const byKids = kidIds.length
      ? tagFiltered.filter((t: any) => {
          const ids: string[] = Array.isArray((t as any).childIds)
            ? (t as any).childIds
            : [];
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
    return { displayData: byKids, kidCounts: map } as {
      displayData: any[];
      kidCounts: Map<string, number>;
    };
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
    <ScreenContainer style={{ paddingTop: 8 }}>
      {/* Top action row removed per design: household selector, add, activity, settings */}

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

      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", flexShrink: 1 }}>
          {["today", "overdue", "upcoming"].map((key) => (
            <TouchableOpacity key={key as any} onPress={() => setTab(key as any)} activeOpacity={0.8}>
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: (tab === (key as any)) ? theme.colors.primary : theme.colors.card,
                }}
              >
                <Text style={{ color: (tab === (key as any)) ? theme.colors.onPrimary : theme.colors.text }}>
                  {t(key as any)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {/* Filter toggle */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowFilters((v) => !v);
          }}
          accessibilityLabel={t("filters") || "Filters"}
          accessibilityRole="button"
          style={{ padding: 8, marginLeft: 4 }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="funnel-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        {/* Quick action (same as floating +), now styled with circular primary background */}
        <TouchableOpacity
          onPress={() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowQuick((v) => !v);
          }}
          accessibilityLabel={t("add") || "Add"}
          accessibilityRole="button"
          style={{ padding: 4, marginLeft: 4 }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Daily summary card */}
  {enabled ? (
        <View
          style={{
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "600", marginBottom: 4, color: theme.colors.text }}>
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
                variant="outline"
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
                <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
                  {[(digest.data as any).samples.todayTitles, (digest.data as any).samples.overdueTitles]
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
            <Text style={{ color: theme.colors.muted }}>{t("noSummaryYet")}</Text>
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
          ListEmptyComponent={
            <EmptyState
              title={t("noTasks") || "No tasks"}
              subtitle={
                tab === "today"
                  ? (t("noTasksTodayTryAdd") as string) || "All clear today. Tap + to add a task."
                  : tab === "overdue"
                    ? (t("noOverdueGreatJob") as string) || "Nothing overdue. Great job!"
                    : (t("noUpcoming") as string) || "No upcoming tasks."
              }
            />
          }
        />
      )}

      {/* Filters */}
  {enabled && showFilters ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6, color: theme.colors.text }}>
            {t("filters") || "Filters"}
          </Text>
          {/* Kid chips */}
          {kids.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {kids.map((k) => {
                const active = kidIds.includes(k.id);
                const count = kidCounts.get(k.id) || 0;
                return (
                  <TouchableOpacity
                    key={k.id}
                    onPress={() => {
                      const next = active
                        ? kidIds.filter((x) => x !== k.id)
                        : [...kidIds, k.id];
                      setKidIds(next);
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 6,
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? theme.colors.text : theme.colors.border,
                        backgroundColor: active ? theme.colors.card : theme.colors.background,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{k.emoji || "🙂"}</Text>
                      <Text style={{ fontSize: 12 }}>{k.displayName}</Text>
                      {count > 0 ? (
                        <View style={{ marginLeft: 4, backgroundColor: theme.colors.text, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: theme.colors.onEmphasis, fontSize: 10 }}>{count}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Input
              placeholder={(t("tagsFilter") as string) || "Filter by tags (comma-separated)"}
              value={tagInput}
              onChangeText={setTagInput}
              autoCapitalize="none"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button
              title={(t("sortByPriorityHighFirst") as string) || "High priority first"}
              onPress={() => setPrioritySort("high")}
              variant={prioritySort === "high" ? "primary" : "outline"}
            />
            <Button
              title={(t("sortByPriorityLowFirst") as string) || "Low priority first"}
              onPress={() => setPrioritySort("low")}
              variant={prioritySort === "low" ? "primary" : "outline"}
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
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
            }}
          >
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
                  .filter(Boolean)
              );
              const tags = Array.from(tagSet).sort((a, b) =>
                a.localeCompare(b)
              );
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
                      if (active) next.delete(tg);
                      else next.add(tg);
                      const nextList = Array.from(next);
                      setTagInput(
                        nextList.join(nextList.length > 1 ? ", " : ",")
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        backgroundColor: active ? theme.colors.primary : theme.colors.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border }}>
                      <Text style={{ color: active ? "#fff" : theme.colors.text, fontSize: 12 }}>#{tg}</Text>
                    </View>
                  </TouchableOpacity>
                );
              });

              if (hiddenCount > 0 && !showAllTags) {
                chips.push(
                  <TouchableOpacity
                    key="more"
                    onPress={() => setShowAllTags(true)}
                    activeOpacity={0.8}
                  >
                    <View style={{ backgroundColor: theme.colors.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ color: theme.colors.text, fontSize: 12 }}>{t("moreCount", { count: hiddenCount })}</Text>
                    </View>
                  </TouchableOpacity>
                );
              } else if (showAllTags && tags.length > MAX_CHIPS) {
                chips.push(
                  <TouchableOpacity
                    key="less"
                    onPress={() => setShowAllTags(false)}
                    activeOpacity={0.8}
                  >
                    <View style={{ backgroundColor: theme.colors.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ color: theme.colors.text, fontSize: 12 }}>{t("showLess")}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return chips;
            })()}
          </View>
        </View>
      ) : null}

      {/* Quick Actions dropdown */}
      {enabled && showQuick ? (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 6, color: theme.colors.text }}>
            {t("quickActions") || "Quick actions"}
          </Text>
          {(() => {
            const role = households.find((h) => h.id === householdId)?.role;
            const Item = ({ label, onPress }: { label: string; onPress: () => void }) => (
              <TouchableOpacity onPress={onPress} style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 16, color: theme.colors.text }}>{label}</Text>
              </TouchableOpacity>
            );
            return (
              <View>
                <Item label={(t("newTask") as string) || "New Task"} onPress={() => navigation.navigate("AddTask")} />
                <Item label={(t("newEvent") as string) || "New event"} onPress={() => navigation.navigate("AddTask", { preset: "event" })} />
                <Item label={(t("newBirthday") as string) || "New birthday"} onPress={() => navigation.navigate("AddTask", { preset: "birthday" })} />
                {role === "admin" ? (
                  <Item label={(t("showHouseholdQr") as string) || "Show Household QR"} onPress={() => navigation.navigate("ShowHouseholdQR")} />
                ) : null}
                <Item label={(t("scanHouseholdQr") as string) || "Scan Household QR"} onPress={() => navigation.navigate("ScanInvite")} />
              </View>
            );
          })()}
        </View>
      ) : null}

  {/* Bottom Templates/Settings buttons removed per design */}

  {/* Floating + button removed; global FAB provided by Navigation */}

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
            <Text style={{ ...theme.typography.subtitle, color: theme.colors.onSurface, marginBottom: 8 }}>
              {t("recentActivity")}
            </Text>
            <Button title={t("viewTasks")} onPress={() => setTab("today")} variant="link" />
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
                  <Text key={a.id} style={{ color: theme.colors.text, opacity: 0.8, marginBottom: 4 }}>
                    {time ? `${time} — ` : ""}
                    {line}
                  </Text>
                );
              })}
              {(activity.data || []).length === 0 ? (
                <Text style={{ color: theme.colors.muted }}>{t("nothingYet")}</Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

  {/* Household selector modal removed */}

  {/* Type picker modal removed */}
    </ScreenContainer>
  );
}
