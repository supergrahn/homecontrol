import React from "react";
import { View, Text, Button, FlatList, TouchableOpacity, TextInput } from "react-native";
import { listChildren, type Child } from "../services/children";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/nb";
import "dayjs/locale/nn";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { fetchTasksInRange, addTaskSkipDate, setTaskPausedUntil, addTaskShiftDate } from "../services/tasks";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
// merged tasks service imports above

 dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function useDayjsLocale(t: any) {
  React.useEffect(() => {
    try {
      const current = (t as any)?.language || (t as any)?.i18n?.language;
      if (typeof current === "string") {
        const lang = current.toLowerCase();
        dayjs.locale(lang === "nb" || lang === "nn" ? "nb" : lang);
      }
    } catch {}
  }, [t]);
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  useDayjsLocale(t);
  const { householdId } = useHousehold();
  const navigation = useNavigation<any>();
  const [view, setView] = React.useState<"agenda" | "week" | "month" | "custom" | "timeline">("agenda");
  const [tz, setTz] = React.useState<string | null>(null);
  const [start, setStart] = React.useState<Date>(dayjs().startOf("day").toDate());
  const [agendaDays, setAgendaDays] = React.useState<number>(14);
  const [customStart, setCustomStart] = React.useState<Date | null>(null);
  const [customEnd, setCustomEnd] = React.useState<Date | null>(null);
  const [savingName, setSavingName] = React.useState("");
  const [savedRanges, setSavedRanges] = React.useState<{ name: string; start: string; end: string }[]>([]);
  const end = React.useMemo(() => {
    if (view === "week") return dayjs(start).add(6, "day").endOf("day").toDate();
    if (view === "month") return dayjs(start).endOf("month").toDate();
    if (view === "custom") return (customEnd ? dayjs(customEnd).endOf("day").toDate() : dayjs(start).endOf("day").toDate());
    return dayjs(start).add(Math.max(1, agendaDays) - 1, "day").endOf("day").toDate();
  }, [start, view, agendaDays, customEnd]);

  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tagFilter, setTagFilter] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [prioritySort, setPrioritySort] = React.useState<"none" | "high" | "low">("none");
  const [showAllTags, setShowAllTags] = React.useState(false);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [kidIds, setKidIds] = React.useState<string[]>([]);

  // Load household timezone
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setTz(null);
        const snap = await getDoc(doc(db, "households", householdId));
        const hz = (snap.exists() ? (snap.data() as any)?.timezone : null) as string | null;
        setTz(hz || null);
      } catch {
        setTz(null);
      }
    })();
  }, [householdId]);

  // Load saved ranges (per household)
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setSavedRanges([]);
        const raw = await AsyncStorage.getItem(`@hc:calendar:ranges:${householdId}`);
        setSavedRanges(raw ? JSON.parse(raw) : []);
      } catch {
        setSavedRanges([]);
      }
    })();
  }, [householdId]);

  // Load kids
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) { setKids([]); return; }
        setKids(await listChildren(householdId));
      } catch { setKids([]); }
    })();
  }, [householdId]);

  // Persist kid filter selection per household
  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) { setKidIds([]); return; }
        const raw = await AsyncStorage.getItem(`@hc:calendar:kidFilter:${householdId}`);
        setKidIds(raw ? JSON.parse(raw) : []);
      } catch { setKidIds([]); }
    })();
  }, [householdId]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return;
        await AsyncStorage.setItem(`@hc:calendar:kidFilter:${householdId}` as string, JSON.stringify(kidIds));
      } catch {}
    })();
  }, [householdId, kidIds]);

  const load = React.useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const data = await fetchTasksInRange(
        householdId,
        start,
        end,
        { priorityOrder: prioritySort === "high" ? "desc" : prioritySort === "low" ? "asc" : undefined } as any,
      );
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [householdId, start, end, prioritySort]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Debounce tag input -> tagFilter
  React.useEffect(() => {
    const h = setTimeout(() => setTagFilter(tagInput), 250);
    return () => clearTimeout(h);
  }, [tagInput]);

  const { displayData, kidCounts } = React.useMemo(() => {
    const raw = items.slice();
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
    // Per-kid counts from tag-filtered
    const map = new Map<string, number>();
    for (const t of tagFiltered as any[]) {
      const ids: string[] = Array.isArray((t as any).childIds) ? (t as any).childIds : [];
      for (const id of ids) map.set(id, (map.get(id) || 0) + 1);
    }
    // Apply kid filter
    const filtered = kidIds.length
      ? tagFiltered.filter((t: any) => {
          const ids: string[] = Array.isArray((t as any).childIds) ? (t as any).childIds : [];
          return ids.some((id) => kidIds.includes(id));
        })
      : tagFiltered;
    if (prioritySort !== "none") {
      filtered.sort((a: any, b: any) => {
        const pa = typeof a.priority === "number" ? a.priority : 0;
        const pb = typeof b.priority === "number" ? b.priority : 0;
        return prioritySort === "high" ? pb - pa : pa - pb;
      });
    }
    // Hide occurrences if pausedUntil or skipDates match current day
    const filtered2 = filtered.filter((task: any) => {
      const pausedUntil: Date | null = (task as any).pausedUntil || null;
      if (pausedUntil) {
        const p = tz ? dayjs(pausedUntil).tz(tz) : dayjs(pausedUntil);
        const s = tz ? dayjs(start).tz(tz) : dayjs(start);
        if (s.isBefore(p, "day")) return false;
      }
      // skipDates apply per-day filtering in grouped render below as well; keep here for Agenda day
      return true;
    });
    return { displayData: filtered2, kidCounts: map } as { displayData: any[]; kidCounts: Map<string, number> };
  }, [items, tagFilter, prioritySort, tz, start, kidIds]);

  const grouped = React.useMemo(() => {
    const byDay: Record<string, any[]> = {};
    for (const it of displayData) {
      const eff: Date | null = (it as any).nextOccurrenceAt || (it as any).dueAt || null;
      const key = eff ? (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("YYYY-MM-DD") : "unknown";
      byDay[key] = byDay[key] || [];
      byDay[key].push(it);
    }
    const keys = Object.keys(byDay).sort();
    return keys.map((k) => ({ date: k, items: byDay[k] }));
  }, [displayData, tz]);

  const fmt = (d: Date) => (tz ? dayjs(d).tz(tz) : dayjs(d));
  const rangeLabel = `${fmt(start).format("LL")} — ${fmt(end).format("LL")}`;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title={(t("agenda") as string) || "Agenda"} onPress={() => setView("agenda")} />
          <Button title={(t("week") as string) || "Week"} onPress={() => setView("week")} />
          <Button title={(t("month") as string) || "Month"} onPress={() => setView("month")} />
          <Button title={(t("custom") as string) || "Custom"} onPress={() => setView("custom")} />
          <Button title={(t("timeline") as string) || "Timeline"} onPress={() => setView("timeline")} />
          <View style={{ flex: 1 }} />
          <Button title={(t("refresh") as string) || "Refresh"} onPress={load} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Button
            title="◀"
            onPress={() => {
              if (view === "month") setStart(dayjs(start).add(-1, "month").startOf("month").toDate());
              else if (view === "week") setStart(dayjs(start).add(-7, "day").startOf("day").toDate());
              else setStart(dayjs(start).add(-Math.max(1, agendaDays), "day").startOf("day").toDate());
            }}
          />
          <Text style={{ fontWeight: "600" }}>{rangeLabel}</Text>
          <Button
            title="▶"
            onPress={() => {
              if (view === "month") setStart(dayjs(start).add(1, "month").startOf("month").toDate());
              else if (view === "week") setStart(dayjs(start).add(7, "day").startOf("day").toDate());
              else setStart(dayjs(start).add(Math.max(1, agendaDays), "day").startOf("day").toDate());
            }}
          />
        </View>
      </View>
      {/* Filters (tags + priority) */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontWeight: "600", marginBottom: 6 }}>{(t("filters") as string) || "Filters"}</Text>
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
            color={prioritySort === "high" ? "#111" : undefined}
          />
          <Button
            title={(t("sortByPriorityLowFirst") as string) || "Low priority first"}
            onPress={() => setPrioritySort("low")}
            color={prioritySort === "low" ? "#111" : undefined}
          />
          <Button
            title={(t("clearFilters") as string) || "Clear"}
            onPress={() => {
              setTagFilter("");
              setTagInput("");
              setPrioritySort("none");
              setShowAllTags(false);
            }}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {(() => {
            const tagSet = new Set<string>();
            for (const task of (displayData as any[])) {
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
            const chips: React.ReactNode[] = visibleTags.map((tg) => {
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
      {view === "agenda" ? (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.date}
          renderItem={({ item: group }) => (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                {(tz ? dayjs(group.date).tz(tz) : dayjs(group.date)).format("LL")}
              </Text>
              {group.items
                .filter((it: any) => {
                  const key = (tz ? dayjs((it.nextOccurrenceAt || it.dueAt) as Date).tz(tz) : dayjs((it.nextOccurrenceAt || it.dueAt) as Date)).format("YYYY-MM-DD");
                  const skips: string[] = Array.isArray((it as any).skipDates) ? (it as any).skipDates : [];
                  return !skips.includes(key);
                })
                .map((it) => (
                <TouchableOpacity key={it.id} activeOpacity={0.7} onPress={() => navigation.navigate("TaskDetail", { id: it.id })}>
                  <View style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                    <Text style={{ fontWeight: "500" }}>{it.title || it.id}</Text>
                    <Text style={{ color: "#666" }}>
                      {(() => {
                        const eff: Date | null = it.nextOccurrenceAt || it.dueAt || null;
                        return eff ? (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("LT") : "";
                      })()}
                    </Text>
                    {/* Exceptions quick actions */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Button title={(t("skipToday") as string) || "Skip today"} onPress={async () => {
                        try {
                          const eff: Date | null = (it as any).nextOccurrenceAt || (it as any).dueAt || null;
                          if (!eff || !householdId) return;
                          const key = (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("YYYY-MM-DD");
                          await addTaskSkipDate(householdId, it.id, key);
                          load();
                        } catch {}
                      }} />
                      <Button title={(t("shift30") as string) || "+30m"} onPress={async () => { 
                        try {
                          if (!householdId) return;
                          const eff: Date | null = (it as any).nextOccurrenceAt || (it as any).dueAt || null;
                          if (!eff) return;
                          const key = (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("YYYY-MM-DD");
                          await addTaskShiftDate(householdId, it.id, key, 30);
                          load();
                        } catch {}
                      }} />
                      <Button title={(t("pause7") as string) || "Pause 7d"} onPress={async () => { if (!householdId) return; await setTaskPausedUntil(householdId, it.id, dayjs().add(7, "day").toDate()); load(); }} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (view === "agenda") setAgendaDays((d) => d + 14);
          }}
          ListEmptyComponent={<Text>{loading ? ((t("loading") as string) || "Loading…") : ((t("noTasks") as string) || "No tasks")}</Text>}
        />
      ) : view === "week" ? (
        <WeekView start={start} setStart={setStart} items={displayData} t={t} tz={tz} onDayPress={(d) => { setView("agenda"); setStart(dayjs(d).startOf("day").toDate()); setAgendaDays(1); }} />
      ) : view === "month" ? (
        <MonthView anchor={start} setAnchor={setStart} items={displayData} tz={tz} t={t} onDayPress={(d) => { setView("agenda"); setStart(dayjs(d).startOf("day").toDate()); setAgendaDays(1); }} />
      ) : view === "custom" ? (
        <CustomRangeView tz={tz} t={t} householdId={householdId} anchor={start} setAnchor={setStart} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} savedRanges={savedRanges} setSavedRanges={setSavedRanges} savingName={savingName} setSavingName={setSavingName} onApply={() => { if (customStart) setStart(dayjs(customStart).startOf("day").toDate()); }} />
      ) : (
        <TimelineView tz={tz} t={t} date={start} setDate={setStart} items={displayData} />
      )}
    </View>
  );
}

function WeekView({ start, setStart, items, t, tz, onDayPress }: { start: Date; setStart: (d: Date) => void; items: any[]; t: any; tz: string | null; onDayPress: (d: Date) => void }) {
  const begin = dayjs(start).startOf("week");
  const days = new Array(7).fill(0).map((_, i) => begin.add(i, "day"));
  const buckets: Record<string, any[]> = {};
  for (const it of items) {
    const eff: Date | null = it.nextOccurrenceAt || it.dueAt || null;
    if (!eff) continue;
    const key = (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("YYYY-MM-DD");
    buckets[key] = buckets[key] || [];
    buckets[key].push(it);
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Button title="◀" onPress={() => setStart(dayjs(begin).add(-7, "day").toDate())} />
        <Text style={{ fontWeight: "700" }}>{begin.format("LL")} — {begin.add(6, "day").format("LL")}</Text>
        <Button title="▶" onPress={() => setStart(dayjs(begin).add(7, "day").toDate())} />
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const list = buckets[key] || [];
          return (
            <TouchableOpacity key={key} onPress={() => onDayPress(d.toDate())} style={{ flex: 1 }}>
              <View style={{ flex: 1, padding: 6, borderWidth: 1, borderColor: "#eee", borderRadius: 8 }}>
                <Text style={{ fontWeight: "600", marginBottom: 6 }}>{d.format("ddd D")}</Text>
                {list.slice(0, 5).map((it: any) => (
                  <Text key={it.id} numberOfLines={1} style={{ fontSize: 12, color: "#333" }}>• {it.title || it.id}</Text>
                ))}
                {list.length > 5 ? (
                  <Text style={{ fontSize: 12, color: "#666" }}>+{list.length - 5}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MonthView({ anchor, setAnchor, items, tz, t, onDayPress }: { anchor: Date; setAnchor: (d: Date) => void; items: any[]; tz: string | null; t: any; onDayPress: (d: Date) => void }) {
  const mStart = dayjs(anchor).startOf("month");
  const firstGridDay = mStart.startOf("week");
  const weeks = 6;
  const days: dayjs.Dayjs[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      days.push(firstGridDay.add(w * 7 + d, "day"));
    }
  }
  const buckets: Record<string, any[]> = {};
  for (const it of items) {
    const eff: Date | null = it.nextOccurrenceAt || it.dueAt || null;
    if (!eff) continue;
    const key = (tz ? dayjs(eff).tz(tz) : dayjs(eff)).format("YYYY-MM-DD");
    buckets[key] = buckets[key] || [];
    buckets[key].push(it);
  }
  const monthKey = mStart.format("YYYY-MM");
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Button title="◀" onPress={() => setAnchor(mStart.add(-1, "month").toDate())} />
        <Text style={{ fontWeight: "700" }}>{mStart.format("MMMM YYYY")}</Text>
        <Button title="▶" onPress={() => setAnchor(mStart.add(1, "month").toDate())} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const inMonth = d.format("YYYY-MM") === monthKey;
          const list = buckets[key] || [];
          return (
            <TouchableOpacity key={key} onPress={() => onDayPress(d.toDate())} style={{ width: `${100 / 7}%` }}>
              <View style={{ padding: 6, borderWidth: 1, borderColor: "#eee", backgroundColor: inMonth ? "#fff" : "#fafafa" }}>
                <Text style={{ fontWeight: "600", color: inMonth ? "#111" : "#999" }}>{d.format("D")}</Text>
                {list.slice(0, 3).map((it: any) => (
                  <Text key={it.id} numberOfLines={1} style={{ fontSize: 11, color: "#333" }}>• {it.title || it.id}</Text>
                ))}
                {list.length > 3 ? (
                  <Text style={{ fontSize: 11, color: "#666" }}>+{list.length - 3}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CustomRangeView({ tz, t, householdId, anchor, setAnchor, customStart, setCustomStart, customEnd, setCustomEnd, savedRanges, setSavedRanges, savingName, setSavingName, onApply }: any) {
  const a = dayjs(anchor);
  const first = a.startOf("month");
  const firstGrid = first.startOf("week");
  const days: dayjs.Dayjs[] = [];
  for (let i = 0; i < 42; i++) days.push(firstGrid.add(i, "day"));
  const isSel = (d: dayjs.Dayjs) => {
    if (!customStart) return false;
    const s = dayjs(customStart).format("YYYY-MM-DD");
    const k = d.format("YYYY-MM-DD");
    if (!customEnd) return k === s;
    const e = dayjs(customEnd).format("YYYY-MM-DD");
    return k >= s && k <= e;
  };
  const pick = (d: dayjs.Dayjs) => {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(d.startOf("day").toDate());
      setCustomEnd(null);
    } else {
      const s = dayjs(customStart);
      if (d.isBefore(s)) {
        setCustomEnd(s.toDate());
        setCustomStart(d.startOf("day").toDate());
      } else {
        setCustomEnd(d.endOf("day").toDate());
      }
    }
  };
  const save = async () => {
    try {
      if (!savingName || !customStart || !customEnd) return;
      const entry = { name: savingName, start: dayjs(customStart).format("YYYY-MM-DD"), end: dayjs(customEnd).format("YYYY-MM-DD") };
      const next = [...savedRanges.filter((r: any) => r.name !== savingName), entry];
      setSavedRanges(next);
      const keyHid = householdId || "default";
      await AsyncStorage.setItem(`@hc:calendar:ranges:${keyHid}` as string, JSON.stringify(next));
      setSavingName("");
    } catch {}
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Button title="◀" onPress={() => setAnchor(a.add(-1, "month").toDate())} />
        <Text style={{ fontWeight: "700" }}>{a.format("MMMM YYYY")}</Text>
        <Button title="▶" onPress={() => setAnchor(a.add(1, "month").toDate())} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const active = isSel(d);
          return (
            <TouchableOpacity key={key} onPress={() => pick(d)} style={{ width: `${100 / 7}%` }}>
              <View style={{ padding: 8, borderWidth: 1, borderColor: active ? "#111" : "#eee", backgroundColor: active ? "#EEF2FF" : "#fff" }}>
                <Text style={{ fontWeight: "600", color: "#111" }}>{d.format("D")}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={{ marginBottom: 6 }}>{((t("from") as string) || "From") + ": "}{customStart ? dayjs(customStart).format("LL") : "—"}</Text>
        <Text style={{ marginBottom: 6 }}>{((t("to") as string) || "To") + ": "}{customEnd ? dayjs(customEnd).format("LL") : "—"}</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput placeholder={(t("name") as string) || "Name"} value={savingName} onChangeText={setSavingName} style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }} />
          <Button title={(t("saveRange") as string) || "Save range"} onPress={save} />
          <Button title={(t("apply") as string) || "Apply"} onPress={onApply} />
          <Button title={(t("clearRange") as string) || "Clear"} onPress={() => { setCustomStart(null); setCustomEnd(null); }} />
        </View>
        {savedRanges.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {savedRanges.map((r: any) => (
              <TouchableOpacity key={r.name} onPress={() => { setCustomStart(dayjs(r.start).toDate()); setCustomEnd(dayjs(r.end).toDate()); }}>
                <View style={{ backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#E5E7EB" }}>
                  <Text style={{ fontSize: 12, color: "#374151" }}>{r.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function TimelineView({ tz, t, date, setDate, items }: any) {
  const d0 = dayjs(date).startOf("day");
  const dayKey = d0.format("YYYY-MM-DD");
  type Interval = { start: dayjs.Dayjs; end: dayjs.Dayjs };
  const intervals: Interval[] = [];
  for (const it of items) {
    const startAt = (it as any).startAt ? dayjs((it as any).startAt) : null;
    const dueAt = (it as any).dueAt ? dayjs((it as any).dueAt) : null;
    const nextAt = (it as any).nextOccurrenceAt ? dayjs((it as any).nextOccurrenceAt) : null;
    if (startAt && startAt.format("YYYY-MM-DD") === dayKey && dueAt) {
      intervals.push({ start: startAt, end: dueAt });
    } else if (dueAt && dueAt.format("YYYY-MM-DD") === dayKey) {
      intervals.push({ start: dueAt.add(-30, "minute"), end: dueAt });
    } else if (nextAt && nextAt.format("YYYY-MM-DD") === dayKey) {
      intervals.push({ start: nextAt, end: nextAt.add(30, "minute") });
    }
  }
  intervals.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  const merged: Interval[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (!last || iv.start.isAfter(last.end)) merged.push({ ...iv });
    else if (iv.end.isAfter(last.end)) last.end = iv.end;
  }
  const dayStart = d0.hour(6);
  const dayEnd = d0.hour(22);
  const free: Interval[] = [];
  let cursor = dayStart;
  for (const iv of merged) {
    if (iv.start.isAfter(cursor)) free.push({ start: cursor, end: iv.start });
    if (iv.end.isAfter(cursor)) cursor = iv.end;
  }
  if (cursor.isBefore(dayEnd)) free.push({ start: cursor, end: dayEnd });
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Button title="◀" onPress={() => setDate(dayjs(date).add(-1, "day").toDate())} />
        <Text style={{ fontWeight: "700" }}>{d0.format("LL")}</Text>
        <Button title="▶" onPress={() => setDate(dayjs(date).add(1, "day").toDate())} />
      </View>
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>{(t("freeSlots") as string) || "Free slots"}</Text>
      {free.length === 0 ? (
        <Text>{(t("noFreeSlots") as string) || "No free slots between 06:00–22:00"}</Text>
      ) : (
        <View>
          {free.map((iv, idx) => (
            <Text key={idx} style={{ paddingVertical: 4 }}>• {iv.start.format("LT")} — {iv.end.format("LT")}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
