import React from "react";
import { View, ViewStyle, Platform } from "react-native";
import { useTheme } from "../design/theme";

export default function Card({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing(2),
          ...(Platform.OS === "android"
            ? { elevation: 1 }
            : {
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
              }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
