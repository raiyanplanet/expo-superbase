"use client";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase/client";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(
        "Username must be 3-20 characters, letters, numbers, or underscores"
      );
      return;
    }

    // Check if username or email already exists
    const { data: usernameExists } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (usernameExists) {
      setError("Username already taken");
      return;
    }
    const { data: emailExists } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (emailExists) {
      setError("Email already registered");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            username: username,
          },
        },
      });

      if (error) {
        console.error("❌ Registration error:", error);
        setError(error.message);
        return;
      }

      console.log("✅ Registration successful:", data.user?.email);
      Alert.alert(
        "Success",
        "Account created! Please check your email to verify your account."
      );
      router.replace("/login");
    } catch (error) {
      console.error("❌ Registration exception:", error);
      setError("An unexpected error occurred");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8 bg-gray-50">
          <View className="mb-12 items-center justify-center">
            <Image
              source={require("../../assets/images/logo2.png")}
              className="w-24 h-24"
            />

            <Text className="text-gray-500">Create your account</Text>
          </View>

          <TextInput
            className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
            placeholder="Name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
            placeholder="Username"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <View className="space-y-4">
            <TextInput
              className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              className="mb-3 border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              className="border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {error ? (
              <Text className="text-red-500 text-sm mt-2">{error}</Text>
            ) : null}

            <TouchableOpacity
              className="bg-purple-600 rounded-lg py-4 mt-8"
              onPress={handleRegister}>
              <Text className="text-white text-center text-lg font-medium">
                Create Account
              </Text>
            </TouchableOpacity>

            <Pressable
              onPress={() => router.replace("/login")}
              className="mt-6">
              <Text className="text-gray-600 text-center">
                Already have an account?{" "}
                <Text className="text-purple-600 font-medium">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
