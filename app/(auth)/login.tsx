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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else router.replace("/dashboard/page");
  };

  return (
    <View className="flex-1 justify-center px-8 bg-gray-50">
      <View className="mb-12">
        <Text className="text-3xl font-light text-gray-900 mb-2">
          Welcome To Fadebook
        </Text>
        <Text className="text-gray-500">Sign in to continue</Text>
      </View>

      <View className="space-y-4 ">
        <TextInput
          className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          className="border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text className="text-red-500 text-sm mt-2">{error}</Text>
        ) : null}

        <TouchableOpacity
          className="bg-gray-900 rounded-lg py-4 mt-8"
          onPress={handleLogin}>
          <Text className="text-white text-center text-lg font-medium">
            Sign in
          </Text>
        </TouchableOpacity>

        <Pressable onPress={() => router.replace("/register")} className="mt-6">
          <Text className="text-gray-600 text-center">
            Dont have an account?{" "}
            <Text className="text-gray-900 font-medium">Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
