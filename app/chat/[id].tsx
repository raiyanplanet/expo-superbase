"use client";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messagesApi, profileApi } from "../../lib/api";
import { Message, Profile } from "../../lib/types";
import { supabase } from "../../supabase/client";

// Custom hook for keyboard handling
const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      "keyboardWillShow",
      (event) => {
        if (Platform.OS === "ios") {
          setKeyboardHeight(event.endCoordinates.height);
          setIsKeyboardVisible(true);
        }
      }
    );

    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const keyboardWillHide = Keyboard.addListener("keyboardWillHide", () => {
      if (Platform.OS === "ios") {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    });

    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardWillShow?.remove();
      keyboardDidShow?.remove();
      keyboardWillHide?.remove();
      keyboardDidHide?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// Message status component
const MessageStatus = ({
  message,
  isMyMessage,
}: {
  message: Message;
  isMyMessage: boolean;
}) => {
  if (!isMyMessage) return null;

  const getStatusIcon = () => {
    if (message.seen) return "✓✓";
    return "✓";
  };

  const getStatusColor = () => {
    if (message.seen) return "text-blue-100";
    return "text-blue-200";
  };

  return (
    <Text className={`text-xs ml-2 ${getStatusColor()}`}>
      {getStatusIcon()}
    </Text>
  );
};

// Message bubble component
const MessageBubble = ({
  item,
  user,
  onLongPress,
}: {
  item: Message;
  user: any;
  onLongPress?: () => void;
}) => {
  const isMyMessage = item.sender_id === user?.id;
  const messageTime = new Date(item.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable
      onLongPress={isMyMessage ? onLongPress : undefined}
      delayLongPress={600}>
      <View
        className={`flex-row ${isMyMessage ? "justify-end" : "justify-start"} mb-3`}>
        <View
          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
            isMyMessage
              ? "bg-blue-500 rounded-br-md"
              : "bg-white rounded-bl-md shadow-sm"
          }`}>
          <Text
            className={`text-base leading-5 ${
              isMyMessage ? "text-white" : "text-gray-900"
            }`}>
            {item.content}
          </Text>
          <View
            className={`flex-row items-center mt-2 ${
              isMyMessage ? "justify-end" : "justify-start"
            }`}>
            <Text
              className={`text-xs ${
                isMyMessage ? "text-blue-100" : "text-gray-500"
              }`}>
              {messageTime}
            </Text>
            <MessageStatus message={item} isMyMessage={isMyMessage} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

// Chat header component
const ChatHeader = ({
  friend,
  onBackPress,
}: {
  friend: Profile;
  onBackPress: () => void;
}) => (
  <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center shadow-sm">
    <Pressable
      className="mr-3 p-1"
      onPress={onBackPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text className="text-2xl text-blue-500">←</Text>
    </Pressable>

    <View className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center mr-3">
      <Text className="text-lg font-bold text-white">
        {friend.username?.charAt(0).toUpperCase() || "U"}
      </Text>
    </View>

    <View className="flex-1">
      <Text className="font-semibold text-lg text-gray-900" numberOfLines={1}>
        {friend.full_name || friend.username || "Unknown User"}
      </Text>
      <View className="flex-row items-center mt-1">
        <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        <Text className="text-green-600 text-sm font-medium">Online</Text>
      </View>
    </View>
  </View>
);

// Empty state component
const EmptyState = ({ friendName }: { friendName: string }) => (
  <View className="flex-1 justify-center items-center py-20">
    <Text className="text-7xl mb-6">💬</Text>
    <Text className="text-gray-700 text-2xl font-semibold text-center mb-3">
      Start a conversation
    </Text>
    <Text className="text-gray-500 text-center text-base leading-6 px-8">
      Send a message to begin chatting with {friendName}
    </Text>
  </View>
);

// Message input component
const MessageInput = ({
  value,
  onChangeText,
  onSend,
  sending,
  disabled,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
}) => {
  const canSend = value.trim() && !sending && !disabled;
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="bg-transparent">
      <View className="px-4 py-3">
        <View className="flex-row items-end">
          <TextInput
            ref={inputRef}
            className="flex-1 border border-gray-300 bg-gray-50 rounded-full px-4 py-3 mr-3 text-base"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={{
              minHeight: 44,
              maxHeight: 120,
              lineHeight: 20,
            }}
          />

          <Pressable
            className={`w-14 h-14 rounded-full items-center justify-center ${
              canSend ? "bg-blue-500" : "bg-blue-300"
            }`}
            onPress={onSend}
            disabled={!canSend}>
            <Feather name="send" size={24} color="white" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default function ChatRoom() {
  const { id: friendId } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // Memoized render function for better performance
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        item={item}
        user={user}
        onLongPress={() => handleDeleteMessage(item.id)}
      />
    ),
    [user]
  );

  // Optimized key extractor
  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Auto-scroll to bottom when keyboard appears or messages change
  useEffect(() => {
    if (messages.length > 0) {
      const scrollTimeout = setTimeout(
        () => {
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        isKeyboardVisible ? 150 : 100
      );

      return () => clearTimeout(scrollTimeout);
    }
  }, [isKeyboardVisible, messages.length]);

  // Additional scroll when keyboard height changes
  useEffect(() => {
    if (messages.length > 0) {
      const scrollTimeout = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);

      return () => clearTimeout(scrollTimeout);
    }
  }, [keyboardHeight]);

  // Initialize user and load chat data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        await loadFriendAndMessages(data.user.id);
      } catch (err) {
        console.error("Error initializing chat:", err);
        setError("Failed to load chat");
      }
    };

    initializeChat();
  }, [friendId]);

  // Load friend profile and messages
  const loadFriendAndMessages = async (userId: string, isRefresh = false) => {
    try {
      setError(null);

      // Load friend profile first
      const friendProfile = await profileApi.getProfile(friendId);
      setFriend(friendProfile);

      // Then load messages
      const messagesList = await messagesApi.getMessages(userId, friendId);
      setMessages(messagesList);

      // Mark messages as seen and subscribe to new messages
      await messagesApi.markMessagesAsSeen(friendId, userId);
      subscribeToMessages(userId, friendId);
    } catch (error) {
      console.error("Error loading chat:", error);
      const errorMessage = "Failed to load chat";
      setError(errorMessage);
      if (!isRefresh) {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Subscribe to real-time messages
  const subscribeToMessages = (userId: string, friendId: string) => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = messagesApi.subscribeToMessages(
      userId,
      friendId,
      (newMessage) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });

        // Auto-scroll to new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);

        // Mark as seen if from friend
        if (newMessage.sender_id === friendId) {
          messagesApi.markMessagesAsSeen(friendId, userId);
        }
      }
    );
  };

  // Send message function
  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || !user || !friend || sending) return;

    let optimisticMessage: Message;

    try {
      optimisticMessage = {
        id: `temp_${Date.now()}`,
        content: messageText,
        sender_id: user.id,
        receiver_id: friendId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        seen: false,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setNewMessage("");

      // Scroll to bottom immediately
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 30);

      // Send actual message
      const sentMessage = await messagesApi.sendMessage(
        user.id,
        friendId,
        messageText
      );

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? sentMessage : msg))
      );
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");

      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    if (user) {
      setRefreshing(true);
      await loadFriendAndMessages(user.id, true);
    }
  }, [user, friendId]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await messagesApi.deleteMessage(messageId);
              setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
            } catch (err) {
              Alert.alert("Error", "Failed to delete message");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Chat Header - Always stays at top */}
      {friend && (
        <ChatHeader friend={friend} onBackPress={() => router.back()} />
      )}

      {/* Entire chat content moves up when keyboard opens */}
      <View
        className="flex-1"
        style={{
          marginBottom: keyboardHeight, // Push entire content up when keyboard opens
        }}>
        {/* Messages Container */}
        <View className="flex-1">
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              padding: 16,
              flexGrow: 1,
              paddingBottom: 16, // Just normal padding
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              friend ? (
                <EmptyState
                  friendName={
                    friend.full_name || friend.username || "this user"
                  }
                />
              ) : null
            }
            removeClippedSubviews={Platform.OS === "android"}
            maxToRenderPerBatch={20}
            windowSize={10}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />
        </View>

        {/* Input - Always at bottom of the chat content */}
        <MessageInput
          value={newMessage}
          onChangeText={setNewMessage}
          onSend={sendMessage}
          sending={sending}
          disabled={!friend}
        />
      </View>
    </SafeAreaView>
  );
}
