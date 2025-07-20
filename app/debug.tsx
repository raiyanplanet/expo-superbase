"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../supabase/client";

export default function Debug() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      // Check Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setDebugInfo({
        supabaseSession: !!session,
        currentUser: user?.email,
        sessionUser: session?.user?.email,
        sessionExpires: session?.expires_at
          ? new Date(session.expires_at * 1000).toLocaleString()
          : "N/A",
      });
    } catch (error) {
      console.error("Debug info error:", error);
      setDebugInfo({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const clearAllData = async () => {
    try {
      await supabase.auth.signOut();
      Alert.alert("Success", "All data cleared");
      loadDebugInfo();
    } catch (error) {
      Alert.alert("Error", "Failed to clear data");
    }
  };

  const goToLogin = () => {
    router.replace("/login");
  };

  const goToFeed = () => {
    router.replace("/(tabs)");
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold mb-6 text-center">🔧 Debug Info</Text>

      <View className="bg-white rounded-lg p-4 mb-4">
        <Text className="text-lg font-semibold mb-3">
          Authentication Status
        </Text>

        {Object.entries(debugInfo).map(([key, value]) => (
          <View
            key={key}
            className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-600">{key}:</Text>
            <Text className="font-medium">{String(value)}</Text>
          </View>
        ))}
      </View>

      <View className="space-y-3">
        <Pressable
          className="bg-blue-500 rounded-lg p-4"
          onPress={loadDebugInfo}>
          <Text className="text-white text-center font-semibold">
            🔄 Refresh Debug Info
          </Text>
        </Pressable>

        <Pressable className="bg-green-500 rounded-lg p-4" onPress={goToLogin}>
          <Text className="text-white text-center font-semibold">
            🔑 Go to Login
          </Text>
        </Pressable>

        <Pressable className="bg-purple-500 rounded-lg p-4" onPress={goToFeed}>
          <Text className="text-white text-center font-semibold">
            🏠 Go to Feed
          </Text>
        </Pressable>

        <Pressable className="bg-red-500 rounded-lg p-4" onPress={clearAllData}>
          <Text className="text-white text-center font-semibold">
            🗑️ Clear All Data
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
