"use client";
import LoadingSpinner from "@/components/Spinner";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase/client";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    console.log("=== LOGIN ATTEMPT ===");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (email.trim() === "") {
        setError("Enter valid email");
        return;
      }
      if (password.trim() === "") {
        setError("Password cannot be empty or blank");
        return;
      }

      console.log("✅ Login successful:", data.user?.email);
      console.log("📊 Session data:", !!data.session);

      // Directly navigate to feed after successful login
      console.log("🚀 Navigating to feed...");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("❌ Login exception:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-gray-50">
      <View className="mb-12 items-center justify-center">
        <Image
          source={require("../../assets/images/logo2.png")}
          className="w-24 h-24"
        />

        <Text className="text-gray-500">Login to continue</Text>
      </View>

      <View className="space-y-4">
        <TextInput
          className="mb-3 border  rounded-lg px-3 border-gray-200 py-4 text-lg text-gray-900 bg-transparent"
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <View className="relative">
          <TextInput
            className="border rounded-lg px-3 border-gray-200 py-4 text-lg text-gray-900 bg-transparent pr-10"
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <Pressable
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onPress={() => setShowPassword((prev) => !prev)}>
            {showPassword ? (
              <Ionicons name="eye-outline" size={24} color="#6B7280" />
            ) : (
              <Ionicons name="eye-off-outline" size={24} color="#6B7280" />
            )}
          </Pressable>
        </View>

        {error ? (
          <Text className="text-red-500 text-sm mt-2">{error}</Text>
        ) : null}

        <TouchableOpacity
          className={`rounded-full py-4 mt-8 ${loading ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleLogin}
          disabled={loading}>
          <Text className="text-white text-center text-lg font-medium">
            {loading ? <LoadingSpinner /> : "Sign in"}
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-600 text-center mt-5">or</Text>
        <TouchableOpacity
          onPress={() => router.replace("/register")}
          className="mt-6 bg-gray-100 rounded-full border border-gray-200 py-4 "
          disabled={loading}>
          <Text className="text-gray-600 text-center">Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
