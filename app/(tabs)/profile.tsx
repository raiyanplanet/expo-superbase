"use client";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { friendsApi, postsApi, profileApi } from "../../lib/api";
import { Friend, Post, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";

export default function ProfileTab() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    bio: "",
  });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      await Promise.all([
        loadProfile(data.user.id),
        loadUserPosts(data.user.id),
        loadUserFriends(data.user.id),
      ]);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const loadProfile = async (userId: string) => {
    try {
      const userProfile = await profileApi.getProfile(userId);
      setProfile(userProfile);
      if (userProfile) {
        setEditForm({
          username: userProfile.username || "",
          full_name: userProfile.full_name || "",
          bio: userProfile.bio || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadUserPosts = async (userId: string) => {
    try {
      const userPosts = await postsApi.getUserPosts(userId);
      setPosts(userPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadUserFriends = async (userId: string) => {
    try {
      const friendsList = await friendsApi.getFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([loadProfile(user.id), loadUserPosts(user.id)]);
    }
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await profileApi.updateProfile(user.id, editForm);
      await loadProfile(user.id);
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log("=== SIMPLE LOGOUT ATTEMPT ===");
    await supabase.auth.signOut();
    console.log("✅ Logout completed");
    // The auth state change listener in _layout.tsx will handle navigation
  };

  // Calculate total likes and comments
  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.like_count || 0),
    0
  );
  const totalComments = posts.reduce(
    (sum, post) => sum + (post.comment_count || 0),
    0
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-lg shadow-gray-200 border border-gray-50">
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center mr-4 shadow-md">
          <Text className="text-lg font-bold text-white">
            {item.username?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-base">
            {item.full_name || item.username || "Unknown User"}
          </Text>
          <Text className="text-gray-500 text-sm">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      <Text className="text-gray-800 mb-4 leading-6 text-base">
        {item.content}
      </Text>

      <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
        <View className="flex-row items-center bg-red-50 px-3 py-2 rounded-full">
          <Text className="text-red-500 mr-2">❤️</Text>
          <Text className="text-red-600 font-semibold">
            {item.like_count || 0}
          </Text>
        </View>

        <View className="flex-row items-center bg-blue-50 px-3 py-2 rounded-full">
          <Text className="text-blue-500 mr-2">💬</Text>
          <Text className="text-blue-600 font-semibold">
            {item.comment_count || 0}
          </Text>
        </View>

        <Pressable
          className="bg-purple-600 px-4 py-2 rounded-full shadow-sm"
          onPress={() => router.push(`/post/${item.id}` as any)}>
          <Text className="text-white font-semibold text-sm">View Post</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!user || !profile) return null;

  return (
    <ScrollView
      className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Profile Header */}
      <View className="bg-gradient-to-br from-blue-600 to-purple-700 pt-16 pb-8 px-6 relative">
        <View className="absolute inset-0 " />
        <View className="items-center relative z-10">
          <View className="w-28 h-28 rounded-full bg-purple-500 shadow-2xl flex items-center justify-center mb-4 border border-white">
            <Text className="text-5xl font-bold  bg-clip-text  text-white">
              {profile.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-3xl font-bold  mb-2 text-center shadow-sm">
            {profile.full_name || profile.username || "Unknown User"}
          </Text>
          <Text className=" text-center mb-6 text-base leading-6 max-w-xs">
            {profile.bio || "No bio yet"}
          </Text>
          <View className="flex-row space-x-4 gap-3">
            <Pressable
              className="bg-purple-500 bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg"
              onPress={() => setShowEditModal(true)}>
              <Text className="text-white font-bold">✏️ Edit Profile</Text>
            </Pressable>
            <Pressable
              className="bg-red-500 bg-opacity-90 rounded-full px-6 py-3 shadow-lg"
              onPress={handleLogout}>
              <Text className="text-white font-bold">🚪 Logout</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View className="bg-white mx-4 -mt-6 rounded-2xl shadow-xl p-6 relative z-20 border border-gray-100">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {posts.length}
            </Text>
            <Text className="text-gray-500 font-medium">Posts</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-500">
              {totalLikes}
            </Text>
            <Text className="text-gray-500 font-medium">Likes</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-500">
              {friends.length}
            </Text>
            <Text className="text-gray-500 font-medium">Friends</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-purple-500">
              {totalComments}
            </Text>
            <Text className="text-gray-500 font-medium">Comments</Text>
          </View>
        </View>
      </View>

      {/* Friends Section */}
      <View className="bg-white mx-4 mt-4 rounded-2xl shadow-lg p-6 border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-900">
            Friends ({friends.length})
          </Text>
          {friends.length > 3 && (
            <Pressable
              className="bg-blue-100 px-4 py-2 rounded-full"
              onPress={() => setShowFriendsModal(true)}>
              <Text className="text-blue-600 font-semibold">View All</Text>
            </Pressable>
          )}
        </View>
        <FlatList
          data={friends.slice(0, 3)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const friendProfile =
              item.requester_id === user.id
                ? item.addressee_profile
                : item.requester_profile;
            if (!friendProfile) return null;
            return (
              <View className="items-center mr-6">
                <View className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mb-3 shadow-md">
                  <Text className="text-2xl font-bold text-white">
                    {friendProfile.username?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <Text
                  className="text-sm font-semibold text-center max-w-[64px] text-gray-700"
                  numberOfLines={1}>
                  {friendProfile.full_name ||
                    friendProfile.username ||
                    "Unknown"}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-4xl mb-2">👥</Text>
              <Text className="text-gray-400 text-center">No friends yet</Text>
              <Text className="text-gray-300 text-sm text-center mt-1">
                Connect with others to build your network!
              </Text>
            </View>
          }
        />
      </View>

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-6 w-11/12 max-h-[80%] shadow-2xl">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">
                All Friends ({friends.length})
              </Text>
              <Pressable
                className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center"
                onPress={() => setShowFriendsModal(false)}>
                <Text className="text-gray-600 font-bold text-lg">×</Text>
              </Pressable>
            </View>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const friendProfile =
                  item.requester_id === user.id
                    ? item.addressee_profile
                    : item.requester_profile;
                if (!friendProfile) return null;
                return (
                  <View className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-xl">
                    <View className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center mr-4 shadow-sm">
                      <Text className="text-xl font-bold text-white">
                        {friendProfile.username?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">
                      {friendProfile.full_name ||
                        friendProfile.username ||
                        "Unknown"}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-6xl mb-4">😊</Text>
                  <Text className="text-gray-400 text-xl">No friends yet</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Posts Section */}
      <View className="mx-4 mt-4">
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg border border-gray-100">
          <Text className="text-xl font-bold text-gray-900">📝 My Posts</Text>
        </View>
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          ListEmptyComponent={
            <View className="bg-white rounded-2xl p-12 items-center shadow-lg border border-gray-100">
              <Text className="text-6xl mb-4">📱</Text>
              <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
                No posts yet
              </Text>
              <Text className="text-gray-400 text-center leading-6">
                Share your thoughts and connect with friends! Create your first
                post in the Feed tab.
              </Text>
            </View>
          }
        />
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-8" />

            <Text className="text-2xl font-bold mb-8 text-gray-900">
              ✏️ Edit Profile
            </Text>

            <View className="space-y-4 mb-8 gap-3">
              <TextInput
                className="border-2 border-gray-200 rounded-2xl p-4 text-base  focus:border-blue-500"
                placeholder="Username"
                value={editForm.username}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, username: text }))
                }
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                className="border-2 border-gray-200 rounded-2xl p-4 text-base bg-gray-50 focus:border-blue-500"
                placeholder="Full Name"
                value={editForm.full_name}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, full_name: text }))
                }
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                className="border-2 border-gray-200 rounded-2xl p-4 text-base bg-gray-50 focus:border-blue-500"
                placeholder="Tell us about yourself..."
                value={editForm.bio}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, bio: text }))
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="flex-row space-x-4 gap-4">
              <Pressable
                className="flex-1 bg-gray-100 rounded-2xl py-4 shadow-sm"
                onPress={() => setShowEditModal(false)}>
                <Text className="text-gray-700 text-center font-bold text-lg">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1  bg-purple-600 rounded-2xl py-4 shadow-lg"
                onPress={handleUpdateProfile}
                disabled={loading}>
                <Text className="text-white text-center font-bold text-lg">
                  {loading ? "⏳ Updating..." : "✨ Update"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View className="h-6" />
    </ScrollView>
  );
}
