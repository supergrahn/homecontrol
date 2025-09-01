import React from "react";
import { TouchableOpacity, Text, ViewStyle } from "react-native";
import { useTheme } from "../design/theme";

export default function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const bg = selected ? theme.colors.primary : theme.colors.accentMint;
  const color = selected ? theme.colors.onPrimary : theme.colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Text style={{ color, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}
