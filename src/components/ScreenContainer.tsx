import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/theme";

export default function ScreenContainer({
  children,
  padding = true,
  style,
}: {
  children: React.ReactNode;
  padding?: boolean;
  style?: any;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingHorizontal: padding ? theme.spacing(2) : 0,
          // Reduce extra space at the top; keep minimal safe area
          paddingTop: Math.max(4, (insets.top || 0) - 8),
          paddingBottom: (insets.bottom || 0),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
