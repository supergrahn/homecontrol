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
  };
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number };
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
  },
  spacing,
  radius: { sm: 6, md: 12, lg: 16 },
};

const dark: Theme = {
  colors: {
    background: "#0b0b0b",
    card: "#151515",
    text: "#f5f5f5",
    muted: "#9ca3af",
    primary: "#0a84ff",
    border: "#27272a",
  },
  spacing,
  radius: { sm: 6, md: 12, lg: 16 },
};

export const ThemeContext = React.createContext<Theme>(light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = scheme === "dark" ? dark : light;
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
