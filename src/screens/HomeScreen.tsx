import React from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TaskCard from '../components/TaskCard';
import { fetchTodayTasks, fetchOverdueTasks, fetchUpcomingTasks } from '../services/tasks';
import { fetchRecentActivity } from '../services/activity';
import { useHousehold } from '../firebase/providers/HouseholdProvider';
import { fetchLatestDigest } from '../services/digest';
import dayjs from 'dayjs';
import { appEvents } from '../App';
// import { createHousehold } from '../services/households';

// Household id from context

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<'today'|'overdue'|'upcoming'>('today');
  const { householdId, households, loading, selectHousehold } = useHousehold();
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    const sub = appEvents.addListener('show-overdue', () => setTab('overdue'));
    return () => { sub.remove(); };
  }, []);

  const enabled = !!householdId;
  const today = useQuery({ queryKey: ['today', householdId], queryFn: () => fetchTodayTasks(householdId!), enabled });
  const overdue = useQuery({ queryKey: ['overdue', householdId], queryFn: () => fetchOverdueTasks(householdId!), enabled });
  const upcoming = useQuery({ queryKey: ['upcoming', householdId], queryFn: () => fetchUpcomingTasks(householdId!), enabled });
  const digest = useQuery({ queryKey: ['digest', householdId], queryFn: () => fetchLatestDigest(householdId!), enabled });

  const list = tab === 'today' ? today : tab === 'overdue' ? overdue : upcoming;
  const activity = useQuery({ queryKey: ['activity', householdId], queryFn: () => fetchRecentActivity(householdId!), enabled });

  const refreshAll = React.useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['digest', householdId] }),
        qc.invalidateQueries({ queryKey: ['today', householdId] }),
        qc.invalidateQueries({ queryKey: ['overdue', householdId] }),
        qc.invalidateQueries({ queryKey: ['upcoming', householdId] }),
        qc.invalidateQueries({ queryKey: ['activity', householdId] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, qc, householdId]);

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <Text style={{ fontSize:22, fontWeight:'700' }}>
          {tab === 'today' ? t('today') : tab === 'overdue' ? t('overdue') : t('upcoming')}
        </Text>
        <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
          <Button
            title={householdId ? (households.find(h => h.id === householdId)?.name || householdId) : t('selectHousehold')}
            onPress={() => setSelectorOpen(true)}
          />
          <Button title={t('add')} onPress={() => navigation.navigate('AddTask')} />
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {!enabled && !loading ? (
        <View>
          <Text>{households.length > 0 ? t('selectHouseholdToContinue') : t('noHouseholds')}</Text>
          {households.length === 0 ? (
            <View style={{ marginTop: 12 }}>
              <Button title={t('createHousehold')} onPress={() => navigation.navigate('Settings')} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
        {(['today','overdue','upcoming'] as const).map(key => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} activeOpacity={0.8}>
            <View style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:999, backgroundColor: tab === key ? '#111' : '#eee' }}>
              <Text style={{ color: tab === key ? '#fff' : '#111' }}>{t(key)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily summary card */}
      {enabled ? (
        <View style={{ padding:12, borderRadius:12, backgroundColor:'#f7f7f7', borderWidth:1, borderColor:'#eee', marginBottom:12 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontWeight:'600', marginBottom:4 }}>{t('dailySummary')}</Text>
            <Button
              title={t('refresh')}
              onPress={() => {
                qc.invalidateQueries({ queryKey: ['digest', householdId] });
                qc.invalidateQueries({ queryKey: ['today', householdId] });
                qc.invalidateQueries({ queryKey: ['overdue', householdId] });
                qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
              }}
            />
          </View>
          {digest.isLoading ? (
            <Text>{t('loading')}</Text>
          ) : digest.data ? (
            <View>
              <Text>{t('dailySummaryCounts', { today: digest.data.counts.today, overdue: digest.data.counts.overdue })}</Text>
              {!!(digest.data as any).samples ? (
                <Text style={{ color:'#666', marginTop:4 }}>
                  {[(digest.data as any).samples.todayTitles, (digest.data as any).samples.overdueTitles]
                    .flat()
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' • ')}
                </Text>
              ) : null}
              {digest.data.counts.overdue > 0 ? (
                <View style={{ marginTop:8, alignSelf:'flex-start' }}>
                  <Button title={t('viewOverdue')} onPress={() => setTab('overdue')} />
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ color:'#666' }}>{t('noSummaryYet')}</Text>
          )}
        </View>
      ) : null}

    {enabled && list.isLoading ? <Text>{t('loading')}</Text> :
        <FlatList
      data={(enabled ? list.data : []) || []}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refreshAll}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { id: item.id })}
              onChanged={() => {
                qc.invalidateQueries({ queryKey: ['today', householdId] });
                qc.invalidateQueries({ queryKey: ['overdue', householdId] });
                qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
              }}
            />
          )}
          ListEmptyComponent={<Text>{t('noTasks')}</Text>}
        />
      }

      <View style={{ marginTop:16, gap: 8 }}>
        <Button title={t('templates')} onPress={() => navigation.navigate('Templates')} />
        <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
      </View>

      {/* Recent activity */}
      {enabled ? (
        <View style={{ marginTop:24 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:16, fontWeight:'600', marginBottom:8 }}>{t('recentActivity')}</Text>
            <Button title={t('viewTasks')} onPress={() => setTab('today')} />
          </View>
          {activity.isLoading ? <Text>{t('loading')}</Text> : (
            <View>
              {(activity.data || []).map(a => {
                const isTaskCreate = a.action === 'task.create';
                const isTaskComplete = a.action === 'task.complete';
                const isInviteAccept = a.action === 'invite.accept';
                const title = (a as any).payload?.title;
                const line = isTaskCreate
                  ? `${t('add')} · ${title || a.taskId || ''}`
                  : isTaskComplete
                  ? `${t('markComplete')} · ${title || a.taskId || ''}`
                  : isInviteAccept
                  ? t('inviteAccepted')
                  : `${a.action}`;
                const time = a.at ? dayjs(a.at).format('HH:mm') : '';
                return (
                  <Text key={a.id} style={{ color:'#555', marginBottom:4 }}>
                    {time ? `${time} — ` : ''}{line}
                  </Text>
                );
              })}
              {(activity.data || []).length === 0 ? <Text style={{ color:'#999' }}>{t('nothingYet')}</Text> : null}
            </View>
          )}
        </View>
      ) : null}

      <Modal visible={selectorOpen} animationType="slide" transparent onRequestClose={() => setSelectorOpen(false)}>
        <View style={{ flex:1, backgroundColor: '#0006', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16 }}>
            <Text style={{ fontSize:18, fontWeight:'600', marginBottom:12 }}>{t('selectHousehold')}</Text>
            {households.map(h => (
              <TouchableOpacity key={h.id} onPress={async () => { await selectHousehold(h.id); setSelectorOpen(false); }}>
                <View style={{ paddingVertical:10 }}>
                  <Text style={{ fontWeight: h.id === householdId ? '700' : '400' }}>{h.name || h.id}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ marginTop:12 }}>
              <Button title={t('close')} onPress={() => setSelectorOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}