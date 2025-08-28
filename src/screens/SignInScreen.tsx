import React from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
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
import { getDocs, collection } from "firebase/firestore";

export default function SignInScreen({ navigation }: any) {
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const { t } = useTranslation();

  const signIn = async () => {
    setError(null);
    if (!email.trim()) return setError("auth.invalidEmail");
    if (!pass) return setError("auth.weakPassword");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
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
    }
  };

  const signUp = async () => {
    setError(null);
    if (!email.trim()) return setError("auth.invalidEmail");
    if (!pass || pass.length < 6) return setError("auth.weakPassword");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: "center",
            gap: 12,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 24, fontWeight: "600" }}>{t("title")}</Text>
          <TextInput
            placeholder={t("email")}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
            returnKeyType="next"
          />
          <TextInput
            placeholder={t("password")}
            secureTextEntry
            value={pass}
            onChangeText={setPass}
            style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
            returnKeyType="done"
            onSubmitEditing={signIn}
          />
          {error ? <Text style={{ color: "crimson" }}>{t(error)}</Text> : null}
          <Button title={t("signIn")} onPress={signIn} />
          <Button title={t("createAccount")} onPress={signUp} />
          <View style={{ height: 8 }} />
          <Button title={t("forgotPassword")} onPress={forgot} />
          <View style={{ height: 8 }} />
          <Button title={t("signOut")} onPress={doSignOut} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
