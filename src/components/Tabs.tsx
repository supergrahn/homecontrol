import React from "react";
import { View, TouchableOpacity, Text, ViewStyle } from "react-native";
import { useTheme } from "../design/theme";

export default function Tabs({
  items,
  value,
  onChange,
  style,
  even,
}: {
  items: string[];
  value: number;
  onChange: (i: number) => void;
  style?: ViewStyle;
  even?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {items.map((it, i) => {
        const selected = i === value;
        return (
          <TouchableOpacity
            key={it}
            onPress={() => onChange(i)}
            activeOpacity={0.9}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              ...(even ? { flex: 1, alignItems: "center" } : null),
            }}
          >
            <View
              style={{
                backgroundColor: selected
                  ? theme.colors.primary
                  : "transparent",
                borderRadius: theme.radius.lg,
                paddingVertical: 8,
                paddingHorizontal: 12,
                ...(even
                  ? { alignSelf: "stretch", alignItems: "center" }
                  : null),
              }}
            >
              <Text
                style={{
                  color: selected ? theme.colors.onPrimary : theme.colors.text,
                  fontWeight: "700",
                  textAlign: "center",
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {it}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
