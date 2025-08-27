import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Button } from "react-native";
import dayjs from "dayjs";
import "dayjs/locale/nb";
import { Task } from "../models/task";
import { useTranslation } from "react-i18next";
import { acceptTask, completeTask, releaseTask } from "../services/tasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { auth } from "../firebase";

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

  useEffect(() => {
    // Map our i18n language to dayjs locale (we use 'no' -> dayjs 'nb')
    const locale = i18n.language === "no" ? "nb" : i18n.language || "en";
    dayjs.locale(locale);
  }, [i18n.language]);

  const typeKey = task.type === "checklist" ? "checklistType" : task.type;
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
            old ? old.filter((it) => it.id !== task.id) : old,
          );
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = ctx as any;
      if (prev?.previous) {
        Object.entries(prev.previous).forEach(([key, data]) => {
          const qk = [key, householdId] as any;
          qc.setQueryData(qk, data);
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["today", householdId] });
      qc.invalidateQueries({ queryKey: ["overdue", householdId] });
      qc.invalidateQueries({ queryKey: ["upcoming", householdId] });
      onChanged?.();
    },
  });

  const uid = auth.currentUser?.uid;
  const acceptedBy = Array.isArray(task.acceptedBy) ? task.acceptedBy : [];
  const isAcceptedByMe = !!uid && acceptedBy.includes(uid);

  const toggleAccept = useMutation({
    mutationFn: async () => {
      if (!householdId || !uid) throw new Error("Not signed in or no household");
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
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = ctx as any;
      if (prev?.previous) {
        Object.entries(prev.previous).forEach(([key, data]) => {
          const qk = [key, householdId] as any;
          qc.setQueryData(qk, data);
        });
      }
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
    new Date(task.nextOccurrenceAt).getTime() !== new Date(occurrenceAt).getTime();
  const when = hasPrep
    ? `${t("prepAt", { when: dayjs(task.nextOccurrenceAt as Date).format("ddd HH:mm") })} • ${t("occursAt", { when: dayjs(occurrenceAt as Date).format("ddd HH:mm") })}`
    : task.nextOccurrenceAt
      ? dayjs(task.nextOccurrenceAt).format("ddd HH:mm")
      : task.dueAt
        ? dayjs(task.dueAt).format("ddd HH:mm")
        : "—";
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#eee",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontWeight: "600", fontSize: 16 }}>{task.title}</Text>
        <Text style={{ color: "#666", marginTop: 2 }}>
          {t(typeKey).toUpperCase()} • {when}
        </Text>
        <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
          <View style={{ alignSelf: "flex-start" }}>
            <Button
              title={t("markComplete")}
              onPress={() => mutation.mutate()}
              disabled={!householdId || mutation.isPending}
            />
          </View>
          {showQuickAccept ? (
            <View style={{ alignSelf: "flex-start" }}>
              <Button
                title={
                  isAcceptedByMe
                    ? ((t("releaseTask") as string) || "Release")
                    : ((t("acceptTask") as string) || "I’ve got it")
                }
                onPress={() => toggleAccept.mutate()}
                disabled={!householdId || toggleAccept.isPending}
              />
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
