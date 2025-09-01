import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
  Modal,
  Dimensions,
  Pressable,
} from "react-native";
import { useTheme } from "../design/theme";

export type Option<T = string | number> = {
  label: string;
  value: T;
};

type Props<T = string | number> = {
  options: Option<T>[];
  value?: T | null;
  onChange: (v: T) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  testID?: string;
  onOpen?: () => void;
  onClose?: () => void;
};

export default function Select<T extends string | number = string | number>({
  options,
  value,
  onChange,
  placeholder,
  containerStyle,
  testID,
  onOpen,
  onClose,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = React.useRef<View | null>(null);
  // Simple bus to close other Selects when one opens
  const idRef = React.useRef<string>(Math.random().toString(36).slice(2));
  type Listener = (id: string) => void;
  // Keep listeners in module scope
  // @ts-ignore
  if (!(globalThis as any).__selectListeners) {
    // @ts-ignore
    (globalThis as any).__selectListeners = new Set<Listener>();
  }
  const listeners: Set<Listener> = (globalThis as any).__selectListeners;
  const publishOpen = React.useCallback(
    (id: string) => {
      listeners.forEach((fn) => fn(id));
    },
    [listeners]
  );
  React.useEffect(() => {
    const listener: Listener = (otherId) => {
      if (otherId !== idRef.current) {
        setOpen((prev) => {
          if (prev) onClose?.();
          return false;
        });
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listeners]);
  const selected = options.find((o) => o.value === value);

  return (
    <View
      ref={triggerRef}
      style={[{ width: "100%", position: "relative" }, containerStyle]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        testID={testID}
        onPress={() =>
          setOpen((prev) => {
            const next = !prev;
            if (next) {
              publishOpen(idRef.current);
              onOpen?.();
              // Measure trigger position to place dropdown via Modal overlay
              setTimeout(() => {
                try {
                  (triggerRef.current as any)?.measureInWindow(
                    (x: number, y: number, w: number, h: number) => {
                      setAnchor({ x, y, width: w, height: h });
                    }
                  );
                } catch {}
              }, 0);
            } else {
              onClose?.();
            }
            return next;
          })
        }
        style={[
          styles.field,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ color: selected ? theme.colors.text : theme.colors.muted }}
        >
          {selected ? selected.label : placeholder || ""}
        </Text>
        <Text
          style={{
            position: "absolute",
            right: 10,
            top: 12,
            color: theme.colors.muted,
          }}
        >
          ▼
        </Text>
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="none">
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            setOpen(false);
            onClose?.();
          }}
        >
          <View pointerEvents="box-none" style={{ flex: 1 }}>
            {(() => {
              const win = Dimensions.get("window");
              const horizMargin = 10;
              const maxDrop = 240;
              if (!anchor) {
                // Fallback placement: near top with safe margins
                const width = Math.min(260, win.width - horizMargin * 2);
                const left = (win.width - width) / 2;
                const top = 100;
                return (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        position: "absolute",
                        left,
                        top,
                        width,
                        maxHeight: maxDrop,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.card,
                      },
                    ]}
                  >
                    <ScrollView
                      keyboardShouldPersistTaps="always"
                      showsVerticalScrollIndicator
                      persistentScrollbar
                      style={{ maxHeight: maxDrop }}
                    >
                      {options.map((o) => (
                        <TouchableOpacity
                          key={String(o.value)}
                          onPress={() => {
                            onChange(o.value);
                            setOpen(false);
                            onClose?.();
                          }}
                          testID={
                            testID ? `${testID}-option-${o.value}` : undefined
                          }
                          style={styles.option}
                        >
                          <Text style={{ color: theme.colors.text }}>
                            {o.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                );
              }
              const belowSpace = win.height - (anchor.y + anchor.height) - 16;
              const aboveSpace = anchor.y - 16;
              const placeBelow =
                belowSpace >= Math.min(maxDrop, 140) ||
                belowSpace >= aboveSpace;
              const maxHeight = placeBelow
                ? Math.min(maxDrop, belowSpace)
                : Math.min(maxDrop, aboveSpace);
              const width = Math.min(anchor.width, win.width - horizMargin * 2);
              let left = Math.max(
                horizMargin,
                Math.min(anchor.x, win.width - horizMargin - width)
              );
              const top = placeBelow
                ? anchor.y + anchor.height
                : Math.max(16, anchor.y - maxHeight);
              return (
                <View
                  style={[
                    styles.dropdown,
                    {
                      position: "absolute",
                      left,
                      top,
                      width,
                      maxHeight,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator
                    persistentScrollbar
                    style={{ maxHeight }}
                  >
                    {options.map((o) => (
                      <TouchableOpacity
                        key={String(o.value)}
                        onPress={() => {
                          onChange(o.value);
                          setOpen(false);
                          onClose?.();
                        }}
                        testID={
                          testID ? `${testID}-option-${o.value}` : undefined
                        }
                        style={styles.option}
                      >
                        <Text style={{ color: theme.colors.text }}>
                          {o.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 28, // room for chevron
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 240,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
});
