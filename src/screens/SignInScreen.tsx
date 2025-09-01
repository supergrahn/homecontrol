import React from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Image,
} from "react-native";
import { auth, db } from "../firebase";
import { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { useTranslation } from "react-i18next";
import { useTheme } from "../design/theme";
import Input from "../components/Input";
import Button from "../components/Button";
import { setUserDisplayName } from "../services/user";
import KeyboardAvoidingWrapper from "../components/KeyboardAvoidingWrapper";
import { mark, measureFrom } from "../utils/perf";
import { getDocs, collection } from "firebase/firestore";

export default function SignInScreen({ navigation }: any) {
  React.useEffect(() => {
    mark("auth:screen:mount");
  }, []);
  const theme = useTheme();
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);
  const passRef = React.useRef<any>(null);
  const nameRef = React.useRef<any>(null);
  const [yourName, setYourName] = React.useState("");
  const { t } = useTranslation();

  const signIn = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    if (!email.trim()) return setError("auth.invalidEmail");
    if (!pass) return setError("auth.weakPassword");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      measureFrom("auth:screen:mount", "auth:signInToMainTabs");
      // Let NavigationProvider gating decide, but provide a fast path hint for fresh accounts
      navigation.replace("MainTabs");
    } catch (e) {
      const err = e as FirebaseError;
      const code = err.code;
      console.error("[auth] signIn failed:", code, err.message);
      if (__DEV__ && Platform.OS !== "web") {
        // Helps when nothing prints in console on device
        Alert.alert("Sign-in error", `${code}: ${err.message}`);
      }
      switch (code) {
        case "auth/invalid-email":
          setError("auth.invalidEmail");
          break;
        case "auth/user-disabled":
          setError("auth.userDisabled");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("auth.badCredentials");
          break;
        case "auth/network-request-failed":
          setError("auth.networkError");
          break;
        case "auth/too-many-requests":
          setError("auth.tooManyRequests");
          break;
        default:
          setError("signInFailed");
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    if (!email.trim()) return setError("auth.invalidEmail");
    if (!pass || pass.length < 6) return setError("auth.weakPassword");
    if (!yourName.trim()) return setError("validation.nameRequired");
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass
      );
      // Save displayName immediately for downstream flows (memberships, invites)
      try {
        await setUserDisplayName(yourName.trim());
      } catch {}
      // Check if the user is already a member of any household
      const qs = await getDocs(collection(db, "households"));
      const uid = cred.user.uid;
      let hasMembership = false;
      for (const d of qs.docs) {
        const m = await getDocs(collection(db, `households/${d.id}/members`));
        if (m.docs.find((x) => x.id === uid)) {
          hasMembership = true;
          break;
        }
      }
      measureFrom("auth:screen:mount", "auth:signUpToNext");
      navigation.replace(hasMembership ? "MainTabs" : "CreateHousehold");
    } catch (e) {
      const err = e as FirebaseError;
      const code = err.code;
      console.error("[auth] signUp failed:", code, err.message);
      if (__DEV__ && Platform.OS !== "web") {
        Alert.alert("Sign-up error", `${code}: ${err.message}`);
      }
      switch (code) {
        case "auth/email-already-in-use":
          setError("auth.emailAlreadyInUse");
          break;
        case "auth/invalid-email":
          setError("auth.invalidEmail");
          break;
        case "auth/weak-password":
          setError("auth.weakPassword");
          break;
        case "auth/operation-not-allowed":
        case "auth/configuration-not-found":
          setError("auth.operationNotAllowed");
          break;
        case "auth/network-request-failed":
          setError("auth.networkError");
          break;
        case "auth/too-many-requests":
          setError("auth.tooManyRequests");
          break;
        default:
          setError("signUpFailed");
      }
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!email.trim()) return setError("auth.invalidEmail");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("auth.resetEmailSent");
    } catch (e) {
      const code = (e as FirebaseError).code;
      console.error("[auth] reset failed:", code);
      if (code === "auth/invalid-email") setError("auth.invalidEmail");
      else setError("auth.networkError");
    }
  };

  const doSignOut = async () => {
    try {
      await signOut(auth);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingWrapper>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand header */}
            <View
              style={{
                width: "100%",
                maxWidth: 480,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "800",
                    color: theme.colors.text,
                  }}
                >
                  {t("title")}
                </Text>
              </View>
              <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                {t("signInSubtitle") || "Welcome back. Please sign in."}
              </Text>
            </View>

            {/* Form */}
            <View style={{ width: "100%", maxWidth: 480 }}>
              <Input
                placeholder={t("email")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                onSubmitEditing={() => nameRef.current?.focus?.()}
                accessibilityLabel={t("email") || "Email"}
                testID="emailInput"
              />

              {/* Your name (used when creating an account) */}
              <Input
                ref={nameRef}
                placeholder={t("yourName") || "Your name"}
                value={yourName}
                onChangeText={setYourName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus?.()}
                accessibilityLabel={t("yourName") || "Your name"}
                testID="yourNameInput"
              />
              <Text
                style={{
                  color: theme.colors.muted,
                  marginTop: -4,
                  marginBottom: 8,
                }}
              >
                {t("yourNameHint") ||
                  "Shown to your household; you can change it later."}
              </Text>

              <View style={{ position: "relative" }}>
                <Input
                  ref={passRef}
                  placeholder={t("password")}
                  secureTextEntry={!showPass}
                  value={pass}
                  onChangeText={setPass}
                  textContentType="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={signIn}
                  accessibilityLabel={t("password") || "Password"}
                  testID="passwordInput"
                  right={
                    <TouchableOpacity
                      onPress={() => setShowPass((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPass
                          ? t("hidePassword") || "Hide password"
                          : t("showPassword") || "Show password"
                      }
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "600",
                        }}
                      >
                        {showPass ? t("hide") || "Hide" : t("show") || "Show"}
                      </Text>
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  onPress={forgot}
                  style={{
                    position: "absolute",
                    right: 8,
                    bottom: -30,
                    padding: 4,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("forgotPassword")}
                >
                  <Text style={{ color: theme.colors.primary }}>
                    {t("forgotPassword")}
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                  {t(error)}
                </Text>
              ) : null}

              <View style={{ height: 12 }} />
              <Button
                testID="signInButton"
                title={loading ? "…" : (t("signIn") as string)}
                onPress={signIn}
                disabled={loading || !email.trim() || !pass}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <TouchableOpacity onPress={signUp} accessibilityRole="button">
                  <Text
                    style={{ color: theme.colors.primary, fontWeight: "600" }}
                  >
                    {t("createAccount")}
                  </Text>
                </TouchableOpacity>
                {/* Forgot link moved near password field */}
              </View>

              {/* Optional sign out for debugging */}
              <View style={{ height: 16 }} />
              <Button
                title={t("signOut")}
                onPress={doSignOut}
                variant="outline"
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  );
}
