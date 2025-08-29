import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
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
import { useHousehold } from "./HouseholdProvider";
import { auth } from "../../firebase";
import CreateHouseholdScreen from "../../screens/CreateHouseholdScreen";
import ScanInviteScreen from "../../screens/ScanInviteScreen";
import ShowHouseholdQRScreen from "../../screens/ShowHouseholdQRScreen";
import TemplatePickerScreen from "../../screens/TemplatePickerScreen";
import ManageTemplatesScreen from "../../screens/ManageTemplatesScreen";
import CalendarScreen from "../../screens/CalendarScreen";
import HeatmapScreen from "../../screens/HeatmapScreen";
import HouseholdChooserScreen from "../../screens/HouseholdChooserScreen";
import { appEvents } from "../../events";
import { getOutboxCount } from "../../services/outbox";
import { useTheme } from "../../design/theme";
import { onAuthStateChanged } from "firebase/auth";
import { mark, measureFrom, clearMark } from "../../utils/perf";

export type RootStackParamList = {
  SignIn: undefined;
  MainTabs: undefined;
  HouseholdChooser: undefined;
  CreateHousehold: undefined;
  ScanInvite: { hid?: string; inviteId?: string; token?: string } | undefined;
  ShowHouseholdQR: undefined;
  QuickActions: undefined;
  AddTask: { preset?: string } | undefined;
  TaskDetail: { id: string };
  Templates: undefined;
  TemplatePicker:
    | { onPick?: (name: string, items: string[]) => void }
    | undefined;
  ManageTemplates: undefined;
  Settings: undefined;
  Activity: undefined;
  Calendar: undefined;
  Heatmap: undefined;
  // WidgetPreview removed
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

export const navRef = createNavigationContainerRef<RootStackParamList>();

const linking: any = {
  prefixes: ["homecontrol://"] as string[],
  config: {
    screens: {
      HouseholdChooser: "chooser",
      MainTabs: {
        screens: {
          Today: "today",
          Activity: "activity",
          Members: "members",
          Kids: "kids",
          Search: "search",
        },
      },
      TaskDetail: "task/:id",
      ScanInvite: {
        path: "invite",
        parse: {
          hid: (v: string) => v,
          inviteId: (v: string) => v,
          token: (v: string) => v,
        },
      },
      Settings: "settings",
      Heatmap: "heatmap",
      Calendar: "calendar",
      QuickActions: "quick",
  // WidgetPreview removed
    },
  },
} as const;

export function MainTabs() {
  const theme = useTheme();
  const { householdId, households } = useHousehold();
  const [outboxCount, setOutboxCount] = React.useState<number>(0);
  // Track pending tab transitions: key by target route name -> from route name
  const pendingFromRef = React.useRef<Record<string, string | undefined>>({});
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const n = await getOutboxCount();
        if (active) setOutboxCount(n);
      } catch {}
    })();
    const sub = appEvents.addListener("outbox:count", (e: any) => {
      try {
        const n = Number((e && e.count) || 0);
        setOutboxCount(n);
      } catch {}
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
  headerShown: true,
  headerTitle: (props) => {
    if (route.name === "Today") {
      const name = households?.find((h) => h.id === householdId)?.name || "";
      return (
        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.colors.onSurface }}>
          {name}
        </Text>
      );
    }
    return (
      <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.colors.onSurface }}>
        {props.children}
      </Text>
    );
  },
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTitleStyle: { color: theme.colors.onSurface },
  headerLeft: () => null,
        headerRight: () => (
          route.name === "Today" ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Search"
                onPress={() => navigation.navigate("Search" as never)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="search" size={22} color={theme.colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8, marginRight: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                onPress={() => navigation.navigate("Settings" as never)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="settings-outline" size={22} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
          ) : null
        ),
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
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
                      : "ellipse-outline";
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
        tabBarAccessibilityLabel: route.name,
      })}
      >
      <Tab.Screen
        name="Today"
        component={HomeScreen}
        options={{ title: "Today" }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state: any = navigation.getState?.();
            const idx = state?.index ?? 0;
            const from = state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
            if (from === "Today") return; // no-op if pressing current tab
            pendingFromRef.current["Today"] = from;
            mark("tab:Today");
          },
          focus: () => {
            const from = pendingFromRef.current["Today"] || "unknown";
            measureFrom("tab:Today", `tab:switch:${from}->Today`);
            delete pendingFromRef.current["Today"];
          },
          blur: () => {
            // ensure we don't leak a pending mark on blur without focus
            clearMark("tab:Today");
          },
        })}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{ title: "Activity" }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const state: any = navigation.getState?.();
            const idx = state?.index ?? 0;
            const from = state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
            if (from === "Activity") return;
            pendingFromRef.current["Activity"] = from;
            mark("tab:Activity");
          },
          focus: () => {
            const from = pendingFromRef.current["Activity"] || "unknown";
            measureFrom("tab:Activity", `tab:switch:${from}->Activity`);
            delete pendingFromRef.current["Activity"];
          },
          blur: () => clearMark("tab:Activity"),
        })}
      />
      <Tab.Screen
        name="Members"
        component={MembersScreen}
        options={{
          tabBarBadge:
            outboxCount > 0
              ? outboxCount > 9
                ? "9+"
                : String(outboxCount)
              : undefined,
          title: "Members",
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const state: any = navigation.getState?.();
            const idx = state?.index ?? 0;
            const from = state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
            if (from === "Members") return;
            pendingFromRef.current["Members"] = from;
            mark("tab:Members");
          },
          focus: () => {
            const from = pendingFromRef.current["Members"] || "unknown";
            measureFrom("tab:Members", `tab:switch:${from}->Members`);
            delete pendingFromRef.current["Members"];
          },
          blur: () => clearMark("tab:Members"),
        })}
      />
      <Tab.Screen
        name="Kids"
        component={KidsScreen}
        options={{ title: "Kids" }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const state: any = navigation.getState?.();
            const idx = state?.index ?? 0;
            const from = state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
            if (from === "Kids") return;
            pendingFromRef.current["Kids"] = from;
            mark("tab:Kids");
          },
          focus: () => {
            const from = pendingFromRef.current["Kids"] || "unknown";
            measureFrom("tab:Kids", `tab:switch:${from}->Kids`);
            delete pendingFromRef.current["Kids"];
          },
          blur: () => clearMark("tab:Kids"),
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const state: any = navigation.getState?.();
            const idx = state?.index ?? 0;
            const from = state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
            if (from === "Search") return;
            pendingFromRef.current["Search"] = from;
            mark("tab:Search");
          },
          focus: () => {
            const from = pendingFromRef.current["Search"] || "unknown";
            measureFrom("tab:Search", `tab:switch:${from}->Search`);
            delete pendingFromRef.current["Search"];
          },
          blur: () => clearMark("tab:Search"),
        })}
      />
      </Tab.Navigator>

    </View>
  );
}

