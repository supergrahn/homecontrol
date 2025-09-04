import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../design/theme";
import { useHousehold } from "../firebase/providers/HouseholdProvider";
import {
  listChildren,
  addChild,
  renameChild,
  deleteChild,
  type Child,
} from "../services/children";
import ScreenContainer from "../components/ScreenContainer";
import Input from "../components/Input";
import Button from "../components/Button";
import AddEditChildModal from "../components/AddEditChildModal";
import { appEvents } from "../events";

export default function KidsScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const [kids, setKids] = React.useState<Child[]>([]);
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("🙂");
  const [color, setColor] = React.useState("#FDE68A");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [schoolSummaries, setSchoolSummaries] = React.useState<
    Record<string, any>
  >({});
  const [loadingSummaries, setLoadingSummaries] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!householdId) return setKids([]);
    setKids(await listChildren(householdId));
  }, [householdId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenContainer>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            ...theme.typography.h2,
            color: theme.colors.onSurface,
          }}
        >
          {(t("kids") as string) || "Kids"}
        </Text>
        <Button
          title={(t("addChild") as string) || "Add child"}
          onPress={() => setShowAddModal(true)}
        />
      </View>
      {/* School summary for each child */}
      {kids.map((kid: Child) => {
        const summary = schoolSummaries[kid.id];
        if (!summary) return null;
        return (
          <View
            key={kid.id}
            style={{
              marginBottom: 16,
              backgroundColor: theme.colors.card,
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
              {kid.displayName} – {t("tomorrowSummary") || "Tomorrow's summary"}
            </Text>
            {summary.error ? (
              <Text style={{ color: theme.colors.error }}>
                {t("schoolSummaryError") || "Could not fetch school info."}
              </Text>
            ) : (
              <>
                {summary.anomalies && summary.anomalies.length > 0 && (
                  <Text
                    style={{ color: theme.colors.warning, marginBottom: 4 }}
                  >
                    {t("anomalies") || "Anomalies"}:{" "}
                    {summary.anomalies.join(", ")}
                  </Text>
                )}
                {summary.schedule && summary.schedule.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {t("schedule") || "Schedule"}:
                    </Text>
                    {summary.schedule.map((item: any, idx: number) => (
                      <Text key={idx} style={{ marginLeft: 8 }}>
                        {item.time} – {item.subject}{" "}
                        {item.homework
                          ? `(${t("homework") || "Homework"}: ${item.homework})`
                          : ""}
                      </Text>
                    ))}
                  </View>
                )}
                {summary.links && summary.links.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {t("documents") || "Documents"}:
                    </Text>
                    {summary.links.map((link: any, idx: number) => (
                      <Text
                        key={idx}
                        style={{
                          color: theme.colors.primary,
                          textDecorationLine: "underline",
                        }}
                        onPress={() => {}}
                      >
                        {link.title || link.url}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        );
      })}
      {loadingSummaries && (
        <Text style={{ color: theme.colors.muted }}>
          {t("loading") || "Loading…"}
        </Text>
      )}
      <FlatList
        data={kids}
        keyExtractor={(item: Child) => item.id}
        renderItem={({ item }: { item: Child }) => {
          const isEditing = editing === item.id;
          return (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: item.color || theme.colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 16 }}>{item.emoji || "🙂"}</Text>
              </View>
              {isEditing ? (
                <>
                  <Input
                    value={editName}
                    onChangeText={setEditName}
                    containerStyle={{ flex: 1 }}
                  />
                  <Button
                    title={(t("save") as string) || "Save"}
                    accessibilityLabel={(t("save") as string) || "Save"}
                    accessibilityHint={
                      (t("hint.saveChanges") as string) || "Saves your edits."
                    }
                    onPress={async () => {
                      if (!householdId) return;
                      await renameChild(
                        householdId,
                        item.id,
                        editName.trim() || item.displayName,
                        item.emoji,
                        item.color
                      );
                      setEditing(null);
                      load();
                      appEvents.emit("kids:changed", { hid: householdId });
                    }}
                  />
                  <Button
                    title={(t("cancel") as string) || "Cancel"}
                    accessibilityLabel={(t("cancel") as string) || "Cancel"}
                    accessibilityHint={
                      (t("hint.cancelEdit") as string) || "Cancels editing."
                    }
                    onPress={() => setEditing(null)}
                    variant="link"
                  />
                </>
              ) : (
                <>
                  <Text style={{ flex: 1, color: theme.colors.text }}>
                    {item.displayName}
                  </Text>
                  <Button
                    title={(t("edit") as string) || "Edit"}
                    onPress={() => {
                      setEditing(item.id);
                      setEditName(item.displayName);
                    }}
                  />
                  <Button
                    title={(t("delete") as string) || "Delete"}
                    accessibilityLabel={(t("delete") as string) || "Delete"}
                    accessibilityHint={
                      (t("hint.deleteChild") as string) ||
                      "Deletes this child profile."
                    }
                    onPress={async () => {
                      if (!householdId) return;
                      await deleteChild(householdId, item.id);
                      load();
                      appEvents.emit("kids:changed", { hid: householdId });
                    }}
                    variant="outline"
                  />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "flex-start", gap: 8 }}>
            <Text style={{ color: theme.colors.muted }}>
              {(t("noKidsYet") as string) || "No kids yet."}
            </Text>
          </View>
        }
      />
      <AddEditChildModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (
          name: string,
          school: any | null,
          url: string | null
        ) => {
          if (!householdId) return;
          // Persist child profile with selected school if provided
          const childId = await addChild(
            householdId,
            name.trim() || "Unnamed",
            undefined,
            undefined,
            school
          );
          // Fire-and-forget: if URL provided, call local crawler (dev only)
          if (url && url.startsWith("http")) {
            try {
              // Expect a local dev server to proxy to Python crawler
              fetch(
                `http://localhost:5055/crawl?url=${encodeURIComponent(url)}`
              ).catch(() => {});
            } catch {}
          }
          setShowAddModal(false);
          load();
          // Notify other screens (Home) to refresh kid list
          appEvents.emit("kids:changed", { hid: householdId });
        }}
      />
    </ScreenContainer>
  );
}
