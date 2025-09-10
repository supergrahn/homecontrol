import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import CommunityTabIcon from "../../components/CommunityTabIcon";
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
import CommunityScreen from "../../screens/CommunityScreen";
import GroupsScreen from "../../screens/GroupsScreen";
import EventsScreen from "../../screens/EventsScreen";
import GroupDetailScreen from "../../screens/GroupDetailScreen";
import CreateGroupScreen from "../../screens/CreateGroupScreen";
import EventDetailScreen from "../../screens/EventDetailScreen";
import CreateEventScreen from "../../screens/CreateEventScreen";
import InvitationsScreen from "../../screens/InvitationsScreen";
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
import AppBar from "../../components/AppBar";
import {
  mark,
  measureFrom,
  measureWarnFrom,
  clearMark,
} from "../../utils/perf";

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
  // Community features
  Community: undefined;
  Groups: undefined;
  GroupDetail: { id: string };
  CreateGroup: undefined;
  Events: undefined;
  EventDetail: { id: string };
  CreateEvent: undefined;
  Invitations: undefined;
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
          Community: "community",
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
      Community: "community",
      Groups: "groups",
      GroupDetail: "group/:id",
      CreateGroup: "create-group",
      Events: "events",
      EventDetail: "event/:id",
      CreateEvent: "create-event",
      Invitations: "invitations",
      // WidgetPreview removed
    },
  },
} as const;

