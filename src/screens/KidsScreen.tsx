import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import ChildDetailDrawer from "../components/ChildDetailDrawer";
import { appEvents } from "../events";

export default function KidsScreen() {
  const { t } = useTranslation();
  const { householdId } = useHousehold();
  const theme = useTheme();
  const [kids, setKids] = React.useState<Child[]>([]);
  // Avatar uses icon; no local name/color state needed here
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editChild, setEditChild] = React.useState<Child | null>(null);
  const [viewChild, setViewChild] = React.useState<Child | null>(null);
  const [showViewDrawer, setShowViewDrawer] = React.useState(false);
  const [schoolSummaries] = React.useState<Record<string, any>>({});
  const [loadingSummaries] = React.useState(false);
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
        <View style={{ flex: 1 }}>
          <Text
            style={{
              ...theme.typography.h2,
              color: theme.colors.onSurface,
            }}
          >
            {(t("children") as string) || "Children"}
          </Text>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 14,
              marginTop: 2,
            }}
          >
            {t("childrenHint") || "Manage your children's profiles and activities"}
          </Text>
        </View>
        <Button
          title=""
          accessibilityLabel={(t("addChild") as string) || "Add child"}
          onPress={() => setShowAddModal(true)}
          iconLeft={<Ionicons name="add" size={20} color={theme.colors.onPrimary} />}
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
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: item.color || theme.colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 2,
                  borderColor: item.hasDeviceAccess ? theme.colors.primary : theme.colors.border,
                }}
                onPress={() => {
                  setViewChild(item);
                  setShowViewDrawer(true);
                }}
              >
                {item.emoji ? (
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                ) : (
                  <Ionicons
                    name="person"
                    size={20}
                    color={theme.colors.onSurface}
                    accessibilityLabel={t("childIcon") || "Child icon"}
                  />
                )}
              </TouchableOpacity>
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
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setViewChild(item);
                      setShowViewDrawer(true);
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "600" }}>
                      {item.displayName}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      {item.age && (
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                          {t("age")} {item.age}
                        </Text>
                      )}
                      {item.hasDeviceAccess && (
                        <>
                          {item.age && <Text style={{ color: theme.colors.muted, fontSize: 12 }}> • </Text>}
                          <Ionicons
                            name="phone-portrait"
                            size={12}
                            color={theme.colors.primary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: "500" }}>
                            {t("hasDevice") || "Has device"}
                          </Text>
                        </>
                      )}
                      {item.rewardPoints && (
                        <>
                          <Text style={{ color: theme.colors.muted, fontSize: 12 }}> • </Text>
                          <Ionicons
                            name="star"
                            size={12}
                            color="#FFD700"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ color: "#FFD700", fontSize: 11, fontWeight: "500" }}>
                            {item.rewardPoints} {t("points") || "points"}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                  <Button
                    title=""
                    onPress={() => {
                      // Open edit drawer/modal without inline edit mode
                      setEditChild(item);
                      setShowAddModal(true);
                    }}
                    accessibilityLabel={(t("edit") as string) || "Edit"}
                    iconLeft={
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                    }
                    variant="ghost"
                  />
                  <Button
                    title=""
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
                    variant="ghost"
                    iconLeft={
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                    }
                  />
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View 
            style={{ 
              alignItems: "center", 
              padding: 32,
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <Ionicons
              name="people"
              size={48}
              color={theme.colors.muted}
              style={{ marginBottom: 16 }}
            />
            <Text 
              style={{ 
                color: theme.colors.text, 
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              {t("children.welcome") || "Welcome to your family organizer!"}
            </Text>
            <Text 
              style={{ 
                color: theme.colors.muted,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              {t("children.addChildrenHint") || 
               "Add your children's profiles to get started with family task management, school schedules, and reward tracking."}
            </Text>
            <Button
              title={t("addFirstChild") || "Add Your First Child"}
              onPress={() => setShowAddModal(true)}
              iconLeft={<Ionicons name="add" size={20} color={theme.colors.onPrimary} />}
            />
          </View>
        }
      />
      <AddEditChildModal
        visible={showAddModal}
        child={editChild}
        onClose={() => {
          setShowAddModal(false);
          setEditChild(null);
          setEditing(null);
        }}
        onSave={async (
          name: string,
          school: any | null,
          url: string | null
        ) => {
          if (!householdId) return;
          if (editChild) {
            // Editing existing child
            await renameChild(
              householdId,
              editChild.id,
              name.trim() || editChild.displayName,
              editChild.emoji,
              editChild.color
            );
          } else {
            // Adding new child
            await addChild(
              householdId,
              name.trim() || "Unnamed",
              undefined,
              undefined,
              school
            );
            // Fire-and-forget: if URL provided, call local crawler (dev only)
            if (url && url.startsWith("http")) {
              try {
                fetch(
                  `http://localhost:5055/crawl?url=${encodeURIComponent(url)}`
                ).catch(() => {});
              } catch {}
            }
          }
          setShowAddModal(false);
          setEditChild(null);
          setEditing(null);
          load();
          appEvents.emit("kids:changed", { hid: householdId });
        }}
      />

      {/* Child details drawer */}
      <ChildDetailDrawer
        visible={showViewDrawer}
        child={viewChild}
        summary={viewChild ? schoolSummaries[viewChild.id] : null}
  hid={householdId || undefined}
        onClose={() => {
          setShowViewDrawer(false);
          setViewChild(null);
        }}
      />
    </ScreenContainer>
  );
}
