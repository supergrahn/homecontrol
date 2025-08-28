import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { createTask } from "../services/tasks";
import { auth } from "../firebase";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import { addChecklistItem } from "../services/checklist";
import { useNavigation } from "@react-navigation/native";

// use selected household from context

const templates: Record<string, string[]> = {
  Birthday: [
    "Pick date & budget",
    "Guest list",
    "Order cake",
    "Buy gifts",
    "Decorations",
    "Thank-you notes",
  ],
  "Day Trip": [
    "Pack lunch",
    "Spare clothes",
    "Buckets & spades",
    "Sunscreen",
    "Water bottles",
    "Towels",
  ],
  "Season Change: Winter": [
    "Measure feet",
    "Buy winter boots",
    "Label clothes",
    "Pack extra mittens",
    "Check jacket size",
  ],
};

export default function TemplatesScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const navigation = useNavigation<any>();
  const addTemplate = async (name: string) => {
    if (!householdId) return;
    const createdBy = auth.currentUser?.uid || "unknown";
    const taskId = await createTask(householdId, {
      title: name,
      type: "checklist",
      createdBy,
    });
    for (const label of templates[name]) {
      await addChecklistItem(householdId, taskId, label);
    }
    Alert.alert(
      t("templateCreated"),
      t("templateAdded", { name, count: templates[name].length }),
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        {t("templates")}
      </Text>
      <View style={{ marginBottom: 8 }}>
        <Button
          title={(t("manageTemplates") as string) || "Manage templates"}
          onPress={() => navigation.navigate("ManageTemplates")}
        />
      </View>
      {Object.keys(templates).map((k) => (
        <View key={k} style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>{k}</Text>
          <Button
            title={t("add")}
            onPress={() => addTemplate(k)}
            disabled={!householdId}
          />
        </View>
      ))}
    </View>
  );
}
