import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from "react-native";
import EmptyState from "../components/EmptyState";
import { useTheme } from "../design/theme";
import ScreenContainer from "../components/ScreenContainer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ListSkeleton, TextSkeleton, SchoolScheduleSkeleton } from "../components/SkeletonLoader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TaskCard from "../components/TaskCard";
import { fetchTasksInRange } from "../services/tasks";
import { listChildren, type Child } from "../services/children";
// import { fetchRecentActivity } from "../services/activity";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { fetchLatestDigest } from "../services/digest";
import dayjs from "dayjs";
import { appEvents } from "../events";
// import { navRef } from "../firebase/providers/NavigationProvider";
// import { createHousehold } from '../services/households';
import Input from "../components/Input";
import Button from "../components/Button";
import Tabs from "../components/Tabs";
import Card from "../components/Card";
import { API_BASE } from "../config";
import {
  loadKidDayWeek,
  saveKidDayWeekLocal,
  type KidDayInfo,
  type KidWeekInfo,
} from "../services/kidInfo";

// Household id from context

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"today" | "week">("today");
  const [summaryOpen, setSummaryOpen] = React.useState<boolean>(false);
  const { householdId, households, loading } = useHousehold();
  const [tagFilter, setTagFilter] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [prioritySort, setPrioritySort] = React.useState<
    "none" | "high" | "low"
  >("none");
  const [showAllTags, setShowAllTags] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showQuick, setShowQuick] = React.useState(false);
  const [quickVisible, setQuickVisible] = React.useState(false);
  const quickAnim = React.useRef(new Animated.Value(0)).current; // 0=hidden,1=shown
  const [headerBottom, setHeaderBottom] = React.useState<number>(0);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [kidIds, setKidIds] = React.useState<string[]>([]);
  // const [selectorOpen, setSelectorOpen] = React.useState(false);
  // Removed local type picker; global FAB handles quick actions

  // (was: animate local type picker sheet)
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    const sub = appEvents.addListener("show-overdue", () => setTab("today"));
    const qa = appEvents.addListener("quickactions:toggle", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowQuick((v) => !v);
    });
    const kc = appEvents.addListener("kids:changed", (e: any) => {
      if (!e || e.hid !== householdId) return;
      // Clear cached highlights to force reload below
      setSchoolHighlights(null);
    });
    return () => {
      sub.remove();
      qa.remove();
      kc.remove();
    };
  }, []);

  // Animate quick actions dropdown
  React.useEffect(() => {
    if (showQuick) {
      setQuickVisible(true);
      Animated.timing(quickAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (quickVisible) {
      Animated.timing(quickAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setQuickVisible(false);
      });
    }
  }, [showQuick]);

  // Enable smooth expand/collapse animations for filters
  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      (UIManager as any)?.setLayoutAnimationEnabledExperimental
    ) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const enabled = !!householdId;
  const today = useQuery({
    queryKey: ["today", householdId, prioritySort],
    queryFn: () => {
      const start = dayjs().startOf("day").toDate();
      const end = dayjs().endOf("day").toDate();
      return fetchTasksInRange(householdId!, start, end, {
        priorityOrder:
          prioritySort === "high"
            ? "desc"
            : prioritySort === "low"
              ? "asc"
              : undefined,
      } as any);
    },
    enabled,
  });
  const week = useQuery({
    queryKey: ["week", householdId, prioritySort],
    queryFn: () => {
      const start = dayjs().startOf("day").toDate();
      const end = dayjs().add(7, "day").endOf("day").toDate();
      return fetchTasksInRange(householdId!, start, end, {
        priorityOrder:
          prioritySort === "high"
            ? "desc"
            : prioritySort === "low"
              ? "asc"
              : undefined,
      } as any);
    },
    enabled,
  });
  const digest = useQuery({
    queryKey: ["digest", householdId],
    queryFn: () => fetchLatestDigest(householdId!),
    enabled,
  });

  // No auto-tab switching with new filters

  const list = tab === "today" ? today : week;
  // Recent activity removed from HomeScreen

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
    let active = true;
    const loadKids = async () => {
      try {
        if (!householdId) {
          if (active) setKids([]);
          return;
        }
        const list = await listChildren(householdId);
        if (active) setKids(list);
      } catch {
        if (active) setKids([]);
      }
    };
    loadKids();
    const sub = appEvents.addListener("kids:changed", (e: any) => {
      if (!e || e.hid !== householdId) return;
      loadKids();
    });
    return () => {
      active = false;
      sub.remove();
    };
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
        qc.invalidateQueries({ queryKey: ["week", householdId] }),
        qc.invalidateQueries({ queryKey: ["activity", householdId] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, qc, householdId]);

  // School highlights: anomalies and timetable
  const [schoolHighlights, setSchoolHighlights] = React.useState<{
    anomalies?: string[];
    schedule?: any[];
    documents?: any[];
  } | null>(null);
  const [loadingHighlights, setLoadingHighlights] = React.useState(false);
  const [kidDayInfo, setKidDayInfo] = React.useState<KidDayInfo | null>(null);
  const [kidWeekInfo, setKidWeekInfo] = React.useState<KidWeekInfo | null>(
    null
  );
  const [loadingKidInfo, setLoadingKidInfo] = React.useState(false);

  const currentKid = React.useMemo(() => {
    if (!kids.length) return null;
    return kidIds.length
      ? kids.find((k) => k.id === kidIds[0]) || kids[0]
      : kids[0];
  }, [kids, kidIds]);

  React.useEffect(() => {
    let cancelled = false;
    const loadHighlights = async () => {
      try {
        if (!enabled) return setSchoolHighlights(null);
        // Use current kid filter if any; otherwise first kid
        const kid = currentKid;
        if (!kid || !kid.school) {
          if (!cancelled) setSchoolHighlights(null);
          return;
        }
        setLoadingHighlights(true);
        const key = (() => {
          const s: any = kid.school;
          return (
            s?.url ||
            s?.website ||
            s?.id ||
            s?.name ||
            s?.title ||
            s?.displayName ||
            ""
          );
        })();
        if (!key) {
          if (!cancelled) setSchoolHighlights(null);
          return;
        }
        const res = await fetch(
          `${API_BASE.replace(/\/$/, "")}/summary/next-day?school=${encodeURIComponent(
            key
          )}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setSchoolHighlights(data);
      } catch (e) {
        if (!cancelled) setSchoolHighlights(null);
      } finally {
        if (!cancelled) setLoadingHighlights(false);
      }
    };
    loadHighlights();
    return () => {
      cancelled = true;
    };
  }, [enabled, kids, kidIds, currentKid]);

  // Load kid day/week info from local, fallback to Firestore on Home open and when kid selection changes
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!householdId) return;
        if (!currentKid) {
          if (!cancelled) {
            setKidDayInfo(null);
            setKidWeekInfo(null);
          }
          return;
        }
        setLoadingKidInfo(true);
        const res = await loadKidDayWeek(householdId, currentKid.id);
        if (!cancelled) {
          setKidDayInfo(res.day);
          setKidWeekInfo(res.week);
        }
        // Persist fresh values locally to seed future loads
        if ((res.day && res.day.date) || (res.week && res.week.weekStart)) {
          await saveKidDayWeekLocal(
            householdId,
            currentKid.id,
            res.day,
            res.week
          );
        }
      } finally {
        if (!cancelled) setLoadingKidInfo(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [householdId, currentKid]);

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

      {/* Kids filter row above the time filter */}
      {enabled && kids.length > 0 ? (
        <View style={{ marginBottom: 8 }}>
          <Tabs
            items={kids.map((k) => k.displayName)}
            value={(() => {
              const idx = kids.findIndex((k) => kidIds.includes(k.id));
              return idx < 0 ? 0 : idx;
            })()}
            onChange={(i) => {
              const id = kids[i]?.id;
              if (!id) return;
              const isActive = kidIds.includes(id);
              setKidIds(isActive ? [] : [id]);
            }}
            even
          />
        </View>
      ) : enabled ? (
        <View style={{ marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Kids")}
            accessibilityRole="button"
            accessibilityLabel={t("addChild") || "Add child"}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              {t("addChild") || "Add child"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          setHeaderBottom(y + height);
        }}
      >
        <Tabs
          items={[
            t("today") as string,
            (t("thisWeek") as string) || "This week",
          ]}
          value={["today", "week"].indexOf(tab)}
          onChange={(i) => setTab((i === 0 ? "today" : "week") as any)}
          style={{ flexShrink: 1 }}
        />
        <View style={{ flex: 1 }} />
        {/* Filter toggle */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
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
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
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

      {/* Daily summary card (collapsible) */}
      {enabled ? (
        <Card style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={async () => {
              const opening = !summaryOpen;
              setSummaryOpen(opening);
              if (opening) {
                // Refetch when opening
                await qc.invalidateQueries({
                  queryKey: ["digest", householdId],
                });
              }
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  marginBottom: 4,
                  color: theme.colors.text,
                }}
              >
                {t("dailySummary")}
              </Text>
              <Ionicons
                name={summaryOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.text}
              />
            </View>
          </TouchableOpacity>
          {summaryOpen ? (
            digest.isLoading ? (
              <TextSkeleton lines={2} />
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
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted }}>
                {t("noSummaryYet")}
              </Text>
            )
          ) : null}
        </Card>
      ) : null}

      {/* School highlights */}
      {enabled ? (
        <Card style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 4,
                color: theme.colors.text,
              }}
            >
              {t("schoolHighlights") || "School highlights"}
            </Text>
            {!!currentKid && (
              <Text style={{ color: theme.colors.muted }}>
                {currentKid.displayName}
                {currentKid.schoolGradeLabel
                  ? ` • ${t("grade") || "Grade"} ${currentKid.schoolGradeLabel}`
                  : ""}
              </Text>
            )}
          </View>
          {loadingHighlights ? (
            <SchoolScheduleSkeleton />
          ) : schoolHighlights ? (
            <View>
              {Array.isArray(schoolHighlights.anomalies) &&
                schoolHighlights.anomalies.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: "600" }}>
                      {t("anomalies") || "Anomalies"}
                    </Text>
                    <Text style={{ color: theme.colors.warning }}>
                      {schoolHighlights.anomalies.join(" • ")}
                    </Text>
                  </View>
                )}
              {Array.isArray(schoolHighlights.schedule) &&
                schoolHighlights.schedule.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: "600" }}>
                      {t("schedule") || "Schedule"}
                    </Text>
                    {schoolHighlights.schedule
                      .slice(0, 4)
                      .map((it: any, i: number) => (
                        <Text key={i} style={{ color: theme.colors.text }}>
                          {it.time ? `${it.time} – ` : ""}
                          {it.subject || it.title || it.summary}
                          {it.homework
                            ? ` (${t("homework") || "Homework"}: ${it.homework})`
                            : ""}
                        </Text>
                      ))}
                  </View>
                )}
              {Array.isArray(schoolHighlights.documents) &&
                schoolHighlights.documents.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontWeight: "600" }}>
                      {t("documents") || "Documents"}
                    </Text>
                    {schoolHighlights.documents
                      .slice(0, 3)
                      .map((d: any, i: number) => (
                        <Text key={i} style={{ color: theme.colors.primary }}>
                          {d.title || d.url}
                        </Text>
                      ))}
                  </View>
                )}
              {!schoolHighlights.anomalies?.length &&
                !schoolHighlights.schedule?.length &&
                !schoolHighlights.documents?.length && (
                  <Text style={{ color: theme.colors.muted }}>
                    {t("noSchoolHighlights") || "No school highlights yet."}
                  </Text>
                )}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted }}>
              {t("noSchoolHighlights") || "No school highlights yet."}
            </Text>
          )}
        </Card>
      ) : null}

      {/* Today / This Week (from local storage or Firestore) */}
      {enabled ? (
        <Card style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 4,
              color: theme.colors.text,
            }}
          >
            {t("kidOverview") || "Today / This Week"}
          </Text>
          {loadingKidInfo ? (
            <TextSkeleton lines={3} />
          ) : (
            <View>
              {/* Today */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: "600" }}>{t("today")}</Text>
                {kidDayInfo?.data ? (
                  <Text style={{ color: theme.colors.text }}>
                    {typeof kidDayInfo.data === "string"
                      ? kidDayInfo.data
                      : JSON.stringify(kidDayInfo.data)}
                  </Text>
                ) : (
                  <Text style={{ color: theme.colors.muted }}>
                    {t("noData") || "No data"}
                  </Text>
                )}
              </View>
              {/* This Week */}
              <View>
                <Text style={{ fontWeight: "600" }}>
                  {t("thisWeek") || "This week"}
                </Text>
                {kidWeekInfo?.data ? (
                  <Text style={{ color: theme.colors.text }}>
                    {typeof kidWeekInfo.data === "string"
                      ? kidWeekInfo.data
                      : JSON.stringify(kidWeekInfo.data)}
                  </Text>
                ) : (
                  <Text style={{ color: theme.colors.muted }}>
                    {t("noData") || "No data"}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card>
      ) : null}

      {enabled && list.isLoading ? (
        <ListSkeleton count={5} />
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
                qc.invalidateQueries({ queryKey: ["week", householdId] });
              }}
              showQuickAccept={tab === "today"}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={t("noTasks") || "No tasks"}
              subtitle={
                tab === "today"
                  ? (t("noTasksTodayTryAdd") as string) ||
                    "All clear today. Tap + to add a task."
                  : (t("noUpcoming") as string) || "No upcoming tasks."
              }
            />
          }
        />
      )}

      {/* Filters */}
      {enabled && showFilters ? (
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              fontWeight: "600",
              marginBottom: 6,
              color: theme.colors.text,
            }}
          >
            {t("filters") || "Filters"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Input
              placeholder={
                (t("tagsFilter") as string) ||
                "Filter by tags (comma-separated)"
              }
              value={tagInput}
              onChangeText={setTagInput}
              autoCapitalize="none"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button
              title={
                (t("sortByPriorityHighFirst") as string) ||
                "High priority first"
              }
              onPress={() => setPrioritySort("high")}
              variant={prioritySort === "high" ? "primary" : "outline"}
            />
            <Button
              title={
                (t("sortByPriorityLowFirst") as string) || "Low priority first"
              }
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
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.card,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: active
                          ? theme.colors.primary
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? "#fff" : theme.colors.text,
                          fontSize: 12,
                        }}
                      >
                        #{tg}
                      </Text>
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
                    <View
                      style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                        {t("moreCount", { count: hiddenCount })}
                      </Text>
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
                    <View
                      style={{
                        backgroundColor: theme.colors.card,
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                        {t("showLess")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return chips;
            })()}
          </View>
        </View>
      ) : null}

      {/* Quick Actions dropdown (absolute, under + button) */}
      {enabled && quickVisible ? (
        <Animated.View
          style={{
            position: "absolute",
            top: Math.max(headerBottom + 4, 0),
            right: 12,
            zIndex: 50,
            transform: [
              {
                translateY: quickAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
            opacity: quickAnim,
          }}
        >
          <Card>
            <Text
              style={{
                fontWeight: "600",
                marginBottom: 6,
                color: theme.colors.text,
              }}
            >
              {t("quickActions") || "Quick actions"}
            </Text>
            {(() => {
              const role = households.find((h) => h.id === householdId)?.role;
              const Item = ({
                label,
                onPress,
              }: {
                label: string;
                onPress: () => void;
              }) => (
                <TouchableOpacity
                  onPress={onPress}
                  style={{ paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 16, color: theme.colors.text }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
              return (
                <View>
                  <Item
                    label={(t("newTask") as string) || "New Task"}
                    onPress={() => navigation.navigate("AddTask")}
                  />
                  <Item
                    label={(t("newEvent") as string) || "New event"}
                    onPress={() =>
                      navigation.navigate("AddTask", { preset: "event" })
                    }
                  />
                  <Item
                    label={(t("newBirthday") as string) || "New birthday"}
                    onPress={() =>
                      navigation.navigate("AddTask", { preset: "birthday" })
                    }
                  />
                  {role === "admin" ? (
                    <Item
                      label={
                        (t("showHouseholdQr") as string) || "Show Household QR"
                      }
                      onPress={() => navigation.navigate("ShowHouseholdQR")}
                    />
                  ) : null}
                  <Item
                    label={
                      (t("scanHouseholdQr") as string) || "Scan Household QR"
                    }
                    onPress={() => navigation.navigate("ScanInvite")}
                  />
                </View>
              );
            })()}
          </Card>
        </Animated.View>
      ) : null}

      {/* Bottom Templates/Settings buttons removed per design */}

      {/* Floating + button removed; global FAB provided by Navigation */}

      {/* Recent activity removed */}

      {/* Household selector modal removed */}

      {/* Type picker modal removed */}
    </ScreenContainer>
  );
}
