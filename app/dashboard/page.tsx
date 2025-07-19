"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../supabase/client";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else {
        setUser(data.user);
        setEmail(data.user.email ?? "");
      }
    });
  }, []);

  const handleUpdateEmail = async () => {
    setMsg("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Email updated! Check your inbox.");
      setShowEmailModal(false);
    }
  };

  const handleUpdatePassword = async () => {
    setMsg("");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Password updated!");
      setShowPasswordModal(false);
      setPassword("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-16 pb-8 px-6 bg-gray-50">
        <Text className="text-2xl font-semibold text-gray-900">Dashboard</Text>
        <Text className="text-gray-500 mt-1">Manage your account</Text>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-8">
        {/* Profile Section */}
        <View className="mb-8">
          <Text className="text-lg font-medium text-gray-900 mb-4">
            Profile
          </Text>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View>
                <Text className="text-gray-900 font-medium">Email</Text>
                <Text className="text-gray-500 text-sm">{user.email}</Text>
              </View>
              <Pressable
                className="px-4 py-2 bg-gray-100 rounded-lg"
                onPress={() => setShowEmailModal(true)}>
                <Text className="text-gray-700 font-medium">Edit</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
              <View>
                <Text className="text-gray-900 font-medium">Password</Text>
                <Text className="text-gray-500 text-sm">••••••••</Text>
              </View>
              <Pressable
                className="px-4 py-2 bg-gray-100 rounded-lg"
                onPress={() => setShowPasswordModal(true)}>
                <Text className="text-gray-700 font-medium">Edit</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Message */}
        {msg ? (
          <View className="mb-6 p-4 bg-green-50 rounded-lg">
            <Text className="text-green-700 text-center">{msg}</Text>
          </View>
        ) : null}

        {/* Logout */}
        <Pressable
          className="bg-red-500 rounded-lg py-4 mt-auto"
          onPress={handleLogout}>
          <Text className="text-white text-center font-medium">Sign Out</Text>
        </Pressable>
      </View>

      {/* Email Modal */}
      <Modal visible={showEmailModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="bg-white rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            <Text className="text-xl font-semibold text-gray-900 mb-6">
              Update Email
            </Text>

            <TextInput
              className="border border-gray-200 rounded-lg p-4 mb-6 text-gray-900"
              placeholder="New email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View className="flex-row space-x-3">
              <Pressable
                className="flex-1 bg-gray-100 rounded-lg py-4"
                onPress={() => setShowEmailModal(false)}>
                <Text className="text-gray-700 text-center font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 bg-blue-500 rounded-lg py-4"
                onPress={handleUpdateEmail}
                disabled={loading}>
                <Text className="text-white text-center font-medium">
                  {loading ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="bg-white rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            <Text className="text-xl font-semibold text-gray-900 mb-6">
              Update Password
            </Text>

            <TextInput
              className="border border-gray-200 rounded-lg p-4 mb-6 text-gray-900"
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View className="flex-row space-x-3 gap-4">
              <Pressable
                className="flex-1 bg-gray-100 rounded-lg py-4"
                onPress={() => setShowPasswordModal(false)}>
                <Text className="text-gray-700 text-center font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 bg-blue-500 rounded-lg py-4"
                onPress={handleUpdatePassword}
                disabled={loading}>
                <Text className="text-white text-center font-medium">
                  {loading ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
