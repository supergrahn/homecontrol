import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function SignInScreen({ navigation }: any) {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      navigation.replace('Home');
    } catch {
      setError('Sign-in failed — try creating an account.');
    }
  };

  const signUp = async () => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
      navigation.replace('Home');
    } catch {
      setError('Sign-up failed. Check email and password.');
    }
  };

  return (
    <View style={{ flex:1, padding:24, justifyContent:'center', gap:12 }}>
      <Text style={{ fontSize:24, fontWeight:'600' }}>Welcome</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} style={{ borderWidth:1, padding:12, borderRadius:8 }} />
      <TextInput placeholder="Password" secureTextEntry value={pass} onChangeText={setPass}
        style={{ borderWidth:1, padding:12, borderRadius:8 }} />
      {error ? <Text style={{ color:'crimson' }}>{error}</Text> : null}
      <Button title="Sign in" onPress={signIn} />
      <Button title="Create account" onPress={signUp} />
    </View>
  );
}