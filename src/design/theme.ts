import React from "react";
import { useColorScheme } from "react-native";
import {
  colors as TOKENS,
  radius as RADII,
  spacing as SP,
  typography as TYPE,
} from "./tokens";

export type Theme = {
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
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
    successSurface: string;
    successBorder: string;
    warning: string;
    warningSurface: string;
    warningBorder: string;
    error: string;
    errorSurface: string;
    errorBorder: string;
    blocked: string;
    blockedSurface: string;
    blockedBorder: string;
    priority: string;
    prioritySurface: string;
    priorityBorder: string;
    tag: string;
    tagSurface: string;
    tagBorder: string;
    accepted: string;
    acceptedSurface: string;
    acceptedBorder: string;
    skeleton: string;
    focus: string; // accent gold
    accentMint: string;
    accentSeafoam: string;
    accentCoral: string;
    // Navigation-specific colors for premium experience
    tabBarActive: string;
    tabBarInactive: string;
    tabBarActiveBackground: string;
  };
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; pill?: number };
  typography: {
    h1: { fontSize: number; fontWeight: "800" | "700" | "600" | "500" };
    h2: { fontSize: number; fontWeight: "700" | "600" | "500" };
    subtitle: { fontSize: number; fontWeight: "600" | "500" };
    body: { fontSize: number; fontWeight: "500" | "400" };
    small: { fontSize: number; fontWeight: "600" | "400" };
    // POTY extras for convenience
    title?: { fontSize: number; fontWeight: any };
  };
};

const spacing = (n: number) =>
  SP[Math.max(0, Math.min(SP.length - 1, n))] || n * 8;

const light: Theme = {
  colors: {
    background: TOKENS.neutral.ink050,
    card: TOKENS.neutral.white,
    text: TOKENS.neutral.ink900,
    textSecondary: TOKENS.neutral.ink400,
    muted: TOKENS.neutral.ink400,
    primary: TOKENS.semantic.primary,
    border: TOKENS.neutral.ink100,
    surface: TOKENS.neutral.white,
    surfaceVariant: TOKENS.neutral.white,
    outline: TOKENS.neutral.ink100,
    onSurface: TOKENS.neutral.ink900,
    onPrimary: TOKENS.semantic.onPrimary,
    onEmphasis: TOKENS.neutral.white,
    success: TOKENS.semantic.success,
    successSurface: "#E6F4EA",
    successBorder: "#C8E6C9",
    warning: TOKENS.semantic.warning,
    warningSurface: "#FFF7ED",
    warningBorder: "#FFEDD5",
    error: TOKENS.semantic.danger,
    errorSurface: "#FEF2F2",
    errorBorder: "#FECACA",
    blocked: "#991B1B",
    blockedSurface: "#FEF2F2",
    blockedBorder: "#FECACA",
    priority: "#9A3412",
    prioritySurface: "#FFF7ED",
    priorityBorder: "#FFEDD5",
    tag: "#3730A3",
    tagSurface: "#EEF2FF",
    tagBorder: "#E0E7FF",
    accepted: "#2E7D32",
    acceptedSurface: "#E6F4EA",
    acceptedBorder: "#C8E6C9",
    skeleton: "#F3F4F6",
    focus: TOKENS.accent.gold400,
    accentMint: TOKENS.accent.mint300,
    accentSeafoam: TOKENS.accent.seafoam400,
    accentCoral: TOKENS.accent.coral400,
    // Enhanced navigation colors for light mode
    tabBarActive: TOKENS.neutral.white,
    tabBarInactive: TOKENS.neutral.ink700,
    tabBarActiveBackground: TOKENS.semantic.primary,
  },
  spacing,
  radius: { sm: RADII.sm, md: RADII.md, lg: RADII.lg, pill: RADII.pill },
  typography: {
    h1: { fontSize: TYPE.scale.title.size, fontWeight: "700" },
    h2: { fontSize: TYPE.scale.subtitle.size, fontWeight: "600" },
    subtitle: { fontSize: TYPE.scale.subtitle.size, fontWeight: "600" },
    body: { fontSize: TYPE.scale.body.size, fontWeight: "500" },
    small: { fontSize: TYPE.scale.caption.size, fontWeight: "600" },
    title: {
      fontSize: TYPE.scale.title.size,
      fontWeight: TYPE.scale.title.weight,
    },
  },
};

const dark: Theme = {
  colors: {
    background: "#0b0b0b",
    card: "#151515",
    text: TOKENS.neutral.white,
    textSecondary: "#9CA3AF",
    muted: TOKENS.neutral.ink400,
    primary: TOKENS.semantic.primary,
    border: "#27272a",
    surface: "#0b0b0b",
    surfaceVariant: "#111113",
    outline: "#27272a",
    onSurface: TOKENS.neutral.white,
    onPrimary: TOKENS.semantic.onPrimary,
    onEmphasis: TOKENS.neutral.white,
    success: TOKENS.semantic.success,
    successSurface: "#064e3b",
    successBorder: "#065f46",
    warning: TOKENS.semantic.warning,
    warningSurface: "#451a03",
    warningBorder: "#78350f",
    error: TOKENS.semantic.danger,
    errorSurface: "#450a0a",
    errorBorder: "#7f1d1d",
    blocked: "#f87171",
    blockedSurface: "#450a0a",
    blockedBorder: "#7f1d1d",
    priority: "#fdba74",
    prioritySurface: "#451a03",
    priorityBorder: "#78350f",
    tag: "#a5b4fc",
    tagSurface: "#1e1b4b",
    tagBorder: "#312e81",
    accepted: "#86efac",
    acceptedSurface: "#064e3b",
    acceptedBorder: "#065f46",
    skeleton: "#374151",
    focus: TOKENS.accent.gold400,
    accentMint: TOKENS.accent.mint300,
    accentSeafoam: TOKENS.accent.seafoam400,
    accentCoral: TOKENS.accent.coral400,
    // Enhanced navigation colors for dark mode
    tabBarActive: TOKENS.neutral.white,
    tabBarInactive: "#9CA3AF",
    tabBarActiveBackground: TOKENS.semantic.primary,
  },
  spacing,
  radius: { sm: RADII.sm, md: RADII.md, lg: RADII.lg, pill: RADII.pill },
  typography: {
    h1: { fontSize: TYPE.scale.title.size, fontWeight: "700" },
    h2: { fontSize: TYPE.scale.subtitle.size, fontWeight: "600" },
    subtitle: { fontSize: TYPE.scale.subtitle.size, fontWeight: "600" },
    body: { fontSize: TYPE.scale.body.size, fontWeight: "500" },
    small: { fontSize: TYPE.scale.caption.size, fontWeight: "600" },
    title: {
      fontSize: TYPE.scale.title.size,
      fontWeight: TYPE.scale.title.weight,
    },
  },
};

export const ThemeContext = React.createContext<Theme>(light);

export type ThemeMode = "system" | "light" | "dark";
export const ThemeModeContext = React.createContext<{
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}>({ mode: "system", setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = React.useState<ThemeMode>("system");
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
