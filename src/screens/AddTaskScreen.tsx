import React from 'react';
import { View, TextInput, Text, Button, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createTask } from '../services/tasks';
import { auth } from '../firebase';
import { useHousehold } from '../firebase/providers/HouseholdProvider';

export default function AddTaskScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState<'chore'|'event'|'deadline'|'checklist'>('chore');

  const save = async () => {
    if (!title.trim()) return;
    if (!householdId) return;
    await createTask(householdId, {
      title: title.trim(),
      type,
      createdBy: auth.currentUser?.uid || 'unknown',
      // minimal — dueAt/startAt/rrule can be added via TaskDetail in MVP
    });
    navigation.goBack();
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:'600' }}>{t('newTask')}</Text>
      <TextInput placeholder={t('titleLabel')} value={title} onChangeText={setTitle}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12 }} />
      <Text>{t('type')}</Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        {(['chore','event','deadline','checklist'] as const).map(tk => (
          <Button key={tk} title={t(tk)} onPress={() => setType(tk)} color={type === tk ? (Platform.OS === 'ios' ? undefined : '#0066cc') : undefined} />
        ))}
      </View>
  <Button title={t('save')} onPress={save} disabled={!householdId} />
    </View>
  );
}