import React from "react";
import { TouchableOpacity, Text, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../design/theme";

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost" | "link";
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

export default function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
  textStyle,
  iconLeft,
  iconRight,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: Props) {
  const theme = useTheme();
  const base: ViewStyle = {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    opacity: disabled ? 0.6 : 1,
  };
  const styles: Record<string, ViewStyle> = {
    primary: { backgroundColor: theme.colors.primary },
    outline: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: "transparent",
    },
    ghost: { backgroundColor: "transparent" },
    link: {
      backgroundColor: "transparent",
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
  };
  const color =
    variant === "primary" ? theme.colors.onPrimary : theme.colors.primary;
  const textBase: TextStyle = { color, fontWeight: "600" };
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      style={[base, styles[variant], style]}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
    >
      {iconLeft}
      <Text style={[textBase, textStyle]}>{title}</Text>
      {iconRight}
    </TouchableOpacity>
  );
}
