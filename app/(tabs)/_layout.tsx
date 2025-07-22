import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import {
  commentsApi,
  friendsApi,
  likesApi,
  messagesApi,
  postsApi,
} from "../../lib/api";
import { supabase } from "../../supabase/client";

const NOTIF_LAST_SEEN_KEY = "notifications_last_seen";

async function getNotificationsLastSeen() {
  const ts = await AsyncStorage.getItem(NOTIF_LAST_SEEN_KEY);
  return ts ? new Date(ts) : new Date(0);
}

async function setNotificationsLastSeen() {
  await AsyncStorage.setItem(NOTIF_LAST_SEEN_KEY, new Date().toISOString());
}

function ChatTabIcon({
  color,
  focused,
  size,
}: {
  color: string;
  focused: boolean;
  size: number;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const count = await messagesApi.getUnreadCount(user.id);
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "chatbubbles" : "chatbubbles-outline"}
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            backgroundColor: "#ef4444",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: "#ffffff",
          }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 10,
              fontWeight: "bold",
            }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function NotificationTabIcon({
  color,
  focused,
  size,
}: {
  color: string;
  focused: boolean;
  size: number;
}) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastSeen, setLastSeen] = useState<Date>(new Date(0));

  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setNotificationCount(0);
          return;
        }
        const lastSeenTime = await getNotificationsLastSeen();
        setLastSeen(lastSeenTime);
        let notifications: { created_at: string }[] = [];
        // Friend requests (these are included in the badge count)
        const friendRequests = await friendsApi.getFriendRequests(user.id);
        notifications = notifications.concat(
          friendRequests.map((r) => ({ created_at: r.created_at }))
        );
        // Likes and comments on user's posts
        const userPosts = await postsApi.getUserPosts(user.id);
        for (const post of userPosts) {
          const likes = await likesApi.getPostLikes(post.id);
          notifications = notifications.concat(
            likes
              .filter((like) => like.user_id !== user.id)
              .map((like) => ({ created_at: like.created_at }))
          );
          const comments = await commentsApi.getPostComments(post.id);
          notifications = notifications.concat(
            comments
              .filter((comment) => comment.user_id !== user.id)
              .map((comment) => ({ created_at: comment.created_at }))
          );
        }
        // Only count notifications newer than lastSeenTime
        const unseenCount = notifications.filter(
          (n) => new Date(n.created_at) > lastSeenTime
        ).length;
        setNotificationCount(unseenCount);
      } catch (error) {
        console.error("Error loading notification count:", error);
        setNotificationCount(0);
      }
    };
    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "notifications" : "notifications-outline"}
        size={size}
        color={color}
      />
      {notificationCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            backgroundColor: "#ef4444",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: "#ffffff",
          }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 10,
              fontWeight: "bold",
            }}>
            {notificationCount > 99 ? "99+" : notificationCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const feedRef = useRef<{ refreshAndScrollToTop: () => void }>(null);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarShowLabel: false, // This hides the text labels
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderTopColor: "#f3f4f6",
          height: Platform.OS === "ios" ? 80 : 60, // Reduced height since no labels
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: "#1f2937",
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
          headerTitle: "🏠 Feed",
        }}
        listeners={{
          tabPress: (e) => {
            // If already focused, refresh and scroll to top
            if (feedRef.current) {
              feedRef.current.refreshAndScrollToTop();
            }
          },
        }}
        // @ts-ignore
        ref={feedRef}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={size}
              color={color}
            />
          ),
          headerTitle: "👥 Friends",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused, size }) => (
            <ChatTabIcon color={color} focused={focused} size={size} />
          ),
          headerTitle: "💬 Messages",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused, size }) => (
            <NotificationTabIcon color={color} focused={focused} size={size} />
          ),
          headerTitle: "🔔 Notifications",
        }}
        listeners={{
          tabPress: async () => {
            await setNotificationsLastSeen();
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
          headerTitle: "👤 Profile",
        }}
      />
    </Tabs>
  );
}
