import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

export default function KeyboardAvoidingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
