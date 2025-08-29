import React from "react";
import { useColorScheme } from "react-native";

export type Theme = {
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    primary: string;
    border: string;
    // semantic roles
    surface: string;
    surfaceVariant: string;
    outline: string;
    onSurface: string;
  onPrimary: string;
  onEmphasis: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number };
  typography: {
    h1: { fontSize: number; fontWeight: "700" | "600" | "500" };
    h2: { fontSize: number; fontWeight: "700" | "600" | "500" };
    subtitle: { fontSize: number; fontWeight: "600" | "500" };
    body: { fontSize: number; fontWeight: "400" | "500" };
    small: { fontSize: number; fontWeight: "400" };
  };
};

const spacing = (n: number) => n * 8;

const light: Theme = {
  colors: {
    background: "#ffffff",
    card: "#f7f7f7",
    text: "#111111",
    muted: "#6b7280",
    primary: "#0a84ff",
    border: "#e5e7eb",
    surface: "#ffffff",
    surfaceVariant: "#f3f4f6",
    outline: "#e5e7eb",
    onSurface: "#111111",
  onPrimary: "#000000",
  onEmphasis: "#000000",
    success: "#16a34a",
    warning: "#ca8a04",
    error: "#dc2626",
  },
  spacing,
  radius: { sm: 6, md: 12, lg: 16 },
  typography: {
    h1: { fontSize: 22, fontWeight: "700" },
    h2: { fontSize: 18, fontWeight: "600" },
    subtitle: { fontSize: 16, fontWeight: "600" },
    body: { fontSize: 14, fontWeight: "400" },
    small: { fontSize: 12, fontWeight: "400" },
  },
};

const dark: Theme = {
  colors: {
    background: "#0b0b0b",
    card: "#151515",
    text: "#f5f5f5",
    muted: "#9ca3af",
    primary: "#0a84ff",
    border: "#27272a",
    surface: "#0b0b0b",
    surfaceVariant: "#111113",
    outline: "#27272a",
    onSurface: "#f5f5f5",
  onPrimary: "#000000",
  onEmphasis: "#ffffff",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
  },
  spacing,
  radius: { sm: 6, md: 12, lg: 16 },
  typography: {
    h1: { fontSize: 22, fontWeight: "700" },
    h2: { fontSize: 18, fontWeight: "600" },
    subtitle: { fontSize: 16, fontWeight: "600" },
    body: { fontSize: 14, fontWeight: "400" },
    small: { fontSize: 12, fontWeight: "400" },
  },
};

export const ThemeContext = React.createContext<Theme>(light);

type ThemeMode = "system" | "light" | "dark";
export const ThemeModeContext = React.createContext<{
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}>({ mode: "system", setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = React.useState<ThemeMode>("dark");
  const resolved = mode === "system" ? system : mode;
  const value = resolved === "dark" ? dark : light;
  return React.createElement(
    ThemeModeContext.Provider,
    { value: { mode, setMode } },
    React.createElement(ThemeContext.Provider, { value }, children as any)
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function useThemeMode() {
  return React.useContext(ThemeModeContext);
}
