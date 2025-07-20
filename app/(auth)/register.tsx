"use client";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
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
  const [confirmPassword, setConfirmPassword] = useState("");
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
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Registration error:', error);
        setError(error.message);
        return;
      }
      
      console.log('✅ Registration successful:', data.user?.email);
      Alert.alert("Success", "Account created! Please check your email to verify your account.");
      router.replace("/login");
      
    } catch (error) {
      console.error('❌ Registration exception:', error);
      setError('An unexpected error occurred');
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-gray-50">
      <View className="mb-12">
        <Text className="text-3xl font-light text-gray-900 mb-2">
          Join Fadebook
        </Text>
        <Text className="text-gray-500">Create your account</Text>
      </View>

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
          className="border border-b rounded-md px-3 border-gray-200 pb-3 text-lg text-gray-900 bg-transparent"
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
          className="bg-gray-900 rounded-lg py-4 mt-8"
          onPress={handleRegister}>
          <Text className="text-white text-center text-lg font-medium">
            Create Account
          </Text>
        </TouchableOpacity>

        <Pressable onPress={() => router.replace("/login")} className="mt-6">
          <Text className="text-gray-600 text-center">
            Already have an account?{" "}
            <Text className="text-gray-900 font-medium">Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
