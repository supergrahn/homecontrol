import React from "react";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../../screens/HomeScreen";
import AddTaskScreen from "../../screens/AddTaskScreen";
import TaskDetailScreen from "../../screens/TaskDetailScreen";
import TemplatesScreen from "../../screens/TemplatesScreen";
import SignInScreen from "../../screens/SignInScreen";
import SettingsScreen from "../../screens/SettingsScreen";
import ActivityScreen from "../../screens/ActivityScreen";
import MembersScreen from "../../screens/MembersScreen";
import KidsScreen from "../../screens/KidsScreen";
import SearchScreen from "../../screens/SearchScreen";
import CreateHouseholdScreen from "../../screens/CreateHouseholdScreen";
import ScanInviteScreen from "../../screens/ScanInviteScreen";
import QuickActionsScreen from "../../screens/QuickActionsScreen";
import ShowHouseholdQRScreen from "../../screens/ShowHouseholdQRScreen";
import TemplatePickerScreen from "../../screens/TemplatePickerScreen";
import ManageTemplatesScreen from "../../screens/ManageTemplatesScreen";
import CalendarScreen from "../../screens/CalendarScreen";

export type RootStackParamList = {
  SignIn: undefined;
  MainTabs: undefined;
  CreateHousehold: undefined;
  ScanInvite: undefined;
  ShowHouseholdQR: undefined;
  QuickActions: undefined;
  AddTask: { preset?: string } | undefined;
  TaskDetail: { id: string };
  Templates: undefined;
  TemplatePicker: { onPick?: (name: string, items: string[]) => void } | undefined;
  ManageTemplates: undefined;
  Settings: undefined;
  Activity: undefined;
  Calendar: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

export const navRef = createNavigationContainerRef<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerTitle: route.name,
        headerLeft: () => (
          <Ionicons
            name="home-outline"
            size={22}
            color="#333"
            onPress={() => navigation.navigate("Today" as never)}
            style={{ marginLeft: 12 }}
          />
        ),
        headerRight: () => (
          <Ionicons
            name="settings-outline"
            size={22}
            color="#333"
            onPress={() => navigation.navigate("Settings" as never)}
            style={{ marginRight: 12 }}
          />
        ),
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size, focused }) => {
          const name = route.name;
          const icon =
            name === "Today"
              ? focused
                ? "home"
                : "home-outline"
              : name === "Activity"
                ? focused
                  ? "notifications"
                  : "notifications-outline"
                  : name === "Members"
                  ? focused
                    ? "people"
                    : "people-outline"
                  : name === "Kids"
                    ? focused
                      ? "happy"
                      : "happy-outline"
                  : name === "Search"
                    ? focused
                      ? "search"
                      : "search-outline"
                    : name === "Add"
                      ? "add-circle"
                      : "ellipse-outline";
          const iconSize = name === "Add" ? 36 : size;
          const iconColor = name === "Add" ? "#0a84ff" : color;
          return <Ionicons name={icon as any} size={iconSize} color={iconColor} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={HomeScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen
        name="Add"
        component={HomeScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("QuickActions" as never);
          },
        })}
      />
  <Tab.Screen name="Members" component={MembersScreen} />
  <Tab.Screen name="Kids" component={KidsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

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
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateHousehold"
          component={CreateHouseholdScreen}
          options={{ title: "Create household" }}
        />
        <Stack.Screen
          name="ScanInvite"
          component={ScanInviteScreen}
          options={{ title: "Scan invite" }}
        />
        <Stack.Screen
          name="QuickActions"
          component={QuickActionsScreen}
          options={{ title: "Quick actions" }}
        />
        <Stack.Screen
          name="ShowHouseholdQR"
          component={ShowHouseholdQRScreen}
          options={{ title: "Show Household QR" }}
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
          name="ManageTemplates"
          component={ManageTemplatesScreen}
          options={{ title: "Manage templates" }}
        />
        <Stack.Screen
          name="TemplatePicker"
          component={TemplatePickerScreen}
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
        <Stack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: "Calendar" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