export default function NavigationProvider() {
  const theme = useTheme();
  const { householdId, loading } = useHousehold();
  const [navReady, setNavReady] = React.useState(false);
  const [uid, setUid] = React.useState<string | null>(auth.currentUser?.uid ?? null);
  const lastRouteRef = React.useRef<string | undefined>(undefined);

  // React to auth state changes so gating runs after sign-in/out
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);
  React.useEffect(() => {
    if (!navReady) return;
    // Avoid churn while household membership is resolving
    if (loading) return;
    const user = auth.currentUser;
    const current = navRef.getCurrentRoute()?.name;
    if (current) lastRouteRef.current = current;
    if (!user) {
      if (current !== "SignIn") {
        navRef.reset({ index: 0, routes: [{ name: "SignIn" as any }] });
        lastRouteRef.current = "SignIn";
      }
      return;
    }
    const onboardingRoutes = new Set(["HouseholdChooser", "CreateHousehold", "ScanInvite", "SignIn"]);
    if (__DEV__) {
      // Simple breadcrumb for local debugging
      console.log("[nav] gate:", {
        current,
        navReady,
        uid: !!user,
        loading,
        householdId,
      });
    }
    if (user && !householdId) {
      // Gate all routes until the user picks/creates/joins a household
      if (!onboardingRoutes.has(current as any)) {
        navRef.reset({ index: 0, routes: [{ name: "HouseholdChooser" as any }] });
        lastRouteRef.current = "HouseholdChooser";
      }
    } else if (user && householdId) {
      // Leave onboarding if we’ve completed household selection
      if (onboardingRoutes.has(current as any)) {
        // Prevent rapid flip-flop: only reset if not already on MainTabs
        if (current !== "MainTabs") {
          navRef.reset({ index: 0, routes: [{ name: "MainTabs" as any }] });
          lastRouteRef.current = "MainTabs";
        }
      }
    }
  }, [navReady, uid, householdId, loading]);
  return (
    <NavigationContainer theme={DefaultTheme} ref={navRef} linking={linking} onReady={() => setNavReady(true)}>
      <Stack.Navigator
        initialRouteName="SignIn"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.onSurface },
          headerTitle: (props) => (
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: theme.colors.onSurface }}>
              {props.children}
            </Text>
          ),
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HouseholdChooser"
          component={HouseholdChooserScreen}
          options={{ title: "Get started" }}
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
  {/** QuickActions screen replaced by inline dropdown on Home */}
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
          options={({ navigation }) => {
            const th = theme; // close over theme from component scope
            return {
              title: "Task",
              headerLeft: () =>
                navigation.canGoBack()
                  ? undefined
                  : (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Back to Today"
                        onPress={() => navRef.navigate("MainTabs")}
                        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                      >
                        <Ionicons name="chevron-back" size={22} color={th.colors.onSurface} />
                      </TouchableOpacity>
                    ),
            };
          }}
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
        <Stack.Screen
          name="Heatmap"
          component={HeatmapScreen}
          options={{ title: "Workload heatmap" }}
        />
  {/** WidgetPreview removed */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
