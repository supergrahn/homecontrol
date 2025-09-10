import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Button , Alert } from "react-native";
import dayjs from "dayjs";
import "dayjs/locale/nb";
import { Task } from "../models/task";
import { useTranslation } from "react-i18next";
import { acceptTask, completeTask, releaseTask } from "../services/tasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { enqueueComplete } from "../services/outbox";
import { useTheme } from "../design/theme";
import { useErrorHandler } from "../services/errorHandling";

export default function TaskCard({
  task,
  onPress,
  onChanged,
  showQuickAccept,
}: {
  task: Task;
  onPress?: () => void;
  onChanged?: () => void;
  showQuickAccept?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { householdId } = useHousehold();
  const qc = useQueryClient();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { handleTaskError } = useErrorHandler();

  useEffect(() => {
    // Map our i18n language to dayjs locale (we use 'no' -> dayjs 'nb')
    const locale = i18n.language === "no" ? "nb" : i18n.language || "en";
    dayjs.locale(locale);
  }, [i18n.language]);

  const typeKey = task.type === "checklist" ? "checklistType" : task.type;
  const isBlocked = task.status === "blocked";
  const depIds = Array.isArray((task as any)?.dependsOn)
    ? ((task as any).dependsOn as string[])
    : [];
  const [depInfos, setDepInfos] = React.useState<
    { id: string; title: string; status: string }[]
  >([]);
  const [depLoading, setDepLoading] = React.useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!householdId) {
        throw new Error("No household selected");
      }
      return completeTask(householdId, task.id);
    },
    onMutate: async () => {
      const keys = [
        ["today", householdId],
        ["overdue", householdId],
        ["upcoming", householdId],
      ] as const;
      const previous: Record<string, any> = {};
      await Promise.all(
        keys.map(async (k) => {
          previous[k[0]] = qc.getQueryData(k as any);
          qc.setQueryData<any[]>(k as any, (old) =>
            old ? old.filter((it) => it.id !== task.id) : old
          );
        })
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      const prev = ctx as any;
      if (prev?.previous) {
        Object.entries(prev.previous).forEach(([key, data]) => {
          const qk = [key, householdId] as any;
          qc.setQueryData(qk, data);
        });
      }
      handleTaskError(err, task.id, householdId);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["today", householdId] });
      qc.invalidateQueries({ queryKey: ["overdue", householdId] });
      qc.invalidateQueries({ queryKey: ["upcoming", householdId] });
      onChanged?.();
    },
  });

  React.useEffect(() => {
    (async () => {
      try {
        if (!isBlocked || !householdId || depIds.length === 0) {
          setDepInfos([]);
          setDepLoading(false);
          return;
        }
        setDepLoading(true);
        const { getDoc, doc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        const results: { id: string; title: string; status: string }[] = [];
        for (const id of depIds) {
          const ref = doc(db, `households/${householdId}/tasks/${id}`);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as any;
            results.push({
              id: snap.id,
              title: String(data?.title || snap.id),
              status: String(data?.status || "open"),
            });
          }
        }
        setDepInfos(results);
        setDepLoading(false);
      } catch {
        setDepInfos([]);
        setDepLoading(false);
      }
    })();
  }, [isBlocked, householdId, JSON.stringify(depIds)]);
  const uid = auth.currentUser?.uid;
  const acceptedBy = Array.isArray(task.acceptedBy) ? task.acceptedBy : [];
  const isAcceptedByMe = !!uid && acceptedBy.includes(uid);
  const acceptedCount = acceptedBy.length;

  const toggleAccept = useMutation({
    mutationFn: async () => {
      if (!householdId || !uid)
        throw new Error("Not signed in or no household");
      if (isAcceptedByMe) {
        return releaseTask(householdId, task.id);
      }
      return acceptTask(householdId, task.id);
    },
    onMutate: async () => {
      const keys = [
        ["today", householdId],
        ["overdue", householdId],
        ["upcoming", householdId],
      ] as const;
      const previous: Record<string, any> = {};
      await Promise.all(
        keys.map(async (k) => {
          previous[k[0]] = qc.getQueryData(k as any);
          qc.setQueryData<any[]>(k as any, (old) => {
            if (!old) return old as any;
            return old.map((it) => {
              if (it.id !== task.id) return it;
              const curr = Array.isArray(it.acceptedBy) ? it.acceptedBy : [];
              const next = isAcceptedByMe
                ? curr.filter((x: string) => x !== uid)
                : uid
                  ? Array.from(new Set([...curr, uid]))
                  : curr;
              return { ...it, acceptedBy: next };
            });
          });
        })
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      const prev = ctx as any;
      if (prev?.previous) {
        Object.entries(prev.previous).forEach(([key, data]) => {
          const qk = [key, householdId] as any;
          qc.setQueryData(qk, data);
        });
      }
      handleTaskError(err, task.id, householdId);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["today", householdId] });
      qc.invalidateQueries({ queryKey: ["overdue", householdId] });
      qc.invalidateQueries({ queryKey: ["upcoming", householdId] });
      onChanged?.();
    },
  });

  const occurrenceAt = task.startAt ?? task.dueAt ?? null;
  const hasPrep =
    !!task.prepWindowHours &&
    task.prepWindowHours > 0 &&
    !!task.nextOccurrenceAt &&
    !!occurrenceAt &&
    new Date(task.nextOccurrenceAt).getTime() !==
      new Date(occurrenceAt).getTime();
  const when = hasPrep
    ? `${t("prepAt", { when: dayjs(task.nextOccurrenceAt as Date).format("ddd HH:mm") })} • ${t("occursAt", { when: dayjs(occurrenceAt as Date).format("ddd HH:mm") })}`
    : task.nextOccurrenceAt
      ? dayjs(task.nextOccurrenceAt).format("ddd HH:mm")
      : task.dueAt
        ? dayjs(task.dueAt).format("ddd HH:mm")
        : "—";
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${t("taskCard", { title: task.title })} ${when}`}
      accessibilityHint={t("taskCard.hint") || "Double tap to view task details"}
      accessible={true}
    >
      <View
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: 10,
        }}
        accessible={false}
      >
        <Text style={{ fontWeight: "600", fontSize: 16 }}>{task.title}</Text>
        <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing(0.5) }}>
          {t(typeKey).toUpperCase()} • {when}
        </Text>
        {(() => {
          const shiftedAt = (task as any).lastAutoShiftedAt as Date | undefined;
          if (!shiftedAt) return null;
          const recent = dayjs().diff(dayjs(shiftedAt), "day") <= 7;
          if (!recent) return null;
          const reason = (task as any).lastAutoShiftReason as
            | string
            | undefined;
          const label =
            reason === "unblocked_past"
              ? (t("autoShiftedAfterUnblocked") as string) ||
                "Auto-shifted when unblocked"
              : (t("autoShifted") as string) || "Auto-shifted";
          return (
            <Text style={{ color: theme.colors.textSecondary, marginTop: 2, fontSize: 12 }}>
              {label}
            </Text>
          );
        })()}
        {isBlocked ? (
          <View>
            <View
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                backgroundColor: theme.colors.blockedSurface,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: theme.colors.blockedBorder,
              }}
            >
              <Text style={{ color: theme.colors.blocked, fontSize: 12 }}>
                {(() => {
                  const unresolved = depInfos.filter(
                    (d) => d.status !== "done" && d.status !== "verified"
                  ).length;
                  const n = unresolved || depIds.length;
                  return `${(t("blockedBy") as string) || "Blocked by"} ${n}`;
                })()}
              </Text>
            </View>
            <View style={{ marginTop: 6, gap: 6 }}>
              {depLoading && depInfos.length === 0 ? (
                <>
                  <View
                    style={{
                      height: 10,
                      width: 160,
                      backgroundColor: theme.colors.skeleton,
                      borderRadius: 4,
                    }}
                  />
                  <View
                    style={{
                      height: 10,
                      width: 140,
                      backgroundColor: theme.colors.skeleton,
                      borderRadius: 4,
                    }}
                  />
                </>
              ) : null}
              {(() => {
                const rows = (
                  depInfos.length
                    ? depInfos
                    : depIds.map((id) => ({ id, title: id, status: "open" }))
                ) as {
                  id: string;
                  title: string;
                  status: string;
                }[];
                const sorted = rows.sort((a, b) => {
                  const aDone = a.status === "done" || a.status === "verified";
                  const bDone = b.status === "done" || b.status === "verified";
                  if (aDone === bDone) return 0;
                  return aDone ? 1 : -1; // unresolved first
                });
                const visible = sorted.slice(0, 3);
                const moreCount = Math.max(0, sorted.length - visible.length);
                return (
                  <>
                    {visible.map((d) => {
                      const resolved =
                        d.status === "done" || d.status === "verified";
                      const dotColor = resolved ? theme.colors.textSecondary : theme.colors.error;
                      return (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() =>
                            navigation.navigate("TaskDetail", { id: d.id })
                          }
                          accessibilityRole="link"
                          accessibilityLabel={`${t("dependency", { title: d.title, status: resolved ? t("completed") : t("pending") })}`}
                          accessibilityHint={t("dependency.hint") || "Double tap to view blocking task"}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 4,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: dotColor,
                              marginRight: 6,
                            }}
                          />
                          <Text
                            style={{
                              color: resolved ? theme.colors.muted : theme.colors.primary,
                              fontSize: 12,
                              textDecorationLine: resolved
                                ? "line-through"
                                : "underline",
                            }}
                          >
                            {d.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {moreCount > 0 ? (
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate("TaskDetail", { id: task.id })
                        }
                        accessibilityRole="link"
                        accessibilityLabel={t("moreDependencies", { count: moreCount }) || `${moreCount} more dependencies`}
                        accessibilityHint={t("moreDependencies.hint") || "Double tap to view all dependencies"}
                        style={{ paddingVertical: 4 }}
                      >
                        <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                          +{moreCount} more
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                );
              })()}
            </View>
          </View>
        ) : null}
        {(Array.isArray(task.context) && task.context.length > 0) ||
        typeof task.priority === "number" ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 6,
            }}
          >
            {typeof task.priority === "number" ? (
              <View
                style={{
                  backgroundColor: theme.colors.prioritySurface,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: theme.colors.priorityBorder,
                }}
              >
                <Text style={{ color: theme.colors.priority, fontSize: 12 }}>
                  {t("priority")}:{" "}
                  {task.priority === 1
                    ? (t("priorityLow") as string) || "Low"
                    : task.priority === 2
                      ? (t("priorityMedium") as string) || "Medium"
                      : (t("priorityHigh") as string) || "High"}
                </Text>
              </View>
            ) : null}
            {(task.context || []).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: theme.colors.tagSurface,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: theme.colors.tagBorder,
                }}
              >
                <Text style={{ color: theme.colors.tag, fontSize: 12 }}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {isAcceptedByMe || acceptedCount > 0 ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {isAcceptedByMe ? (
              <View
                style={{
                  backgroundColor: theme.colors.acceptedSurface,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: theme.colors.acceptedBorder,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: theme.colors.accepted, fontSize: 12 }}>
                  {t("mine") || "Mine"}
                </Text>
              </View>
            ) : null}
            {acceptedCount > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.tagSurface,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderWidth: 1,
                  borderColor: theme.colors.tagBorder,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: theme.colors.tag, fontSize: 12 }}>
                  {t("acceptedCount", { count: acceptedCount }) ||
                    `${acceptedCount} accepted`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <Button
              title={t("markComplete")}
              onPress={() => {
                if (!householdId) return;
                mutation.mutate(undefined, {
                  onError: async () => {
                    try {
                      await enqueueComplete(householdId, task.id);
                    } catch {}
                  },
                });
              }}
              disabled={isBlocked || !householdId || mutation.isPending}
              accessibilityLabel={t("markComplete.label", { title: task.title }) || `Mark ${task.title} as complete`}
              accessibilityHint={isBlocked ? t("markComplete.blocked") || "Task is blocked and cannot be completed" : t("markComplete.hint") || "Double tap to mark task as complete"}
            />
          </View>
          {showQuickAccept ? (
            <View style={{ alignSelf: "flex-start" }}>
              <Button
                title={
                  isAcceptedByMe
                    ? (t("releaseTask") as string) || "Release"
                    : (t("acceptTask") as string) || "I've got it"
                }
                onPress={() => toggleAccept.mutate()}
                disabled={isBlocked || !householdId || toggleAccept.isPending}
                accessibilityLabel={
                  isAcceptedByMe 
                    ? t("releaseTask.label", { title: task.title }) || `Release ${task.title}`
                    : t("acceptTask.label", { title: task.title }) || `Accept ${task.title}`
                }
                accessibilityHint={
                  isAcceptedByMe 
                    ? t("releaseTask.hint") || "Double tap to release this task"
                    : t("acceptTask.hint") || "Double tap to accept this task"
                }
              />
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
