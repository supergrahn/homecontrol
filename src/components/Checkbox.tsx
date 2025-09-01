import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "../design/theme";

export default function Checkbox({
  checked,
  onToggle,
  size = 24,
}: {
  checked?: boolean;
  onToggle?: (v: boolean) => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      onPress={() => onToggle?.(!checked)}
      activeOpacity={0.8}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? theme.colors.primary : theme.colors.muted,
        backgroundColor: checked ? theme.colors.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked ? (
        <View
          style={{
            width: size * 0.5,
            height: size * 0.5,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: theme.colors.onPrimary,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      ) : null}
    </TouchableOpacity>
  );
}
