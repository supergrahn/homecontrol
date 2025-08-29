import React from "react";
import { View, Text } from "react-native";
import Button from "../components/Button";
import { useTranslation } from "react-i18next";
import ScreenContainer from "../components/ScreenContainer";
import { useTheme } from "../design/theme";

export default function HouseholdChooserScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <ScreenContainer style={{ paddingHorizontal: 16 }}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text, marginBottom: 12 }}>
          {t("noHouseholdTitle") || "Get started"}
        </Text>
        <Text style={{ color: theme.colors.muted, marginBottom: 16 }}>
          {t("noHouseholdSubtitle") || "Create a new household or join an existing one."}
        </Text>
        <View style={{ gap: 12 }}>
          <Button
            title={(t("createHousehold") as string) || "Create Household"}
            onPress={() => navigation.navigate("CreateHousehold")}
          />
          <Button
            title={(t("joinHousehold") as string) || "Join Household"}
            onPress={() => navigation.navigate("ScanInvite")}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
