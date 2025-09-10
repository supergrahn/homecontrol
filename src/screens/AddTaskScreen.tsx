import React from "react";
import { View, Text, TouchableOpacity, Switch, Alert , ScrollView } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";
import { useTranslation } from "react-i18next";
import { createTask } from "../services/tasks";
import { addChecklistItem } from "../services/checklist";
import { auth } from "../firebase";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useToast } from "../components/ToastProvider";
import { listTemplates } from "../services/templates";
import { listChildren, type Child } from "../services/children";
import Input from "../components/Input";
import Button from "../components/Button";
import dayjs from "dayjs";
import "dayjs/locale/nb";
import "dayjs/locale/nn";
import Select, { type Option } from "../components/Select";

export default function AddTaskScreen({ navigation, route }: any) {
  const { t, i18n } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const toast = useToast();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<
    "chore" | "event" | "deadline" | "checklist"
  >("chore");
  const [priority, setPriority] = React.useState<number | undefined>(undefined);
  const [tagsText, setTagsText] = React.useState<string>("");
  const inputRef = React.useRef<any>(null);
  // When section state
  const [dateText, setDateText] = React.useState<string>(""); // YYYY-MM-DD
  const [dayPart, setDayPart] = React.useState<string>("");
  const [monthPart, setMonthPart] = React.useState<string>("");
  const [yearPart, setYearPart] = React.useState<string>("");
  const [timeText, setTimeText] = React.useState<string>(""); // HH:mm
  const [allDay, setAllDay] = React.useState<boolean>(false);
  const [lastTemplate, setLastTemplate] = React.useState<{
    id: string;
    name: string;
    items: string[];
  } | null>(null);
  const [kids, setKids] = React.useState<Child[]>([]);
  const [childIds, setChildIds] = React.useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Set default date parts to today on mount
  React.useEffect(() => {
    const d = dayjs();
    updateDateFromParts(d.format("YYYY"), d.format("M"), d.format("D"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Match dayjs locale to current app language
    const lang = (i18n as any)?.language;
    if (lang) {
      dayjs.locale(
        lang === "nb" || lang === "nn" || lang === "no" ? "nb" : lang
      );
    }
  }, [i18n as any]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setLastTemplate(null);
        const list = await listTemplates(householdId);
        const withTs = list
          .map((t: any) => ({
            ...t,
            _ts: t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0,
          }))
          .sort((a, b) => b._ts - a._ts);
        setLastTemplate(withTs[0] || null);
      } catch {
        setLastTemplate(null);
      }
    })();
  }, [householdId]);

  // When enabling all-day, clear any time to avoid confusion
  React.useEffect(() => {
    if (allDay && timeText) setTimeText("");
  }, [allDay]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!householdId) return setKids([]);
        setKids(await listChildren(householdId));
      } catch {
        setKids([]);
      }
    })();
  }, [householdId]);

  React.useEffect(() => {
    // Support both direct type and preset shortcuts
    const initialType = route?.params?.type as
      | "chore"
      | "event"
      | "deadline"
      | "checklist"
      | undefined;
    const preset = route?.params?.preset as "event" | "birthday" | undefined;
    if (initialType) setType(initialType);
    else if (preset === "event") setType("event");
    else if (preset === "birthday") {
      setType("event");
      setAllDay(true);
      // Pre-tag as birthday to aid later filtering
      setTagsText((prev) => (prev ? prev : "birthday"));
    }
  }, [route?.params?.type, route?.params?.preset]);

  // Helpers for scheduling
  const parseDate = React.useCallback((s: string) => {
    const d = dayjs(s, ["YYYY-MM-DD", "YYYY/M/D"], true);
    return d.isValid() ? d : null;
  }, []);
  const parseTime = React.useCallback((s: string) => {
    const d = dayjs(s, ["HH:mm", "H:mm"], true);
    return d.isValid() ? d : null;
  }, []);
  const combineDateTime = React.useCallback(
    (dStr?: string, tStr?: string, allD?: boolean) => {
      const d = dStr ? parseDate(dStr) : null;
      if (!d) return null;
      if (allD) {
        return d.startOf("day").toDate();
      }
      const t = tStr ? parseTime(tStr) : null;
      if (!t) return d.hour(9).minute(0).second(0).millisecond(0).toDate();
      return d
        .hour(t.hour())
        .minute(t.minute())
        .second(0)
        .millisecond(0)
        .toDate();
    },
    [parseDate, parseTime]
  );

  // Helpers to manage date parts and derive dateText
  const pad2 = (s: string) => s.padStart(2, "0");
  const updateDateFromParts = React.useCallback(
    (y: string, m: string, d: string) => {
      setYearPart(y);
      setMonthPart(m);
      setDayPart(d);
      const allFilled = y.length === 4 && m.length >= 1 && d.length >= 1;
      if (!allFilled) {
        setDateText("");
        return;
      }
      const candidate = `${y}-${pad2(m)}-${pad2(d)}`;
      setDateText(candidate);
    },
    [parseDate]
  );

  // Inline validation state
  const isEvent = type === "event";
  const dateParsed = React.useMemo(
    () => (dateText ? parseDate(dateText) : null),
    [dateText, parseDate]
  );
  const timeParsed = React.useMemo(
    () => (timeText ? parseTime(timeText) : null),
    [timeText, parseTime]
  );
  const dateError = React.useMemo(() => {
    if (isEvent) {
      if (!dateText) return (t("dateRequiredForEvent") as string) || null;
    }
    if (dateText && !dateParsed)
      return (t("invalidDate") as string) || "Enter date as YYYY-MM-DD.";
    return null;
  }, [isEvent, dateText, dateParsed, t]);
  const timeError = React.useMemo(() => {
    if (allDay) return null;
    if (timeText && !timeParsed)
      return (t("invalidTime") as string) || "Enter time as HH:mm (00-23:59).";
    return null;
  }, [allDay, timeText, timeParsed, t]);
  const canSave = !!title.trim() && !!householdId && !dateError && !timeError;

  // Dynamic max days in month based on selected month/year
  const maxDaysInMonth = React.useMemo(() => {
    const y = parseInt(yearPart, 10);
    const m = parseInt(monthPart, 10);
    if (!Number.isFinite(y) || String(y).length !== 4) return 31;
    if (!Number.isFinite(m) || m < 1 || m > 12) return 31;
    const d = dayjs(
      `${y}-${String(m).padStart(2, "0")}-01`,
      "YYYY-MM-DD",
      true
    );
    return d.isValid() ? d.daysInMonth() : 31;
  }, [yearPart, monthPart]);

  const dayOptions = React.useMemo(() => {
    return [...Array(maxDaysInMonth)].map((_, i) => ({
      label: String(i + 1),
      value: String(i + 1),
    }));
  }, [maxDaysInMonth]);

  // Clamp day if it exceeds month/year days
  React.useEffect(() => {
    const d = parseInt(dayPart, 10);
    if (Number.isFinite(d) && d > maxDaysInMonth) {
      updateDateFromParts(yearPart, monthPart, String(maxDaysInMonth));
    }
  }, [maxDaysInMonth]);

  const nextBirthdayFrom = (month: number, day: number, from: dayjs.Dayjs) => {
    let year = from.year();
    const thisYear = dayjs(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
    if (thisYear.isBefore(from, "day")) year += 1;
    return dayjs(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    )
      .startOf("day")
      .toDate();
  };

  const save = async () => {
    if (!title.trim()) return;
    if (!householdId) return;
    // Guard on invalid input
    if (isEvent && (!dateText || !dateParsed)) return;
    if (!allDay && timeText && !timeParsed) return;
    // Compute schedule
    let dueAt: Date | null = null;
    let nextOccurrenceAt: Date | null = null;
    let rrule: string | null = null;
    const now = dayjs();

    if (type === "event") {
      if (!dateText) {
        return;
      }
      const at = combineDateTime(dateText, timeText, allDay);
      nextOccurrenceAt = at;
      // If this is a birthday tag, set yearly rrule and next occurrence
      if (tagsText.toLowerCase().includes("birthday")) {
        const dd = parseDate(dateText);
        if (dd) {
          rrule = `FREQ=YEARLY;BYMONTH=${dd.month() + 1};BYMONTHDAY=${dd.date()}`;
          nextOccurrenceAt = nextBirthdayFrom(dd.month() + 1, dd.date(), now);
        }
      }
    } else {
      // chore, deadline, checklist → use dueAt
      if (dateText) {
        dueAt = combineDateTime(dateText, timeText, allDay);
      } else {
        // Default to today end-of-day so it shows up in Today
        dueAt = now.endOf("day").toDate();
      }
    }

    const id = await createTask(householdId, {
      title: title.trim(),
      type,
      priority,
      childIds,
      context: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdBy: auth.currentUser?.uid || "unknown",
      dueAt: dueAt as any,
      nextOccurrenceAt: nextOccurrenceAt as any,
      rrule: rrule as any,
    });
    toast.show((t("taskCreated") as string) || "Task created", {
      type: "success",
    });
    navigation.goBack();
  };

  const saveAndAddAnother = async () => {
    if (!title.trim()) return;
    if (!householdId) return;
    if (isEvent && (!dateText || !dateParsed)) return;
    if (!allDay && timeText && !timeParsed) return;
    // Compute schedule similarly as save()
    let dueAt: Date | null = null;
    let nextOccurrenceAt: Date | null = null;
    let rrule: string | null = null;
    const now = dayjs();
    if (type === "event") {
      if (!dateText) {
        return;
      }
      const at = combineDateTime(dateText, timeText, allDay);
      nextOccurrenceAt = at;
      if (tagsText.toLowerCase().includes("birthday")) {
        const dd = parseDate(dateText);
        if (dd) {
          rrule = `FREQ=YEARLY;BYMONTH=${dd.month() + 1};BYMONTHDAY=${dd.date()}`;
          nextOccurrenceAt = nextBirthdayFrom(dd.month() + 1, dd.date(), now);
        }
      }
    } else {
      dueAt = dateText
        ? combineDateTime(dateText, timeText, allDay)
        : now.endOf("day").toDate();
    }

    await createTask(householdId, {
      title: title.trim(),
      type,
      priority,
      childIds,
      context: tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdBy: auth.currentUser?.uid || "unknown",
      dueAt: dueAt as any,
      nextOccurrenceAt: nextOccurrenceAt as any,
      rrule: rrule as any,
    });
    setTitle("");
    setPriority(undefined);
    setTagsText("");
    // Reset date to today instead of clearing
    const d = dayjs();
    updateDateFromParts(d.format("YYYY"), d.format("MM"), d.format("DD"));
    setTimeText("");
    setAllDay(false);
    toast.show((t("taskCreated") as string) || "Task created", {
      type: "success",
    });
    // re-focus for fast entry
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            ...theme.typography.h2,
            color: theme.colors.onSurface,
            marginBottom: 4,
          }}
        >
          {t("newTask")}
        </Text>
        <Input
          ref={(r) => {
            inputRef.current = r;
          }}
          placeholder={t("titleLabel")}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          testID="titleInput"
          containerStyle={{ marginTop: 4, marginBottom: 12 }}
        />
        <Text style={{ color: theme.colors.text }}>{t("type")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["chore", "event", "deadline", "checklist"] as const).map((tk) => (
            <Button
              key={tk}
              title={t(tk)}
              onPress={() => setType(tk)}
              variant={type === tk ? "primary" : "outline"}
            />
          ))}
        </View>
        {/* Helper hint under type */}
        <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 6 }}>
          {type === "event"
            ? (t("typeHintEvent") as string) ||
              "Events require a date and show on the calendar."
            : (t("typeHintOther") as string) ||
              "Leaving date empty will default to Today."}
        </Text>
        {/* When section */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ marginBottom: 6, color: theme.colors.text }}>
            {(t("when") as string) || "When"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Button
              title={t("today") || "Today"}
              variant="outline"
              onPress={() => {
                const d = dayjs();
                updateDateFromParts(
                  d.format("YYYY"),
                  d.format("M"),
                  d.format("D")
                );
                if (!allDay && !timeText) setTimeText("17:00");
              }}
            />
            <Button
              title={(t("tomorrow") as string) || "Tomorrow"}
              variant="outline"
              onPress={() => {
                const d = dayjs().add(1, "day");
                updateDateFromParts(
                  d.format("YYYY"),
                  d.format("M"),
                  d.format("D")
                );
                if (!allDay && !timeText) setTimeText("09:00");
              }}
            />
            <Button
              title={(t("in1Week") as string) || "In 1 week"}
              variant="outline"
              onPress={() => {
                const d = dayjs().add(1, "week");
                updateDateFromParts(
                  d.format("YYYY"),
                  d.format("M"),
                  d.format("D")
                );
                if (!allDay && !timeText) setTimeText("09:00");
              }}
            />
            <Button
              title={(t("in2Weeks") as string) || "In two weeks"}
              variant="outline"
              onPress={() => {
                const d = dayjs().add(2, "week");
                updateDateFromParts(
                  d.format("YYYY"),
                  d.format("M"),
                  d.format("D")
                );
                if (!allDay && !timeText) setTimeText("09:00");
              }}
            />
            <Button
              title={(t("in1Month") as string) || "In 1 month"}
              variant="outline"
              onPress={() => {
                const d = dayjs().add(1, "month");
                updateDateFromParts(
                  d.format("YYYY"),
                  d.format("M"),
                  d.format("D")
                );
                if (!allDay && !timeText) setTimeText("09:00");
              }}
            />
          </View>
          <Text style={{ color: theme.colors.text, marginBottom: 4 }}>
            {(t("date") as string) || "Date"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Select
              options={dayOptions}
              value={dayPart || null}
              onChange={(v) =>
                updateDateFromParts(yearPart, monthPart, String(v))
              }
              containerStyle={{ flex: 1.1 }}
              testID="dayInput"
            />
            <Select
              options={[...Array(12)].map((_, i) => ({
                label: dayjs().month(i).format("MMMM"),
                value: String(i + 1),
              }))}
              value={monthPart || null}
              onChange={(v) =>
                updateDateFromParts(yearPart, String(v), dayPart)
              }
              containerStyle={{ flex: 1.6 }}
              testID="monthInput"
            />
            <Select
              options={Array.from({ length: 7 }, (_, i) => {
                const start = dayjs().year() - 1;
                const y = start + i;
                return { label: String(y), value: String(y) } as Option<string>;
              })}
              value={yearPart || null}
              onChange={(v) =>
                updateDateFromParts(String(v), monthPart, dayPart)
              }
              containerStyle={{ flex: 0.8, minWidth: 90 }}
              testID="yearInput"
            />
          </View>
          {dateError ? (
            <Text style={{ color: theme.colors.error, marginTop: 6 }}>
              {dateError}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, marginBottom: 4 }}>
                {(t("time") as string) || "Time"}
              </Text>
              <Input
                placeholder="HH:mm"
                value={timeText}
                onChangeText={setTimeText}
                autoCapitalize="none"
                errorText={timeError}
                editable={!allDay}
                testID="timeInput"
              />
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: theme.colors.text, marginBottom: 4 }}>
                {(t("allDay") as string) || "All-day"}
              </Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                testID="allDaySwitch"
              />
            </View>
          </View>
        </View>
        {showAdvanced ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: theme.colors.text }}>
              {t("priority") || "Priority"}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              {[undefined, 1, 2, 3].map((p) => (
                <Button
                  key={String(p)}
                  title={
                    p === undefined
                      ? (t("priorityNone") as string) || "None"
                      : p === 1
                        ? (t("priorityLow") as string) || "Low"
                        : p === 2
                          ? (t("priorityMedium") as string) || "Medium"
                          : (t("priorityHigh") as string) || "High"
                  }
                  onPress={() => setPriority(p as any)}
                  variant={priority === p ? "primary" : "outline"}
                />
              ))}
            </View>
            {/* Kid assignment chips */}
            {kids.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ marginBottom: 6, color: theme.colors.text }}>
                  {(t("assignToKids") as string) || "Assign to kids"}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {kids.map((k) => {
                    const active = childIds.includes(k.id);
                    return (
                      <TouchableOpacity
                        key={k.id}
                        onPress={() => {
                          setChildIds((prev) =>
                            prev.includes(k.id)
                              ? prev.filter((x) => x !== k.id)
                              : [...prev, k.id]
                          );
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
                            borderColor: active
                              ? theme.colors.text
                              : theme.colors.border,
                            backgroundColor: theme.colors.card,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>
                            {k.emoji || "🙂"}
                          </Text>
                          <Text
                            style={{ fontSize: 12, color: theme.colors.text }}
                          >
                            {k.displayName}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <Text style={{ marginTop: 8, color: theme.colors.text }}>
              {t("tags") || "Tags"}
            </Text>
            <Input
              placeholder={
                (t("tagsPlaceholder") as string) || "Comma-separated"
              }
              value={tagsText}
              onChangeText={setTagsText}
              autoCapitalize="none"
            />
            <View style={{ height: 8 }} />
            {lastTemplate ? (
              <Button
                title={
                  (t("useLastTemplate") as string) ||
                  `Use last template: ${lastTemplate?.name}`
                }
                onPress={async () => {
                  try {
                    if (!householdId || !lastTemplate) return;
                    const newId = await createTask(householdId, {
                      title: title.trim() || lastTemplate.name,
                      type: "checklist",
                      createdBy: auth.currentUser?.uid || "unknown",
                    });
                    for (const it of lastTemplate.items) {
                      await addChecklistItem(householdId, newId, it);
                    }
                    toast.show(
                      (t("templateInserted") as string) || "Template inserted",
                      { type: "success" }
                    );
                    navigation.replace("TaskDetail", { id: newId });
                  } catch {}
                }}
                disabled={!householdId}
              />
            ) : null}
            <Button
              title={
                (t("insertFromTemplate") as string) || "Insert from template"
              }
              onPress={() => {
                navigation.navigate("TemplatePicker", {
                  onPick: async (_name: string, items: string[]) => {
                    try {
                      if (!householdId) return;
                      const newId = await createTask(householdId, {
                        title: title.trim() || _name,
                        type: "checklist",
                        createdBy: auth.currentUser?.uid || "unknown",
                      });
                      for (const it of items) {
                        await addChecklistItem(householdId, newId, it);
                      }
                      toast.show(
                        (t("templateInserted") as string) ||
                          "Template inserted",
                        { type: "success" }
                      );
                      navigation.replace("TaskDetail", { id: newId });
                    } catch {}
                  },
                });
              }}
              disabled={!householdId}
            />
          </View>
        ) : null}
      </ScrollView>
      {/* Sticky footer with primary actions */}
      <View
        style={{
          paddingVertical: 8,
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            title={t("save")}
            onPress={save}
            disabled={!canSave}
            testID="saveButton"
          />
          <Button
            title={(t("saveAndAddAnother") as string) || "Save and add another"}
            onPress={saveAndAddAnother}
            disabled={!canSave}
            testID="saveAnotherButton"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
