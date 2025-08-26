import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { createTask } from '../services/tasks';
import { auth } from '../firebase';
import { addChecklistItem } from '../services/checklist';

const HID = 'demo-household-id';

const templates: Record<string, string[]> = {
  'Birthday': ['Pick date & budget','Guest list','Order cake','Buy gifts','Decorations','Thank-you notes'],
  'Day Trip': ['Pack lunch','Spare clothes','Buckets & spades','Sunscreen','Water bottles','Towels'],
  'Season Change: Winter': ['Measure feet','Buy winter boots','Label clothes','Pack extra mittens','Check jacket size']
};

export default function TemplatesScreen() {
  const addTemplate = async (name: string) => {
    const createdBy = auth.currentUser?.uid || 'unknown';
    const taskId = await createTask(HID, { title: name, type: 'checklist', createdBy });
    for (const label of templates[name]) {
      await addChecklistItem(HID, taskId, label);
    }
    Alert.alert('Template created', `${name} added with ${templates[name].length} items.`);
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'700', marginBottom:12 }}>Templates</Text>
      {Object.keys(templates).map(k => (
        <View key={k} style={{ marginBottom:16 }}>
          <Text style={{ fontWeight:'600', marginBottom:6 }}>{k}</Text>
          <Button title="Add" onPress={() => addTemplate(k)} />
        </View>
      ))}
    </View>
  );
}
