import React from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import TaskCard from '../components/TaskCard';
import { fetchTodayTasks } from '../services/tasks';

// TEMP: hardcode selected householdId; in real app, pick from user
const HID = 'demo-household-id';

export default function HomeScreen({ navigation }: any) {
  const { data, isLoading } = useQuery({ queryKey: ['today', HID], queryFn: () => fetchTodayTasks(HID) });

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <Text style={{ fontSize:22, fontWeight:'700' }}>Today</Text>
        <Button title="Add" onPress={() => navigation.navigate('AddTask')} />
      </View>

      {isLoading ? <Text>Loading…</Text> :
        <FlatList
          data={data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            <TaskCard task={item} onPress={() => navigation.navigate('TaskDetail', { id: item.id })} />
          }
          ListEmptyComponent={<Text>No tasks today. breathe. 🌿</Text>}
        />
      }

      <View style={{ marginTop:16 }}>
        <Button title="Templates" onPress={() => navigation.navigate('Templates')} />
      </View>
    </View>
  );
}