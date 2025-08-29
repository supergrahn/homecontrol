import React from "react";
import { View, Alert } from "react-native";
import Button from "./Button";
import { httpsCallable, getFunctions } from "firebase/functions";
import { firebaseApp } from "../firebase";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeMode } from "../design/theme";
import { refreshNextUpWidget } from "../services/widgets";

export default function DevToolbar() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { householdId } = useHousehold();
  const { mode, setMode } = useThemeMode();

  const toggleLang = () => {
    const next = i18n.language === "no" ? "en" : "no";
    void i18n.changeLanguage(next);
  };

  const reloadI18n = async () => {
    await i18n.reloadResources();
    await i18n.changeLanguage(i18n.language);
  };

  const runDigestNow = async () => {
    try {
      if (!householdId) {
        Alert.alert("Household", "Select or create a household first.");
        return;
      }
      const fn = httpsCallable(getFunctions(firebaseApp), "runDigestNow");
      await fn({ householdId });
      Alert.alert("OK", "Digest triggered");
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  const runNightBeforeNow = async () => {
    try {
      if (!householdId) {
        Alert.alert("Household", "Select or create a household first.");
        return;
      }
      const fn = httpsCallable(getFunctions(firebaseApp), "runNightBeforeNow");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      const date = `${yyyy}-${mm}-${dd}`;
      const res = await fn({ householdId, date, dryRun: false });
      Alert.alert("Night-before", JSON.stringify(res.data));
    } catch (e) {
      Alert.alert("Night-before Error", String(e));
    }
  };

  const runHealthCheck = async () => {
    try {
      const fn = httpsCallable(getFunctions(firebaseApp), "healthCheck");
      const res = await fn({});
      Alert.alert("Health", JSON.stringify(res.data));
    } catch (e) {
      Alert.alert("Health Error", String(e));
    }
  };

  const runHeatmapParity = async () => {
    try {
      if (!householdId) {
        Alert.alert("Household", "Select or create a household first.");
        return;
      }
      const fn = httpsCallable(getFunctions(firebaseApp), "checkHeatmapParity");
      const res: any = await fn({
        householdId,
        rangeDays: 7,
        types: ["upcoming", "blocked"],
      });
      const { ok, diff } = res.data || {};
      if (ok) {
        Alert.alert("Heatmap parity", "OK: no diffs");
      } else {
        const entries = Object.entries(diff || {}).slice(0, 10);
        const preview = entries
          .map(([k, v]: any) => `${k}: base=${v.base} agg=${v.agg}`)
          .join("\n");
        Alert.alert(
          "Heatmap parity",
          preview || "Differences found (see logs)"
        );
        console.log("Heatmap parity diff", diff);
      }
    } catch (e) {
      Alert.alert("Heatmap parity Error", String(e));
    }
  };

  const runHeatmapParityAll = async () => {
    try {
      if (!householdId) {
        Alert.alert("Household", "Select or create a household first.");
        return;
      }
      const fn = httpsCallable(getFunctions(firebaseApp), "checkHeatmapParity");
  const combos: { rangeDays: number; types: string[] }[] = [
        { rangeDays: 7, types: ["upcoming"] },
        { rangeDays: 7, types: ["blocked"] },
        { rangeDays: 7, types: ["upcoming", "blocked"] },
        { rangeDays: 14, types: ["upcoming", "blocked"] },
        { rangeDays: 30, types: ["upcoming"] },
      ];
      const results: string[] = [];
      for (const c of combos) {
        const res: any = await fn({
          householdId,
          rangeDays: c.rangeDays,
          types: c.types,
        });
        const ok = !!res?.data?.ok;
        const diffCount = Object.keys(res?.data?.diff || {}).length;
        results.push(
          `${c.rangeDays}d ${c.types.join("+")}: ${ok ? "OK" : `${diffCount} diffs`}`
        );
        if (!ok) console.log("Heatmap parity diff", c, res?.data?.diff);
      }
      Alert.alert("Heatmap parity (all)", results.join("\n"));
    } catch (e) {
      Alert.alert("Heatmap parity Error", String(e));
    }
  };

  const refreshWidget = async () => {
    try {
      if (!householdId) {
        Alert.alert("Household", "Select or create a household first.");
        return;
      }
      const payload = await refreshNextUpWidget(householdId);
      Alert.alert(
        "Widget",
        `Next up updated with ${payload.tasks.length} items`
      );
    } catch (e) {
      Alert.alert("Widget Error", String(e));
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: (insets.bottom || 0) + 8,
        right: (insets.right || 0) + 8,
        gap: 6,
        flexDirection: "row",
        zIndex: 1000,
        elevation: 10,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button
          title={`Theme: ${mode}`}
          onPress={() => setMode(mode === "system" ? "dark" : mode === "dark" ? "light" : "system")}
          variant="outline"
        />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button
          title={`Lang: ${i18n.language.toUpperCase()}`}
          onPress={toggleLang}
          variant="outline"
        />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
  <Button title="Reload i18n" onPress={reloadI18n} variant="outline" />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
  <Button title="Run digest" onPress={runDigestNow} variant="outline" />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
  <Button title="Night-before" onPress={runNightBeforeNow} variant="outline" />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
  <Button title="Refresh widget" onPress={refreshWidget} variant="outline" />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
  <Button title="Health" onPress={runHealthCheck} variant="outline" />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button
          title="Heatmap parity"
          onPress={runHeatmapParity}
          variant="outline"
        />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button
          title="Heatmap parity: all"
          onPress={runHeatmapParityAll}
          variant="outline"
        />
      </View>
    </View>
  );
}