export function MainTabs() {
  const theme = useTheme();
  const { householdId, households } = useHousehold();
  const [outboxCount, setOutboxCount] = React.useState<number>(0);
  // Measure first render cost of tabs
  React.useEffect(() => {
    mark("tabs:mount");
    // next tick measure
    const id = setTimeout(() => {
      measureWarnFrom("tabs:mount", "tabs:firstRender", 100);
    }, 0);
    return () => clearTimeout(id);
    // measure once on mount
     
  }, []);
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
          header: ({ navigation }) => {
            // Revolutionary header: Home icon on left, title in center, actions on right
            const title = route.name === "Today" 
              ? households?.find((h) => h.id === householdId)?.name || ""
              : route.name;
            
            const Left = (
              <TouchableOpacity
                style={{ padding: 8, marginLeft: 4 }}
                accessibilityRole="button" 
                accessibilityLabel="Home"
                onPress={() => navigation.navigate("Community" as never)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="home" size={22} color="#fff" />
              </TouchableOpacity>
            );
            
            const Right = (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={{ padding: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                  onPress={() => navigation.navigate("Search" as never)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="search" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, marginRight: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  onPress={() => navigation.navigate("Settings" as never)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="settings-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            );
            
            return <AppBar title={title} left={Left} right={Right} />;
          },
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 90, // Optimized height for Community circle
            paddingBottom: 16,
            paddingTop: 12,
            paddingLeft: 0, // Remove all left padding
            paddingRight: 0, // Remove all right padding
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            borderTopWidth: 1,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            // Force even distribution with flex
            display: 'flex',
            flexDirection: 'row',
          },
          tabBarItemStyle: {
            flex: 1, // Each tab takes equal space (1/5 of total width)
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 0, // Remove item padding
            marginHorizontal: 0, // Remove item margins
          },
          tabBarIcon: ({ color, size, focused }) => {
            const name = route.name;
            
            // Revolutionary circular Community tab with seasonal Norwegian elements
            if (name === "Community") {
              return (
                <CommunityTabIcon
                  focused={focused}
                  color={color}
                  size={size}
                  activityLevel="medium" // TODO: Connect to real community activity data
                  hasNewActivity={false} // TODO: Connect to real community notifications
                />
              );
            }
            
            // Revolutionary tab icons: Discover, Kids, Community (center), Events, Groups
            const icon =
              name === "Discover"
                ? focused
                  ? "sparkles"
                  : "sparkles-outline"
                : name === "Kids"
                  ? focused
                    ? "people"
                    : "people-outline"
                  : name === "Events"
                    ? focused
                      ? "calendar"
                      : "calendar-outline"
                    : name === "Groups"
                      ? focused
                        ? "people-circle"
                        : "people-circle-outline"
                      : "ellipse-outline";
            // World-class animated tab design with enhanced theme colors
            const iconSize = size * 0.8; // Reduced to 80% size for better balance
            const iconColor = focused ? theme.colors.tabBarActive : theme.colors.tabBarInactive;
            const containerWidth = 64;
            
            // Animated values for smooth transitions
            const animatedScale = React.useRef(new Animated.Value(focused ? 1.05 : 1)).current;
            const animatedOpacity = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
            
            React.useEffect(() => {
              Animated.parallel([
                Animated.spring(animatedScale, {
                  toValue: focused ? 1.02 : 1,
                  useNativeDriver: true,
                  tension: 300,
                  friction: 20,
                }),
                Animated.timing(animatedOpacity, {
                  toValue: focused ? 1 : 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
            }, [focused]);
            
            return (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: containerWidth,
                height: 56,
                // Remove marginHorizontal to prevent left space issues
              }}>
                {/* Animated container with premium styling */}
                <Animated.View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  // Theme-aware outline for focused state
                  ...(focused && {
                    borderWidth: 1,
                    borderColor: theme.colors.background === '#0b0b0b' ? '#FFFFFF' : theme.colors.primary,
                  }),
                  transform: [{ scale: animatedScale }],
                }}>
                  <Ionicons name={icon as any} size={iconSize} color={iconColor} />
                </Animated.View>
                
                {/* Animated active indicator dot */}
                <Animated.View style={{
                  marginTop: 6,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.colors.primary,
                  opacity: animatedOpacity,
                }} />
              </View>
            );
          },
          tabBarAccessibilityLabel: route.name,
        })}
      >
        <Tab.Screen
          name="Discover"
          component={SearchScreen}
          options={{ title: "Discover" }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state: any = navigation.getState?.();
              const idx = state?.index ?? 0;
              const from =
                state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
              if (from === "Discover") return;
              pendingFromRef.current["Discover"] = from;
              mark("tab:Discover");
            },
            focus: () => {
              const from = pendingFromRef.current["Discover"] || "unknown";
              measureWarnFrom(
                "tab:Discover",
                `tab:switch:${from}->Discover`,
                100
              );
              delete pendingFromRef.current["Discover"];
            },
            blur: () => clearMark("tab:Discover"),
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
              const from =
                state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
              if (from === "Kids") return;
              pendingFromRef.current["Kids"] = from;
              mark("tab:Kids");
            },
            focus: () => {
              const from = pendingFromRef.current["Kids"] || "unknown";
              measureWarnFrom(
                "tab:Kids",
                `tab:switch:${from}->Kids`,
                100
              );
              delete pendingFromRef.current["Kids"];
            },
            blur: () => clearMark("tab:Kids"),
          })}
        />
        <Tab.Screen
          name="Community"
          component={CommunityScreen}
          options={{ title: "Community" }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              const state: any = navigation.getState?.();
              const idx = state?.index ?? 0;
              const from =
                state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
              if (from === "Community") return;
              pendingFromRef.current["Community"] = from;
              mark("tab:Community");
            },
            focus: () => {
              const from = pendingFromRef.current["Community"] || "unknown";
              measureWarnFrom("tab:Community", `tab:switch:${from}->Community`, 100);
              delete pendingFromRef.current["Community"];
            },
            blur: () => clearMark("tab:Community"),
          })}
        />
        <Tab.Screen
          name="Events"
          component={EventsScreen}
          options={{ title: "Events" }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              const state: any = navigation.getState?.();
              const idx = state?.index ?? 0;
              const from =
                state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
              if (from === "Events") return;
              pendingFromRef.current["Events"] = from;
              mark("tab:Events");
            },
            focus: () => {
              const from = pendingFromRef.current["Events"] || "unknown";
              measureWarnFrom("tab:Events", `tab:switch:${from}->Events`, 100);
              delete pendingFromRef.current["Events"];
            },
            blur: () => clearMark("tab:Events"),
          })}
        />
        <Tab.Screen
          name="Groups"
          component={GroupsScreen}
          options={{ title: "Groups" }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              const state: any = navigation.getState?.();
              const idx = state?.index ?? 0;
              const from =
                state?.routeNames?.[idx] || state?.routes?.[idx]?.name;
              if (from === "Groups") return;
              pendingFromRef.current["Groups"] = from;
              mark("tab:Groups");
            },
            focus: () => {
              const from = pendingFromRef.current["Groups"] || "unknown";
              measureWarnFrom("tab:Groups", `tab:switch:${from}->Groups`, 100);
              delete pendingFromRef.current["Groups"];
            },
            blur: () => clearMark("tab:Groups"),
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
  const [uid, setUid] = React.useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [authReady, setAuthReady] = React.useState(false);
  const lastRouteRef = React.useRef<string | undefined>(undefined);

  // React to auth state changes so gating runs after sign-in/out
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setAuthReady(true);
    });
    return unsub;
  }, []);
  React.useEffect(() => {
    if (!navReady) return;
    // Wait until auth has initialized to avoid redirect churn and SignIn flash
    if (!authReady) return;
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
    const onboardingRoutes = new Set([
      "HouseholdChooser",
      "CreateHousehold",
      "ScanInvite",
      "SignIn",
    ]);
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
        navRef.reset({
          index: 0,
          routes: [{ name: "HouseholdChooser" as any }],
        });
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
  }, [navReady, uid, householdId, loading, authReady]);
  return (
    <NavigationContainer
      theme={DefaultTheme}
      ref={navRef}
      linking={linking}
      onReady={() => setNavReady(true)}
    >
      {/** Wait for auth to be ready before mounting the navigator to avoid flashing SignIn */}
      {!authReady ? null : (
        <Stack.Navigator
          initialRouteName={(() => {
            const loggedIn = !!(uid || auth.currentUser);
            if (loggedIn) return householdId ? "MainTabs" : "HouseholdChooser";
            return "SignIn";
          })()}
          screenOptions={{
            header: ({ route, navigation, back, options }) => {
              const title = options?.title ?? route.name;
              const canGoBack = !!back || navigation.canGoBack();
              const Left = canGoBack ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={() => navigation.goBack()}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              ) : route.name === "TaskDetail" ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Back to Today"
                  onPress={() => navRef.navigate("MainTabs")}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              ) : undefined;
              return <AppBar title={String(title)} left={Left} />;
            },
            headerBackButtonDisplayMode: "minimal",
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
                  navigation.canGoBack() ? undefined : (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Back to Today"
                      onPress={() => navRef.navigate("MainTabs")}
                      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={22}
                        color={th.colors.onSurface}
                      />
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
            name="Today"
            component={HomeScreen}
            options={{ title: "Today" }}
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
          {/* Community Features */}
          <Stack.Screen
            name="Community"
            component={CommunityScreen}
            options={{ title: "Community" }}
          />
          <Stack.Screen
            name="Groups"
            component={GroupsScreen}
            options={{ title: "Grupper" }}
          />
          <Stack.Screen
            name="Events"
            component={EventsScreen}
            options={{ title: "Arrangementer" }}
          />
          <Stack.Screen
            name="GroupDetail"
            component={GroupDetailScreen}
            options={{ title: "Gruppe" }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{ title: "Opprett gruppe" }}
          />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{ title: "Arrangement" }}
          />
          <Stack.Screen
            name="CreateEvent"
            component={CreateEventScreen}
            options={{ title: "Opprett arrangement" }}
          />
          <Stack.Screen
            name="Invitations"
            component={InvitationsScreen}
            options={{ title: "Invitasjoner" }}
          />
          {/** WidgetPreview removed */}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
