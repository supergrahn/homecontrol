import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/theme";

type Props = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export default function AppBar({ title, left, right }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const padding = theme.spacing(2);
  return (
    <View
      style={{
        paddingTop: (insets.top || 0),
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        style={{
          height: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: padding,
        }}
      >
        <View style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          {typeof left === "string" ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={left}>
              <Text style={{ color: theme.colors.primary }}>{left}</Text>
            </TouchableOpacity>
          ) : (
            left || <View />
          )}
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          {!!title && (
            <Text
              numberOfLines={1}
              style={{ fontWeight: "600", color: theme.colors.text }}
            >
              {title}
            </Text>
          )}
        </View>
        <View style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" }}>
          {right || <View />}
        </View>
      </View>
    </View>
  );
}
