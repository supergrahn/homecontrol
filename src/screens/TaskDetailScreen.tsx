import React from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';
import { listChecklist, addChecklistItem, toggleChecklistItem, removeChecklistItem } from '../services/checklist';

const HID = 'demo-household-id';

export default function TaskDetailScreen({ route }: any) {
  const { id: taskId } = route.params;
  const [items, setItems] = React.useState<any[]>([]);
  const [newItem, setNewItem] = React.useState('');

  const load = React.useCallback(async () => {
    const list = await listChecklist(HID, taskId);
    setItems(list);
  }, [taskId]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newItem.trim()) return;
    await addChecklistItem(HID, taskId, newItem.trim());
    setNewItem('');
    load();
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'700' }}>Task</Text>
      <Text style={{ marginBottom:12, color:'#666' }}>ID: {taskId}</Text>

      <Text style={{ fontWeight:'600', marginBottom:8 }}>Checklist</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
            <TouchableOpacity
              onPress={async () => { await toggleChecklistItem(HID, taskId, item.id, !item.done); load(); }}
              style={{
                width:22, height:22, borderRadius:4, borderWidth:1, borderColor:'#999',
                alignItems:'center', justifyContent:'center', marginRight:10, backgroundColor: item.done ? '#4caf50' : 'transparent'
              }}
            >
              {item.done ? <Text style={{ color:'#fff' }}>✓</Text> : null}
            </TouchableOpacity>
            <Text style={{ flex:1 }}>{item.label}</Text>
            <Button title="Del" onPress={async () => { await removeChecklistItem(HID, taskId, item.id); load(); }} />
          </View>
        )}
        ListEmptyComponent={<Text style={{ color:'#999' }}>No checklist items yet.</Text>}
      />

      <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
        <TextInput
          placeholder="Add checklist item…"
          value={newItem}
          onChangeText={setNewItem}
          style={{ flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }}
        />
        <Button title="Add" onPress={add} />
      </View>
    </View>
  );
}
