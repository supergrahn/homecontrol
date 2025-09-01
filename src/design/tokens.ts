export const colors = {
  brand: { teal700: "#264E60", teal600: "#2E5F73", teal500: "#3B7186" },
  accent: {
    mint300: "#A9E3DA",
    seafoam400: "#7FC8BF",
    coral400: "#FF8F7E",
    gold400: "#FFC86B",
  },
  neutral: {
    ink900: "#0F1720",
    ink700: "#2A3442",
    ink400: "#6B7280",
    ink100: "#E5E7EB",
    ink050: "#F5F7FA",
    white: "#FFFFFF",
  },
  semantic: {
    primary: "#264E60",
    onPrimary: "#FFFFFF",
    success: "#1E9E6F",
    warning: "#B7791F",
    danger: "#D25353",
    info: "#7FC8BF",
  },
} as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;
export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40] as const;

export const typography = {
  family: { sans: "Inter, System" },
  scale: {
    display: { size: 32, lh: 40, weight: "800" as const },
    headline: { size: 24, lh: 32, weight: "700" as const },
    title: { size: 20, lh: 28, weight: "700" as const },
    subtitle: { size: 18, lh: 24, weight: "600" as const },
    body: { size: 16, lh: 24, weight: "500" as const },
    label: { size: 14, lh: 20, weight: "600" as const },
    caption: { size: 12, lh: 16, weight: "600" as const },
  },
} as const;
