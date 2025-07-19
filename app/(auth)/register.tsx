"use client";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else router.replace("/dashboard/page");
  };

  return (
    <View className="flex-1 justify-center px-4 bg-white">
      <Text className="text-2xl font-bold mb-4">Register Fadebook</Text>
      <TextInput
        className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="text-red-500 mb-2">{error}</Text> : null}
      <TouchableOpacity
        className="bg-gray-900 rounded-lg py-4 mt-8"
        onPress={handleRegister}>
        <Text className="text-white text-center">Register</Text>
      </TouchableOpacity>
      <Pressable onPress={() => router.replace("/login")} className="mt-4">
        <Text className=" text-center">
          Already have an account? <Text className="font-bold">Login</Text>
        </Text>
      </Pressable>
    </View>
  );
}
