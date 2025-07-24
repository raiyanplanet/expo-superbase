"use client";
import LoadingSpinner from "@/components/Spinner";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleRegister = async () => {
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (!username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(
        "Username must be 3-20 characters, letters, numbers, or underscores"
      );
      setLoading(false);
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
      setLoading(false);
      return;
    }
    const { data: emailExists } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (emailExists) {
      setError("Email already registered");
      setLoading(false);
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
        setLoading(false);
        return;
      }

      console.log("✅ Registration successful:", data.user?.email);
      setLoading(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Registration exception:", error);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    router.replace("/login");
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

            <View className="relative mb-3">
              <TextInput
                className="border rounded-lg px-3 border-gray-200 py-3 text-lg text-gray-900 bg-transparent pr-10"
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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

            <View className="relative mb-3">
              <TextInput
                className="border rounded-lg px-3 border-gray-200 py-3 text-lg text-gray-900 bg-transparent pr-10"
                placeholder="Confirm Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
              className="bg-blue-600 rounded-full py-4 mt-8"
              onPress={handleRegister}
              disabled={loading}>
              <Text className="text-white text-center text-lg font-medium">
                {loading ? <LoadingSpinner /> : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <Pressable
              onPress={() => router.replace("/login")}
              className="mt-6">
              <Text className="text-gray-600 text-center">
                Already have an account?{" "}
                <Text className="text-blue-600 font-medium">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 mx-8 max-w-sm w-full">
            <View className="items-center mb-4">
              <View className="bg-green-100 rounded-full p-3 mb-3">
                <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              </View>
              <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
                Account Created Successfully!
              </Text>
              <Text className="text-gray-600 text-center">
                Please check your email to verify your account before signing
                in.
              </Text>
            </View>

            <TouchableOpacity
              className="bg-blue-600 rounded-full py-3 mt-4"
              onPress={handleModalClose}>
              <Text className="text-white text-center text-lg font-medium">
                Continue to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
