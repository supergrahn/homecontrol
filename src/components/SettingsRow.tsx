import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";

export default function SettingsRow({
  label,
  value,
  right,
  onPress,
  style,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[
        {
          minHeight: 56,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {right ? (
          right
        ) : value ? (
          <Text style={{ color: theme.colors.muted }}>{value}</Text>
        ) : null}
        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.muted}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
