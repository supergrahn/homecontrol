import React from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "../design/theme";

type Props = TextInputProps & {
  label?: string;
  errorText?: string | null;
  right?: React.ReactNode;
  containerStyle?: ViewStyle;
};

const Input = React.forwardRef<RNTextInput, Props>(
  (
    {
      label,
      errorText,
      style,
      right,
      editable = true,
      containerStyle,
      ...rest
    },
    ref
  ) => {
    const theme = useTheme();
    const [focused, setFocused] = React.useState(false);
    const borderColor = focused ? theme.colors.focus : theme.colors.border;
    const borderWidth = focused ? 3 : 1;
    const bg = editable ? theme.colors.card : theme.colors.surfaceVariant;

    return (
      <View style={[{ width: "100%" }, containerStyle]}>
        {label ? (
          <Text style={{ marginBottom: 6, color: theme.colors.onSurface }}>
            {label}
          </Text>
        ) : null}
        <View
          style={[
            styles.field,
            { borderColor, borderWidth, backgroundColor: bg },
          ]}
        >
          <RNTextInput
            ref={ref}
            style={[styles.input, { color: theme.colors.text }, style as any]}
            placeholderTextColor={theme.colors.muted}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            editable={editable}
            {...rest}
          />
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {errorText ? (
          <Text style={{ color: theme.colors.error, marginTop: 6 }}>
            {errorText}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: "relative",
  },
  input: {
    padding: 0,
    margin: 0,
  },
  right: {
    position: "absolute",
    right: 6,
    top: 6,
  },
});

export default Input;
