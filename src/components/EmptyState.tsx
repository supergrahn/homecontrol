import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../design/theme";

export default function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: theme.spacing(2),
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: "center",
      }}
    >
      <Text style={{ fontWeight: "600", color: theme.colors.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
