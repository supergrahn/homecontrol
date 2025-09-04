import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../design/theme";
import Button from "./Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AddEditChildModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, school: any | null, url: string | null) => void;
  child?: { displayName?: string } | null;
};

export default function AddEditChildModal({
  visible,
  onClose,
  onSave,
  child,
}: AddEditChildModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(child?.displayName || "");
  // When modal opens for editing, set name from child
  useEffect(() => {
    if (visible && child?.displayName) {
      setName(child.displayName);
    } else if (!visible) {
      setName("");
    }
  }, [visible, child]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResult, setSchoolResult] = useState<string | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [url, setUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [sendingGrade, setSendingGrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradesOffered, setGradesOffered] = useState<{
    min?: number;
    max?: number;
    labels?: string[];
  } | null>(null);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  // Upload disabled for now

  // Drawer animation
  const screenWidth = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(screenWidth)).current;

  useEffect(() => {
    if (visible) {
      // Reset to off-screen right and slide in
      translateX.setValue(screenWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // Prepare for next open
      translateX.setValue(screenWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenWidth]);

  const handleCloseAnimated = () => {
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // Resolve crawler base URL (env or sensible dev defaults per platform)
  const resolveCrawlerBase = () => {
    const env = (process.env as any)?.EXPO_PUBLIC_CRAWLER_BASE?.trim?.();
    if (env) return env;
    const legacy = (process.env as any)?.CRAWLER_BASE?.trim?.();
    if (legacy) return legacy;
    if (Platform.OS === "android") return "http://10.0.2.2:8000"; // Android emulator loopback
    return "http://127.0.0.1:8000"; // iOS simulator / web
  };

  // Helpers
  const getSchoolLabel = (item: any): string => {
    if (typeof item === "string") return item;
    return (
      item?.name ||
      item?.title ||
      item?.displayName ||
      String(item?.id ?? "Unknown")
    );
  };

  const buildCrawlUrl = (base: string, item: any): string => {
    const b = base.replace(/\/$/, "");
    // Prefer URL if present, else id, else name/title/displayName
    const params = new URLSearchParams();
    if (typeof item === "string") {
      params.set("school", item);
    } else if (item?.url) {
      params.set("url", String(item.url));
    } else if (item?.website) {
      params.set("url", String(item.website));
    } else if (item?.id) {
      params.set("id", String(item.id));
    } else {
      params.set("school", getSchoolLabel(item));
    }
    return `${b}/crawl?${params.toString()}`;
  };

  // Search schools using the Python API
  const searchSchool = async () => {
    setSearching(true);
    setError(null);
    try {
      const base = resolveCrawlerBase();
      const url = `${base.replace(/\/$/, "")}/school-search?query=${encodeURIComponent(
        schoolSearch
      )}`;
      if (__DEV__) console.log("[crawler] GET", url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const schools = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.schools)
          ? (data as any).schools
          : Array.isArray((data as any)?.results)
            ? (data as any).results
            : data && typeof data === "object"
              ? [data]
              : [];
      setSchoolOptions(schools);
      setSelectedSchool(null);
      setSchoolResult(null);
      if (schools.length === 0) {
        setSchoolResult(null);
        setError(t("noSchoolFound"));
      }
    } catch (e) {
      if (__DEV__) console.error("[crawler] school-search failed", e);
      setError(t("searchFailed"));
    }
    setSearching(false);
  };

  const crawlSelected = async (item: any) => {
    try {
      setCrawling(true);
      const base = resolveCrawlerBase();
      const crawlUrl = buildCrawlUrl(base, item);
      if (__DEV__) console.log("[crawler] GET", crawlUrl);
      const res = await fetch(crawlUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      const grades = (data as any)?.grades_offered || null;
      if (grades && (Array.isArray(grades.labels) || grades.min != null)) {
        setGradesOffered(grades);
        const labels: string[] = Array.isArray(grades.labels)
          ? grades.labels
          : (() => {
              const min = Number.isFinite(grades.min) ? Number(grades.min) : 1;
              const max = Number.isFinite(grades.max)
                ? Number(grades.max)
                : min;
              const arr: string[] = [];
              for (let g = min; g <= max; g++) arr.push(String(g));
              return arr;
            })();
        setGradeOptions(labels);
      } else {
        setGradesOffered(null);
        setGradeOptions([]);
      }
    } catch (e) {
      if (__DEV__) console.error("[crawler] crawl failed", e);
      setError(t("crawlFailed") || "Crawl failed");
    } finally {
      setCrawling(false);
    }
  };

  const sendSelectedGrade = async (gradeLabel: string) => {
    if (!selectedSchool) return;
    try {
      setSendingGrade(true);
      const base = resolveCrawlerBase();
      const url = `${base.replace(/\/$/, "")}/crawl/grade`;
      const payload: any = {
        school: selectedSchool,
        grade: {
          label: gradeLabel,
          min: gradesOffered?.min ?? null,
          max: gradesOffered?.max ?? null,
        },
      };
      if (__DEV__) console.log("[crawler] POST", url, payload);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      if (__DEV__) console.error("[crawler] send grade failed", e);
      setError(t("crawlFailed") || "Grade send failed");
    } finally {
      setSendingGrade(false);
    }
  };

  const onSelectSchool = (item: any) => {
    setSelectedSchool(item);
    const label = getSchoolLabel(item);
    setSchoolResult(label);
    setError(null);
    setGradesOffered(null);
    setGradeOptions([]);
    setSelectedGrade(null);
    // Fire-and-forget crawl when a school is chosen
    crawlSelected(item);
  };

  const handleSave = async () => {
    try {
      // Pass back selected school; grade will be captured as part of the school object meta when available
      // Include selectedGrade inside school for persistence if present
      const schoolWithGrade = selectedSchool
        ? {
            ...selectedSchool,
            __selectedGrade: selectedGrade,
            __grades: gradesOffered,
          }
        : null;
      await onSave(name, schoolWithGrade, url);
    } finally {
      // Clear fields after save
      setName("");
      setSchoolSearch("");
      setSchoolResult(null);
      setSelectedSchool(null);
      setGradesOffered(null);
      setGradeOptions([]);
      setSelectedGrade(null);
      setUrl("");
      setError(null);
      // Close drawer after successful save
      handleCloseAnimated();
      // upload status reset (unused while upload disabled)
    }
  };

  // pickAndUpload removed (upload disabled)

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.colors.surface,
                transform: [{ translateX }],
                paddingTop: 20 + insets.top,
                paddingRight: 20 + insets.right,
                paddingBottom: 20 + insets.bottom,
                paddingLeft: 20 + insets.left,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* Header with left close and centered title */}
              <View style={{ marginBottom: 16, position: "relative", minHeight: 44, justifyContent: "center" }}>
                <TouchableOpacity
                  accessibilityLabel={t("close") || "Close"}
                  onPress={handleCloseAnimated}
                  style={[
                    styles.closeButton,
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      padding: 12, // larger tap target
                    },
                  ]}
                >
                  <Text style={[styles.closeText, { color: theme.colors.onSurface }]}>×</Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.onSurface,
                      textAlign: "center",
                      marginBottom: 0,
                      position: "absolute",
                      left: 0,
                      right: 0,
                    },
                  ]}
                >
                  {child ? (t("editChild") || "Edit Child") : (t("addChild") || "Add Child")}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
                placeholderTextColor={theme.colors.muted}
                placeholder={t("name") || "Name"}
                value={name}
                onChangeText={setName}
                onBlur={() => Keyboard.dismiss()}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
                placeholderTextColor={theme.colors.muted}
                placeholder={t("searchSchool") || "Search school"}
                value={schoolSearch}
                onChangeText={setSchoolSearch}
                onBlur={() => Keyboard.dismiss()}
              />
              <Button
                title={
                  searching
                    ? t("searching") || "Searching…"
                    : t("search") || "Search"
                }
                onPress={searchSchool}
                disabled={searching || !schoolSearch}
              />
              {schoolOptions.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 8 }}>
                  <Text
                    style={[
                      styles.result,
                      { color: theme.colors.text, fontWeight: "600" },
                    ]}
                  >
                    {t("selectSchool") || "Select a school"}
                  </Text>
                  {schoolOptions.map((item, idx) => {
                    const label = getSchoolLabel(item);
                    const locality = (item as any)?.address?.locality || "";
                    const selected =
                      selectedSchool === item || schoolResult === label;
                    return (
                      <TouchableOpacity
                        key={`${label}-${idx}`}
                        onPress={() => onSelectSchool(item)}
                        style={[
                          styles.option,
                          {
                            borderColor: selected
                              ? theme.colors.primary
                              : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.card
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontWeight: "600",
                          }}
                        >
                          {label}
                        </Text>
                        {!!locality && (
                          <Text style={{ color: theme.colors.muted }}>
                            {locality}
                          </Text>
                        )}
                        {selected && (
                          <Text style={{ color: theme.colors.muted }}>
                            {crawling
                              ? t("crawling") || "Crawling…"
                              : t("selected") || "Selected"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {gradesOffered && gradeOptions.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text
                        style={[
                          styles.result,
                          { color: theme.colors.text, fontWeight: "600" },
                        ]}
                      >
                        {t("selectGrade") || "Select a grade"}
                      </Text>
                      {gradeOptions.map((g, i) => {
                        const isSel = selectedGrade === g;
                        return (
                          <TouchableOpacity
                            key={`${g}-${i}`}
                            onPress={() => {
                              setSelectedGrade(g);
                              sendSelectedGrade(g);
                            }}
                            style={[
                              styles.option,
                              {
                                borderColor: isSel
                                  ? theme.colors.primary
                                  : theme.colors.border,
                                backgroundColor: isSel
                                  ? theme.colors.card
                                  : theme.colors.surface,
                              },
                            ]}
                          >
                            <Text style={{ color: theme.colors.text }}>
                              {g}
                            </Text>
                            {isSel && (
                              <Text style={{ color: theme.colors.muted }}>
                                {sendingGrade
                                  ? t("sending") || "Sending…"
                                  : t("selected") || "Selected"}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
              {schoolResult && (
                <Text style={[styles.result, { color: theme.colors.text }]}>
                  {schoolResult}
                </Text>
              )}
              {error && (
                <Text style={[styles.error, { color: theme.colors.error }]}>
                  {error}
                </Text>
              )}
              {/* Upload document to Python parser */}
              {/** Upload disabled for now; URL field hidden */}
              {/**
          {!schoolResult && (
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
              placeholderTextColor={theme.colors.muted}
              placeholder={
                t("pasteSchoolUrl") || "Paste school/class/grade URL"
              }
              value={url}
              onChangeText={setUrl}
            />
          )}
          */}
              <View style={styles.actions}>
                <Button
                  title={t("save") || "Save"}
                  onPress={handleSave}
                  disabled={!name}
                />
                <Button
                  title={t("cancel") || "Cancel"}
                  onPress={handleCloseAnimated}
                  variant="link"
                />
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%", // full-screen drawer
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    left: 12, // upper left corner
    zIndex: 10,
    padding: 8,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  result: {
    marginBottom: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  error: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
