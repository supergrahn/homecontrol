import React from 'react';
import { View, TextInput, Text, Button, Platform } from 'react-native';
import { createTask } from '../services/tasks';
import { auth } from '../firebase';

const HID = 'demo-household-id';

export default function AddTaskScreen({ navigation }: any) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState<'chore'|'event'|'deadline'|'checklist'>('chore');

  const save = async () => {
    if (!title.trim()) return;
    await createTask(HID, {
      title: title.trim(),
      type,
      createdBy: auth.currentUser?.uid || 'unknown',
      // minimal — dueAt/startAt/rrule can be added via TaskDetail in MVP
    });
    navigation.goBack();
  };

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:'600' }}>New Task</Text>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12 }} />
      <Text>Type</Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        {(['chore','event','deadline','checklist'] as const).map(t => (
          <Button key={t} title={t} onPress={() => setType(t)} color={type === t ? (Platform.OS === 'ios' ? undefined : '#0066cc') : undefined} />
        ))}
      </View>
      <Button title="Save" onPress={save} />
    </View>
  );
}