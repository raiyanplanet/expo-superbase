"use client";
import { AntDesign, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
    email: "",
    password: "",
  });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set()); // Track expanded posts
  const [showLogoutModal, setShowLogoutModal] = useState(false); // For logout confirmation
  const [showEditPostModal, setShowEditPostModal] = useState(false); // For editing post
  const [editPostContent, setEditPostContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

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
      // Get email from supabase.auth.getUser
      const { data } = await supabase.auth.getUser();
      setProfile(userProfile);
      if (userProfile) {
        setEditForm({
          username: userProfile.username || "",
          full_name: userProfile.full_name || "",
          bio: userProfile.bio || "",
          email: data.user?.email || "",
          password: "",
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
      // Update email if changed
      if (editForm.email && editForm.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email,
        });
        if (emailError) throw emailError;
      }
      // Update password if provided
      if (editForm.password) {
        const { error: passError } = await supabase.auth.updateUser({
          password: editForm.password,
        });
        if (passError) throw passError;
      }
      await profileApi.updateProfile(user.id, {
        username: editForm.username,
        full_name: editForm.full_name,
        bio: editForm.bio,
      });
      await loadProfile(user.id);
      setShowEditModal(false);
      setEditForm((prev) => ({ ...prev, password: "" })); // Clear password
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      console.log("✅ Logout completed");
      setShowLogoutModal(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
      setLoading(false);
      setShowLogoutModal(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await postsApi.deletePost(postId);
              // Remove the post from the local state
              setPosts(posts.filter((post) => post.id !== postId));
              Alert.alert("Success", "Post deleted successfully!");
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post");
            } finally {
              setLoading(false);
              setShowPostMenu(false);
              setSelectedPostId(null);
            }
          },
        },
      ]
    );
  };

  const openPostMenu = (postId: string) => {
    setSelectedPostId(postId);
    setShowPostMenu(true);
  };

  const openEditPostModal = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setEditingPostId(postId);
      setEditPostContent(post.content);
      setShowEditPostModal(true);
      setShowPostMenu(false);
    }
  };

  const handleEditPost = async () => {
    if (!editingPostId || !editPostContent.trim()) return;
    try {
      setLoading(true);
      await postsApi.updatePost(editingPostId, {
        content: editPostContent.trim(),
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === editingPostId
            ? { ...post, content: editPostContent.trim() }
            : post
        )
      );
      setShowEditPostModal(false);
      setEditingPostId(null);
      setEditPostContent("");
      Alert.alert("Success", "Post updated successfully!");
    } catch (error) {
      console.error("Error updating post:", error);
      Alert.alert("Error", "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to toggle expanded state for posts
  const toggleExpandPost = (postId: string) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
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
    <View className="bg-white rounded-2xl p-5 mb-4  border border-gray-50">
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center mr-4 ">
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
        <Pressable
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          onPress={() => openPostMenu(item.id)}>
          <Text className="text-gray-600 font-bold text-lg">⋯</Text>
        </Pressable>
      </View>

      {(() => {
        const MAX_LENGTH = 200;
        const isExpanded = expandedPosts.has(item.id);
        const shouldTruncate = item.content.length > MAX_LENGTH && !isExpanded;
        const displayContent = shouldTruncate
          ? item.content.slice(0, MAX_LENGTH) + "..."
          : item.content;
        return (
          <Text className="text-gray-800 mb-4 leading-6 text-xl">
            {displayContent}
            {shouldTruncate && (
              <Text
                className="text-blue-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Read More"}
              </Text>
            )}
            {isExpanded && item.content.length > MAX_LENGTH && (
              <Text
                className="text-blue-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Show Less"}
              </Text>
            )}
          </Text>
        );
      })()}

      <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
        <View className="flex-1 flex-row items-center justify-center  px-3 py-3 rounded-full mx-1   bg-blue-50">
          <AntDesign name="hearto" size={20} color="black" className="mr-2" />
          <Text className="text-md text-gray-500">{item.like_count || 0}</Text>
        </View>

        <Pressable
          className="flex-1 flex-row items-center justify-center  px-3 py-3 rounded-full mx-1  active:bg-gray-50 bg-blue-50"
          onPress={() => router.push(`../post/${item.id}`)}>
          <AntDesign name="message1" size={20} color="black" />
          <Text className="text-md text-gray-500 ml-2">
            {item.comment_count ?? 0}
          </Text>
        </Pressable>

        <Pressable
          className="bg-purple-600 px-4 py-3 rounded-full "
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
          <View className="w-28 h-28 rounded-full bg-purple-500  flex items-center justify-center mb-4 border border-white">
            <Text className="text-5xl font-bold  bg-clip-text  text-white">
              {profile.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text className="text-3xl font-bold  mb-2 text-center ">
            {profile.full_name || profile.username || "Unknown User"}
          </Text>
          <Text className="text-gray-600 text-base mb-4">
            @{profile.username}
          </Text>
          <Text className=" text-center mb-6 text-base leading-6 max-w-xs">
            {profile.bio || "No bio yet"}
          </Text>
          <View className="flex-row space-x-4 gap-3">
            <Pressable
              className="bg-purple-500 bg-opacity-20 rounded-full px-6 py-3 "
              onPress={() => setShowEditModal(true)}>
              <Text className="text-white font-bold">
                <Feather name="edit-2" size={16} color="white" /> Edit Profile
              </Text>
            </Pressable>
            <Pressable
              className={`${loading ? "bg-gray-500" : "bg-red-500 bg-opacity-90"} rounded-full px-6 py-3`}
              onPress={handleLogout}
              disabled={loading}>
              <Text className="text-white font-bold">
                <Feather name="log-out" size={16} color="white" />{" "}
                {loading ? "Logging out..." : "Logout"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View className="bg-white mx-4 -mt-6 rounded-2xl  p-6 relative z-20 border border-gray-100">
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
            <Text className="text-2xl font-bold text-purple-500">
              {totalComments}
            </Text>
            <Text className="text-gray-500 font-medium">Comments</Text>
          </View>
        </View>
      </View>

      {/* Friends Section */}
      <View className="bg-white mx-4 mt-4 rounded-2xl p-6 border border-gray-100">
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
              <Pressable
                onPress={() => router.push(`/user/${friendProfile.id}`)}
                className="items-center mr-6">
                <View className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center mb-3 ">
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
              </Pressable>
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
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-3xl p-6 w-11/12 max-h-[80%] ">
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
                  <Pressable
                    onPress={() => {
                      setShowFriendsModal(false);
                      router.push(`/user/${friendProfile.id}`);
                    }}
                    className="flex-row items-center mb-4 p-3 bg-gray-50 rounded-xl">
                    <View className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center mr-4 ">
                      <Text className="text-xl font-bold text-white">
                        {friendProfile.username?.charAt(0).toUpperCase() || "U"}
                      </Text>
                    </View>
                    <Text className="text-lg font-semibold text-gray-800">
                      {friendProfile.full_name ||
                        friendProfile.username ||
                        "Unknown"}
                    </Text>
                  </Pressable>
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
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          ListEmptyComponent={
            <View className="bg-white rounded-2xl p-12 items-center  border border-gray-100">
              <AntDesign name="filetext1" size={50} color="#9CA3AF" />
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

      {/* Post Menu Modal */}
      <Modal
        visible={showPostMenu}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowPostMenu(false)}>
        <Pressable
          className="flex-1 bg-black bg-opacity-50"
          onPress={() => setShowPostMenu(false)}>
          <View className="flex-1 justify-center items-center">
            <View className="bg-white rounded-2xl p-4 mx-6  min-w-[300px]">
              <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
                Post Options
              </Text>

              <Pressable
                className="flex-row items-center p-3 rounded-xl bg-blue-50 mb-2"
                onPress={() =>
                  selectedPostId && openEditPostModal(selectedPostId)
                }>
                <Feather
                  name="edit-2"
                  size={20}
                  className="text-blue-600 mr-3"
                />
                <Text className="text-blue-600 font-semibold">Edit Post</Text>
              </Pressable>

              <Pressable
                className="flex-row items-center p-3 rounded-xl bg-red-50 mb-2"
                onPress={() =>
                  selectedPostId && handleDeletePost(selectedPostId)
                }>
                <Feather
                  name="trash-2"
                  size={20}
                  className="text-red-600 mr-3"
                />
                <Text className="text-red-600 font-semibold">Delete Post</Text>
              </Pressable>

              <Pressable
                className="flex-row items-center p-3 rounded-xl bg-gray-100"
                onPress={() => setShowPostMenu(false)}>
                <Feather name="x" size={20} className="text-gray-600 mr-3" />
                <Text className="text-gray-600 font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="none">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white  p-6  h-screen">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-8" />

            <Text className="text-2xl font-bold mb-8 text-gray-900">
              <Feather name="edit" size={20} /> Edit Profile
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
              <TextInput
                className="border-2 border-gray-200 rounded-2xl p-4 text-base bg-gray-50 focus:border-blue-500"
                placeholder="Email"
                value={editForm.email}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, email: text }))
                }
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                className="border-2 border-gray-200 rounded-2xl p-4 text-base bg-gray-50 focus:border-blue-500"
                placeholder="New Password (leave blank to keep current)"
                value={editForm.password}
                onChangeText={(text) =>
                  setEditForm((prev) => ({ ...prev, password: text }))
                }
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="flex-row space-x-4 gap-4">
              <Pressable
                className="flex-1 bg-gray-100 rounded-2xl py-4 "
                onPress={() => setShowEditModal(false)}>
                <Text className="text-gray-700 text-center font-bold text-lg">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1  bg-purple-600 rounded-2xl py-4 "
                onPress={handleUpdateProfile}
                disabled={loading}>
                <Text className="text-white text-center font-bold text-lg">
                  {" "}
                  <AntDesign name="check" size={20} color="white" />{" "}
                  {loading ? "Updating..." : "Update"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowLogoutModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-40">
          <View className="bg-white rounded-2xl p-8 w-11/12 max-w-md items-center">
            <Text className="text-xl font-bold text-gray-900 mb-4">Logout</Text>
            <Text className="text-gray-700 mb-8 text-center">
              Are you sure you want to logout?
            </Text>
            <View className="flex-row w-full justify-between">
              <Pressable
                className="flex-1 bg-gray-200 rounded-xl py-3 mr-2"
                onPress={() => setShowLogoutModal(false)}>
                <Text className="text-gray-700 text-center font-bold text-lg">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-red-500 rounded-xl py-3 ml-2"
                onPress={confirmLogout}>
                <Text className="text-white text-center font-bold text-lg">
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={showEditPostModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowEditPostModal(false)}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-40">
          <View className="bg-white rounded-2xl p-6 w-11/12 max-w-lg">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Edit Post
            </Text>
            <TextInput
              className="border-2 border-gray-200 rounded-2xl p-4 text-base mb-4 min-h-24 max-h-56"
              placeholder="Edit your post..."
              value={editPostContent}
              onChangeText={setEditPostContent}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              autoFocus
            />
            <View className="flex-row space-x-4 mt-2">
              <Pressable
                className="flex-1 bg-gray-100 rounded-2xl py-3"
                onPress={() => setShowEditPostModal(false)}>
                <Text className="text-gray-700 text-center font-bold text-lg">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-2xl py-3 ${editPostContent.trim() ? "bg-blue-500" : "bg-gray-300"}`}
                onPress={handleEditPost}
                disabled={!editPostContent.trim() || loading}>
                <Text className="text-white text-center font-bold text-lg">
                  {loading ? "Updating..." : "Save"}
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
