import React from "react";
import { View, Button } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DevToolbar() {
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const toggleLang = () => {
    const next = i18n.language === "no" ? "en" : "no";
    void i18n.changeLanguage(next);
  };

  const reloadI18n = async () => {
    await i18n.reloadResources();
    await i18n.changeLanguage(i18n.language);
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: (insets.bottom || 0) + 8,
        right: (insets.right || 0) + 8,
        gap: 6,
        flexDirection: "row",
        zIndex: 1000,
        elevation: 10,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button
          title={`Lang: ${i18n.language.toUpperCase()}`}
          onPress={toggleLang}
          color="#fff"
        />
      </View>
      <View
        style={{
          backgroundColor: "#0009",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Button title="Reload i18n" onPress={reloadI18n} color="#fff" />
      </View>
    </View>
  );
}
