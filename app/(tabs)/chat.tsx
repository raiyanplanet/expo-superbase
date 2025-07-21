"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { friendsApi, messagesApi } from "../../lib/api";
import { Friend, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";
import { chatEventBus } from "../event-bus";

interface FriendWithLastMessage extends Friend {
  lastMessage?: string;
  unreadCount?: number;
  lastMessageTimestamp?: string;
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

  // Subscribe to global incoming messages for auto-refresh of chat list
  useEffect(() => {
    if (!user) return;
    const globalSub = messagesApi.subscribeToIncomingMessages(user.id, () => {
      console.log("Supabase realtime: incoming message, refreshing chat list");
      loadFriends(user.id);
    });
    // Listen for refreshChatList event
    const handler = () => {
      console.log("chatEventBus: refreshChatList event received");
      loadFriends(user.id);
    };
    chatEventBus.on("refreshChatList", handler);
    return () => {
      globalSub.unsubscribe();
      chatEventBus.off("refreshChatList", handler);
    };
  }, [user]);

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

            let lastMessageTimestamp: string | undefined = undefined;
            if (messages.length > 0) {
              lastMessageTimestamp = messages[messages.length - 1].created_at;
            }
            return {
              ...friend,
              lastMessage,
              unreadCount,
              lastMessageTimestamp,
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

      // Split friends into those with and without lastMessageTimestamp
      const withTimestamp = friendsWithMessages.filter(
        (f) => (f as FriendWithLastMessage).lastMessageTimestamp
      ) as FriendWithLastMessage[];
      const withoutTimestamp = friendsWithMessages.filter(
        (f) => !(f as FriendWithLastMessage).lastMessageTimestamp
      ) as FriendWithLastMessage[];
      // Sort those with timestamp by most recent
      withTimestamp.sort((a, b) => {
        const aTime = new Date(a.lastMessageTimestamp!).getTime();
        const bTime = new Date(b.lastMessageTimestamp!).getTime();
        return bTime - aTime;
      });
      setFriends([...withTimestamp, ...withoutTimestamp]);
      console.log("Friends updated", new Date());
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

  // Add a function to delete all messages with a friend
  const handleDeleteChat = async (friendProfile: Profile) => {
    if (!user?.id || !friendProfile?.id) return;
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete all messages with ${friendProfile.full_name || friendProfile.username || "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await messagesApi.deleteAllMessagesWithFriend(
                user.id,
                friendProfile.id
              );
              loadFriends(user.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete chat");
            }
          },
        },
      ]
    );
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
        onPress={() => handleStartChat(friendProfile)}
        onLongPress={() => handleDeleteChat(friendProfile)}
        delayLongPress={600}>
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

  // Render horizontal friend list
  const renderFriendRow = () => (
    <View className="bg-white border-b border-gray-100">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        className="h-28">
        {friends.map((item, index) => {
          const friendProfile =
            item.requester_id === user?.id
              ? item.addressee_profile
              : item.requester_profile;

          if (!friendProfile) return null;

          return (
            <Pressable
              key={friendProfile.id}
              className="flex-col items-center mr-4"
              style={({ pressed }) => [
                {
                  alignItems: "center",
                  marginRight: index === friends.length - 1 ? 0 : 12,
                  opacity: pressed ? 0.7 : 1,
                  transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
                },
              ]}
              onPress={() => handleStartChat(friendProfile)}>
              {/* Avatar Container with Online Status Indicator */}
              <View className="relative mb-2">
                <View className="items-center justify-center bg-purple-500 rounded-full w-16 h-16 shadow-lg">
                  {friendProfile.avatar_url ? (
                    <Image
                      source={{ uri: friendProfile.avatar_url }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                        borderWidth: 3,
                        borderColor: "#fff",
                      }}
                    />
                  ) : (
                    <Text className="text-white text-xl font-bold">
                      {friendProfile.full_name?.charAt(0).toUpperCase() ||
                        friendProfile.username?.charAt(0).toUpperCase() ||
                        "?"}
                    </Text>
                  )}
                </View>

                {/* Online Status Indicator (optional - you can add online status logic) */}
                <View
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  style={{
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                  }}
                />
              </View>

              {/* Name with Better Typography */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#374151",
                  maxWidth: 64,
                  textAlign: "center",
                  lineHeight: 14,
                }}
                numberOfLines={1}
                ellipsizeMode="tail">
                {friendProfile.full_name || friendProfile.username || "User"}
              </Text>
            </Pressable>
          );
        })}

        {/* Add Friend Button (Optional) */}
        <Pressable
          style={({ pressed }) => [
            {
              alignItems: "center",
              marginLeft: 8,
              opacity: pressed ? 0.7 : 1,
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            },
          ]}
          onPress={() => {
            /* Navigate to add friend screen */
          }}>
          <View
            className="items-center justify-center bg-gray-100 rounded-full w-16 h-16 mb-2"
            style={{
              borderWidth: 2,
              borderColor: "#E5E7EB",
              borderStyle: "dashed",
            }}>
            <Text className="text-gray-400 text-2xl font-light">+</Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: "#9CA3AF",
              maxWidth: 64,
              textAlign: "center",
            }}
            numberOfLines={1}>
            Add
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );

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
      {/* Horizontal Friend List */}
      {renderFriendRow()}
      {/* Friends List */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingTop: 0,
          paddingBottom: 8,
          paddingHorizontal: 12,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyComponent}
        refreshing={loading}
        onRefresh={handleRefresh}
      />
    </View>
  );
}
