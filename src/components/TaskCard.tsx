import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { Task } from '../models/task';

export default function TaskCard({ task, onPress }: { task: Task; onPress?: () => void }) {
  const when =
    task.nextOccurrenceAt ? dayjs(task.nextOccurrenceAt).format('ddd HH:mm') :
    task.dueAt ? dayjs(task.dueAt).format('ddd HH:mm') : '—';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={{ padding:14, borderRadius:12, backgroundColor:'#fff', borderWidth:1, borderColor:'#eee', marginBottom:10 }}>
        <Text style={{ fontWeight:'600', fontSize:16 }}>{task.title}</Text>
        <Text style={{ color:'#666', marginTop:2 }}>{task.type.toUpperCase()} • {when}</Text>
      </View>
    </TouchableOpacity>
  );
}