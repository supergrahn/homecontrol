// Global API base for the Python crawler service
// Uses EXPO_PUBLIC_CRAWLER_BASE when available, with sensible emulator/simulator fallbacks.
import { Platform } from "react-native";

export const API_BASE: string = (() => {
  const env = (process.env as any)?.EXPO_PUBLIC_CRAWLER_BASE?.trim?.();
  if (env) return env.replace(/\/$/, "");
  const legacy = (process.env as any)?.CRAWLER_BASE?.trim?.();
  if (legacy) return legacy.replace(/\/$/, "");
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://127.0.0.1:8000";
})();

export function buildSchoolKey(school: any): string {
  if (!school || typeof school !== "object") return String(school ?? "");
  return (
    school.url ||
    school.website ||
    school.id ||
    school.name ||
    school.title ||
    school.displayName ||
    JSON.stringify(school)
  );
}
