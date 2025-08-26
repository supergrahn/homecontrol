import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from './firebase/providers/QueryProvider';
import NavigationProvider from './firebase/providers/NavigationProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <NavigationProvider />
      </QueryProvider>
    </SafeAreaProvider>
  );
}