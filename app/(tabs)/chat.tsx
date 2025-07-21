"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { friendsApi, messagesApi } from "../../lib/api";
import { Friend, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";

interface FriendWithLastMessage extends Friend {
  lastMessage?: string;
  unreadCount?: number;
}

export default function Chat() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [friends, setFriends] = useState<FriendWithLastMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        await loadFriends(data.user.id);
      } catch (error) {
        console.error("Auth error:", String(error));
      }
    };

    loadUser();
  }, []);

  const loadFriends = async (userId: string) => {
    try {
      setLoading(true);
      const friendsList = await friendsApi.getFriends(userId);

      const friendsWithMessages = await Promise.all(
        friendsList.map(async (friend) => {
          const friendProfile =
            friend.requester_id === userId
              ? friend.addressee_profile
              : friend.requester_profile;

          if (!friendProfile) return friend;

          try {
            const [messages, unreadCount] = await Promise.all([
              messagesApi.getMessages(userId, friendProfile.id),
              messagesApi.getUnreadCountForFriend(userId, friendProfile.id),
            ]);

            const lastMessage =
              messages.length > 0
                ? messages[messages.length - 1].content.substring(0, 20) +
                  (messages[messages.length - 1].content.length > 20
                    ? "..."
                    : "")
                : undefined;

            return {
              ...friend,
              lastMessage,
              unreadCount,
            };
          } catch (error) {
            console.error(
              "Error loading messages for friend:",
              String(friendProfile.id),
              String(error)
            );
            return friend;
          }
        })
      );

      setFriends(friendsWithMessages);
    } catch (error) {
      console.error("Error loading friends:", String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (friendProfile: Profile) => {
    if (friendProfile?.id) {
      router.push(`/chat/${String(friendProfile.id)}`);
    }
  };

  const handleRefresh = () => {
    if (user?.id) {
      loadFriends(user.id);
    }
  };

  const renderFriend = ({ item }: { item: FriendWithLastMessage }) => {
    const friendProfile =
      item.requester_id === user?.id
        ? item.addressee_profile
        : item.requester_profile;

    if (!friendProfile) return null;

    return (
      <Pressable
        className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 active:bg-gray-50"
        onPress={() => handleStartChat(friendProfile)}>
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center mr-4 shadow-sm">
            <Text className="text-xl font-bold text-white">
              {friendProfile.username?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-lg text-gray-900">
                {friendProfile.full_name ||
                  friendProfile.username ||
                  "Unknown User"}
              </Text>
            </View>
            <Text
              className={`text-sm mt-1 ${
                item.unreadCount && item.unreadCount > 0
                  ? "font-semibold text-gray-900"
                  : "text-gray-500"
              }`}>
              {item.lastMessage ? `💬 ${item.lastMessage}` : "No messages yet"}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 text-xs font-medium">Online</Text>
            </View>
          </View>
          <View className="items-start ml-2 flex-row justify-center">
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mt-2">
              <Text className="text-white text-xl">💬</Text>
            </View>
            <View className=" items-start">
              {!!item.unreadCount && item.unreadCount > 0 && (
                <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
                  <Text className="text-white text-xs font-bold">
                    {item.unreadCount > 9 ? "9+" : String(item.unreadCount)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmptyComponent = () => (
    <View className="flex-1 justify-center items-center py-16">
      <Text className="text-6xl mb-4">💬</Text>
      <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
        No friends to chat with
      </Text>
      <Text className="text-gray-400 text-center leading-6">
        Add some friends first to start chatting!
      </Text>
      <Pressable
        className="bg-blue-500 rounded-lg px-6 py-3 mt-4"
        onPress={() => router.push("/(tabs)/friends")}>
        <Text className="text-white font-semibold">Find Friends</Text>
      </Pressable>
    </View>
  );

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <Text className="text-gray-500 text-sm mt-1">
          Chat with your friends
        </Text>
      </View>

      {/* Friends List */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyComponent}
        refreshing={loading}
        onRefresh={handleRefresh}
      />
    </View>
  );
}
