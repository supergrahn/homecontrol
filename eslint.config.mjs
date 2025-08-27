// ESLint v9 flat config for Expo app (ESM)
// Use the dedicated flat export from eslint-config-expo
import expoFlat from "eslint-config-expo/flat.js";

export default [
  ...expoFlat,
  {
    ignores: [
      "functions/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "dist/**",
      "build/**",
    ],
  },
];
