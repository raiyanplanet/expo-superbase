"use client";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { friendsApi, profileApi } from "../../lib/api";
import { Friend, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";

export default function Friends() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">(
    "friends"
  );
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else {
        setUser(data.user);
        loadFriends(data.user.id);
        loadFriendRequests(data.user.id);
      }
    });
  }, []);

  const loadFriends = async (userId: string) => {
    try {
      const friendsList = await friendsApi.getFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadFriendRequests = async (userId: string) => {
    try {
      const requests = await friendsApi.getFriendRequests(userId);
      setFriendRequests(requests);
    } catch (error) {
      console.error("Error loading friend requests:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await profileApi.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (addresseeId: string) => {
    try {
      await friendsApi.sendFriendRequest(user.id, {
        addressee_id: addresseeId,
      });
      Alert.alert("Success", "Friend request sent!");
      setRequestedIds((prev) => [...prev, addresseeId]);
      await loadFriendRequests(user.id);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        setRequestedIds((prev) => [...prev, addresseeId]);
        loadFriendRequests(user.id); // Don't await in catch
        Alert.alert(
          "Info",
          "You have already sent a friend request to this user."
        );
      } else {
        console.error("Error sending friend request:", error);
        Alert.alert("Error", "Failed to send friend request");
      }
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await friendsApi.acceptFriendRequest(friendId);
      await loadFriends(user.id);
      await loadFriendRequests(user.id);
      Alert.alert("Success", "Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      await friendsApi.rejectFriendRequest(friendId);
      await loadFriendRequests(user.id);
      Alert.alert("Success", "Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await friendsApi.removeFriend(friendId);
      await loadFriends(user.id);
      Alert.alert("Success", "Friend removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      Alert.alert("Error", "Failed to remove friend");
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const friendProfile =
      item.requester_id === user?.id
        ? item.addressee_profile
        : item.requester_profile;

    if (!friendProfile) return null;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable
            className="flex-row items-center flex-1"
            onPress={() => router.push(`/user/${friendProfile.id}` as any)}>
            <View className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mr-3">
              <Text className="text-lg font-bold text-blue-600">
                {friendProfile.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold">
                {friendProfile.full_name ||
                  friendProfile.username ||
                  "Unknown User"}
              </Text>
              <Text className="text-gray-500 text-sm">
                {friendProfile.bio || "No bio"}
              </Text>
            </View>
          </Pressable>
          <Pressable
            className="bg-red-500 rounded-lg px-3 py-3"
            onPress={() => handleRemoveFriend(item.id)}>
            <Text className="text-white text-sm">Unfriend</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderFriendRequest = ({ item }: { item: Friend }) => {
    const requesterProfile = item.requester_profile;
    if (!requesterProfile) return null;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <Pressable
          className="flex-row items-center mb-3"
          onPress={() => router.push(`/user/${requesterProfile.id}` as any)}>
          <View className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mr-3">
            <Text className="text-lg font-bold text-blue-600">
              {requesterProfile.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold">
              {requesterProfile.full_name ||
                requesterProfile.username ||
                "Unknown User"}
            </Text>
            <Text className="text-gray-500 text-sm">
              {requesterProfile.bio || "No bio"}
            </Text>
          </View>
        </Pressable>
        <View className="flex-row">
          <Pressable
            className="bg-green-500 rounded-lg px-4 py-2 mr-2 flex-1"
            onPress={() => handleAcceptRequest(item.id)}>
            <Text className="text-white text-center font-semibold">
              <Feather name="user-check" size={16} /> Accept
            </Text>
          </Pressable>
          <Pressable
            className="bg-red-500 rounded-lg px-4 py-2 flex-1"
            onPress={() => handleRejectRequest(item.id)}>
            <Text className="text-white text-center font-semibold">
              {" "}
              <Feather name="user-x" size={16} /> Reject
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: Profile }) => {
    // Check if already a friend
    const isFriend = friends.some(
      (f) =>
        (f.requester_id === user.id && f.addressee_id === item.id) ||
        (f.addressee_id === user.id && f.requester_id === item.id)
    );
    // Check if there is a pending request (sent or received)
    const isRequested =
      friendRequests.some(
        (r) =>
          (r.requester_id === user.id && r.addressee_id === item.id) ||
          (r.addressee_id === user.id && r.requester_id === item.id)
      ) || requestedIds.includes(item.id);
    // Check if this is the current user
    const isMe = item.id === user.id;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Pressable
            className="flex-row items-center flex-1"
            onPress={() => router.push(`/user/${item.id}` as any)}>
            <View className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mr-3">
              <Text className="text-lg font-bold text-blue-600">
                {item.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold">
                {item.full_name || item.username || "Unknown User"}
              </Text>
              <Text className="text-gray-500 text-sm">
                {item.bio || "No bio"}
              </Text>
            </View>
          </Pressable>
          {!isMe &&
            (isFriend ? (
              <View className="bg-green-200 rounded-lg px-6 py-3">
                <Text className="text-green-700 text-sm">
                  <Feather name="user-check" size={16} color="green" /> Friend
                </Text>
              </View>
            ) : isRequested ? (
              <View className="bg-gray-300 rounded-lg px-3 py-3">
                <Text className="text-gray-600 text-sm">
                  <Feather name="user-check" size={16} color="gray" /> Requested
                </Text>
              </View>
            ) : (
              <Pressable
                className="bg-blue-500 rounded-lg px-3 py-3"
                onPress={() => handleSendFriendRequest(item.id)}>
                <Text className="text-white text-sm">
                  <Feather name="user-plus" size={16} color="white" /> Add
                  Friend
                </Text>
              </Pressable>
            ))}
        </View>
      </View>
    );
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <Pressable
            className={`flex-1 p-3 ${activeTab === "friends" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("friends")}>
            <Text
              className={`text-center ${activeTab === "friends" ? "text-blue-500 font-semibold" : "text-gray-600"}`}>
              Friends ({friends.length})
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 p-3 ${activeTab === "requests" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("requests")}>
            <Text
              className={`text-center ${activeTab === "requests" ? "text-blue-500 font-semibold" : "text-gray-600"}`}>
              Requests ({friendRequests.length})
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 p-3 ${activeTab === "search" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("search")}>
            <Text
              className={`text-center ${activeTab === "search" ? "text-blue-500 font-semibold" : "text-gray-600"}`}>
              Search
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {activeTab === "search" && (
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg p-3 mr-2"
              placeholder="Search users..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable
              className="bg-blue-500 rounded-lg px-4 py-3"
              onPress={handleSearch}
              disabled={loading}>
              <Text className="text-white font-semibold">
                {loading ? "..." : "Search"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      {activeTab === "friends" && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500 text-center">No friends yet</Text>
            </View>
          }
        />
      )}

      {activeTab === "requests" && (
        <FlatList
          data={friendRequests}
          renderItem={renderFriendRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500 text-center">
                No friend requests
              </Text>
            </View>
          }
        />
      )}

      {activeTab === "search" && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500 text-center">
                Search for users to add as friends
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
