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
    focus: string; // accent gold
    accentMint: string;
    accentSeafoam: string;
    accentCoral: string;
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
    warning: TOKENS.semantic.warning,
    error: TOKENS.semantic.danger,
    focus: TOKENS.accent.gold400,
    accentMint: TOKENS.accent.mint300,
    accentSeafoam: TOKENS.accent.seafoam400,
    accentCoral: TOKENS.accent.coral400,
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
    warning: TOKENS.semantic.warning,
    error: TOKENS.semantic.danger,
    focus: TOKENS.accent.gold400,
    accentMint: TOKENS.accent.mint300,
    accentSeafoam: TOKENS.accent.seafoam400,
    accentCoral: TOKENS.accent.coral400,
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
