"use client";
import { AntDesign, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { friendsApi, messagesApi, postsApi, profileApi } from "../../lib/api";
import { Post, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";

export default function UserDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<
    "none" | "friends" | "pending" | "sent"
  >("none");
  const [friendId, setFriendId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set()); // Track expanded posts

  const loadUserData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(data.user);
      await Promise.all([
        loadUserProfile(id),
        loadUserPosts(id),
        checkFriendStatus(data.user.id, id),
        loadLastMessage(data.user.id, id),
      ]);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await profileApi.getProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadUserPosts = async (userId: string) => {
    try {
      const posts = await postsApi.getUserPosts(userId);
      setUserPosts(posts);
    } catch (error) {
      console.error("Error loading user posts:", error);
    }
  };

  const loadLastMessage = async (userId: string, friendId: string) => {
    try {
      const messages = await messagesApi.getMessages(userId, friendId);
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
      }
    } catch (error) {
      console.error("Error loading last message:", error);
    }
  };

  const checkFriendStatus = async (
    currentUserId: string,
    targetUserId: string
  ) => {
    try {
      // Check if they are friends
      const friends = await friendsApi.getFriends(currentUserId);
      const isFriend = friends.some(
        (friend) =>
          (friend.requester_id === targetUserId &&
            friend.addressee_id === currentUserId) ||
          (friend.requester_id === currentUserId &&
            friend.addressee_id === targetUserId)
      );

      if (isFriend) {
        setFriendStatus("friends");
        const friend = friends.find(
          (friend) =>
            (friend.requester_id === targetUserId &&
              friend.addressee_id === currentUserId) ||
            (friend.requester_id === currentUserId &&
              friend.addressee_id === targetUserId)
        );
        if (friend) setFriendId(friend.id);
        return;
      }

      // Check if there's a pending request from them
      const requests = await friendsApi.getFriendRequests(currentUserId);
      const pendingRequest = requests.find(
        (request) => request.requester_id === targetUserId
      );
      if (pendingRequest) {
        setFriendStatus("pending");
        setFriendId(pendingRequest.id);
        return;
      }

      // Check if we sent them a request
      const sentRequests = await friendsApi.getFriendRequests(targetUserId);
      const sentRequest = sentRequests.find(
        (request) => request.requester_id === currentUserId
      );
      if (sentRequest) {
        setFriendStatus("sent");
        setFriendId(sentRequest.id);
        return;
      }

      setFriendStatus("none");
    } catch (error) {
      console.error("Error checking friend status:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !userProfile) return;

    try {
      await friendsApi.sendFriendRequest(currentUser.id, {
        addressee_id: userProfile.id,
      });
      setFriendStatus("sent");
      Alert.alert("Success", "Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendId) return;

    try {
      await friendsApi.acceptFriendRequest(friendId);
      setFriendStatus("friends");
      Alert.alert("Success", "Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async () => {
    if (!friendId) return;

    try {
      await friendsApi.rejectFriendRequest(friendId);
      setFriendStatus("none");
      setFriendId(null);
      Alert.alert("Success", "Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendId) return;

    Alert.alert(
      "Remove Friend",
      "Are you sure you want to remove this friend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await friendsApi.removeFriend(friendId);
              setFriendStatus("none");
              setFriendId(null);
              Alert.alert("Success", "Friend removed");
            } catch (error) {
              console.error("Error removing friend:", error);
              Alert.alert("Error", "Failed to remove friend");
            }
          },
        },
      ]
    );
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

        <View className="flex-1 flex-row items-center justify-center  px-3 py-3 rounded-full mx-1   bg-blue-50">
          <AntDesign
            name="message1"
            size={16}
            color="#3B82F6"
            className="mr-2"
          />
          <Text className="text-blue-600 font-semibold">
            {item.comment_count || 0}
          </Text>
        </View>

        <Pressable
          className="bg-purple-600 px-4 py-3 rounded-full "
          onPress={() => router.push(`/post/${item.id}` as any)}>
          <Text className="text-white font-semibold text-sm">View Post</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f3f4f6",
        }}>
        <Text style={{ fontSize: 16, color: "#6b7280" }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f3f4f6",
        }}>
        <Text style={{ fontSize: 16, color: "#6b7280" }}>User not found</Text>
        <Pressable
          style={{
            backgroundColor: "#3b82f6",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            marginTop: 20,
          }}
          onPress={() => router.back()}>
          <Text style={{ color: "white", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1 bg-blue-50"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header with Back Button */}
        <View className="px-4 relative py-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3"
              onPress={() => router.back()}>
              <Text className=" font-bold text-lg">←</Text>
            </Pressable>
            <Text className=" font-bold text-lg">Profile</Text>
          </View>
        </View>

        {/* Profile Header */}
        <View className="bg-gradient-to-br from-blue-600 to-purple-700 pb-8 px-6 relative">
          <View className="items-center relative z-10">
            <View className="w-28 h-28 rounded-full bg-purple-500  flex items-center justify-center mb-4 border border-white">
              <Text className="text-5xl font-bold text-white">
                {userProfile.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text className="text-3xl font-bold mb-2 text-center ">
              {userProfile.full_name || userProfile.username || "Unknown User"}
            </Text>
            <Text className="text-gray-600 text-base mb-4">
              @{userProfile.username}
            </Text>
            <Text className="text-gray-600 text-base mb-4">
              Joined{" "}
              {new Date(userProfile.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            {userProfile.bio ? (
              <Text className="text-base  text-center mb-2 px-2">
                {userProfile.bio}
              </Text>
            ) : null}

            {/* Friend Action Button */}
            <View className="flex-row space-x-4 gap-3">
              {friendStatus === "none" && (
                <Pressable
                  className="bg-blue-500 rounded-xl px-8 py-3 "
                  onPress={handleSendFriendRequest}>
                  <Text className="text-white font-bold">
                    <Feather name="user-plus" size={16} /> Add Friend
                  </Text>
                </Pressable>
              )}

              {friendStatus === "pending" && (
                <View className="flex-row space-x-2 gap-3">
                  <Pressable
                    className="bg-gray-500 rounded-xl px-8 py-3 "
                    onPress={handleAcceptRequest}>
                    <Text className="text-white font-bold">
                      <Feather name="user-check" size={16} /> Accept
                    </Text>
                  </Pressable>
                  <Pressable
                    className="bg-red-500 rounded-xl px-8 py-3 "
                    onPress={handleRejectRequest}>
                    <Text className="text-white font-bold">
                      <Feather name="user-x" size={16} /> Reject
                    </Text>
                  </Pressable>
                </View>
              )}

              {friendStatus === "sent" && (
                <Pressable
                  className="bg-gray-500 rounded-xl px-8 py-3 "
                  disabled>
                  <Text className="text-white font-bold">
                    <Feather name="clock" size={16} /> Request Sent
                  </Text>
                </Pressable>
              )}

              {friendStatus === "friends" && (
                <View className="flex-row space-x-3 gap-3">
                  <Pressable
                    className="bg-purple-500 rounded-xl px-8 py-3 "
                    onPress={() => {
                      if (userProfile?.id) {
                        router.push(`/chat/${userProfile.id}` as any);
                      }
                    }}>
                    <Text className="text-white font-bold">
                      <Feather name="message-circle" size={16} /> Chat
                    </Text>
                  </Pressable>
                  <Pressable
                    className="bg-red-500 rounded-xl px-8 py-3 "
                    onPress={handleRemoveFriend}>
                    <Text className="text-white font-bold">
                      <Feather name="user-x" size={16} /> UnFriend
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View className="bg-white mx-4 -mt-6 rounded-2xl  p-6 relative z-20 border border-gray-100">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {userPosts.length}
              </Text>
              <Text className="text-gray-500 font-medium">Posts</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-500">
                {userPosts.reduce(
                  (sum, post) => sum + (post.like_count || 0),
                  0
                )}
              </Text>
              <Text className="text-gray-500 font-medium">Likes</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">
                {userPosts.reduce(
                  (sum, post) => sum + (post.comment_count || 0),
                  0
                )}
              </Text>
              <Text className="text-gray-500 font-medium">Comments</Text>
            </View>
          </View>
        </View>

        {/* Posts Section */}
        <View className="mx-4 mt-4">
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-xl font-bold text-gray-900">📝 Posts</Text>
          </View>
          <FlatList
            data={userPosts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ListEmptyComponent={
              <View className="bg-white rounded-2xl p-12 items-center border border-gray-100">
                <AntDesign name="filetext1" size={50} color="#9CA3AF" />
                <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
                  No posts yet
                </Text>
                <Text className="text-gray-400 text-center leading-6">
                  This user hasn&apos;t shared any posts yet.
                </Text>
              </View>
            }
          />
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
