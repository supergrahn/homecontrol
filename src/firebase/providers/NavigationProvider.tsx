import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../../screens/HomeScreen";
import AddTaskScreen from "../../screens/AddTaskScreen";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import TemplatesScreen from "../../screens/TemplatesScreen";
import SignInScreen from "../../screens/SignInScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import ActivityScreen from "../../screens/ActivityScreen";

export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  AddTask: { preset?: string } | undefined;
  TaskDetail: { id: string };
  Templates: undefined;
  Settings: undefined;
  Activity: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navRef = createNavigationContainerRef<RootStackParamList>();

export default function NavigationProvider() {
  return (
    <NavigationContainer theme={DefaultTheme} ref={navRef}>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Today" }}
        />
        <Stack.Screen
          name="AddTask"
          component={AddTaskScreen}
          options={{ title: "New Task" }}
        />
        <Stack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{ title: "Task" }}
        />
        <Stack.Screen
          name="Templates"
          component={TemplatesScreen}
          options={{ title: "Templates" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="Activity"
          component={ActivityScreen}
          options={{ title: "Activity" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
