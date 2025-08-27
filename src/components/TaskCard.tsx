import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Button } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/nb';
import { Task } from '../models/task';
import { useTranslation } from 'react-i18next';
import { completeTask } from '../services/tasks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHousehold } from '../firebase/providers/HouseholdProvider';

export default function TaskCard({ task, onPress, onChanged }: { task: Task; onPress?: () => void; onChanged?: () => void }) {
  const { t, i18n } = useTranslation();
  const { householdId } = useHousehold();
  const qc = useQueryClient();

  useEffect(() => {
    // Map our i18n language to dayjs locale (we use 'no' -> dayjs 'nb')
    const locale = i18n.language === 'no' ? 'nb' : i18n.language || 'en';
    dayjs.locale(locale);
  }, [i18n.language]);

  const typeKey = task.type === 'checklist' ? 'checklistType' : task.type;
  const mutation = useMutation({
    mutationFn: async () => {
      if (!householdId) {
        throw new Error('No household selected');
      }
      return completeTask(householdId, task.id);
    },
    onMutate: async () => {
      const keys = [
        ['today', householdId],
        ['overdue', householdId],
        ['upcoming', householdId],
      ] as const;
      const previous: Record<string, any> = {};
      await Promise.all(keys.map(async (k) => {
        previous[k[0]] = qc.getQueryData(k as any);
        qc.setQueryData<any[]>(k as any, (old) => (old ? old.filter((it) => it.id !== task.id) : old));
      }));
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
      qc.invalidateQueries({ queryKey: ['today', householdId] });
      qc.invalidateQueries({ queryKey: ['overdue', householdId] });
      qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      onChanged?.();
    },
  });
  const when =
    task.nextOccurrenceAt ? dayjs(task.nextOccurrenceAt).format('ddd HH:mm') :
    task.dueAt ? dayjs(task.dueAt).format('ddd HH:mm') : '—';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{ padding:14, borderRadius:12, backgroundColor:'#fff', borderWidth:1, borderColor:'#eee', marginBottom:10 }}>
        <Text style={{ fontWeight:'600', fontSize:16 }}>{task.title}</Text>
        <Text style={{ color:'#666', marginTop:2 }}>{t(typeKey).toUpperCase()} • {when}</Text>
        <View style={{ marginTop:8, alignSelf:'flex-start' }}>
          <Button title={t('markComplete')} onPress={() => mutation.mutate()} disabled={!householdId || mutation.isPending} />
        </View>
      </View>
    </TouchableOpacity>
  );
}