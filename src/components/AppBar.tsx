import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/theme";

type Props = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  density?: "regular" | "compact"; // new
  bottom?: React.ReactNode; // new: area for sliding tabs/filters
  showDivider?: boolean; // new
  elevated?: boolean; // new
  alignTitle?: "center" | "left"; // new
  bottomFullBleed?: boolean; // new: edge-to-edge bottom content
};

export default function AppBar({
  title,
  left,
  right,
  density = "compact",
  bottom,
  showDivider = !!bottom,
  elevated = false,
  alignTitle = "center",
  bottomFullBleed = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const paddingX = theme.spacing(2);
  const mainRowHeight = density === "compact" ? 56 : 72; // was 88, now tighter

  return (
    <View
      style={{
        paddingTop: insets.top || 0,
        backgroundColor: theme.colors.primary,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: showDivider ? theme.colors.border : undefined,
        ...(elevated
          ? {
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }
          : null),
      }}
    >
      <View
        style={{
          height: mainRowHeight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: paddingX,
        }}
      >
        <View style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}>
          {typeof left === "string" ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={left}
            >
              <Text
                style={{ color: theme.colors.onPrimary, fontWeight: "700" }}
              >
                {left}
              </Text>
            </TouchableOpacity>
          ) : (
            left || <View />
          )}
        </View>

        <View
          style={{
            flex: 1,
            alignItems: alignTitle === "center" ? "center" : "flex-start",
            paddingLeft: alignTitle === "left" ? theme.spacing(1) : 0,
          }}
        >
          {!!title && (
            <Text
              numberOfLines={1}
              style={{
                fontWeight: "800",
                color: theme.colors.onPrimary,
                fontSize: 20,
              }}
            >
              {title}
            </Text>
          )}
        </View>

        <View
          style={{
            minWidth: 44,
            minHeight: 44,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          {right || <View />}
        </View>
      </View>

      {bottom ? (
        <View
          style={{
            paddingHorizontal: bottomFullBleed ? 0 : paddingX,
            paddingTop: 6,
            paddingBottom: 8, // small bottom padding so tabs don’t feel cramped
            backgroundColor: theme.colors.primary,
          }}
        >
          {bottom}
        </View>
      ) : null}
    </View>
  );
}
