import React from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../design/theme";

type ToastType = "success" | "error" | "info";

type ToastOptions = { type?: ToastType; duration?: number };

type ToastContextValue = {
  show: (message: string, opts?: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState<ToastType>("info");
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translate = React.useRef(new Animated.Value(20)).current;
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback(
    (msg: string, opts?: ToastOptions) => {
      setMessage(msg);
      setType(opts?.type ?? "info");
      setVisible(true);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translate, {
            toValue: 20,
            duration: 180,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, opts?.duration ?? 2500);
    },
    [opacity, translate],
  );

  const value = React.useMemo(() => ({ show }), [show]);

  const theme = useTheme();
  const bg =
    type === "error" ? theme.colors.error : type === "success" ? theme.colors.success : theme.colors.muted;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: (insets.bottom || 0) + 20,
            left: 16,
            right: 16,
            alignItems: "center",
            opacity,
            transform: [{ translateY: translate }],
          }}
        >
          <View
            style={{
              backgroundColor: bg,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              maxWidth: "90%",
            }}
          >
            <Text style={{ color: theme.colors.onEmphasis }}>{message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
