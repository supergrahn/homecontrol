import React from "react";
import { ThemeProvider } from "../src/design/theme";
import { ToastProvider } from "../src/components/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

// noop test to satisfy Jest when this helper is picked up as a suite
it("helpers noop", () => {
  expect(true).toBe(true);
});
