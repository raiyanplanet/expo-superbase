import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { messagesApi } from "../../lib/api";
import { supabase } from "../../supabase/client";

function ChatTabIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const count = await messagesApi.getUnreadCount(user.id);
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons
        name={focused ? "chatbubbles" : "chatbubbles-outline"}
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -5,
          right: -5,
          backgroundColor: '#ef4444',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#ffffff'
        }}>
          <Text style={{
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 'bold'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
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
          headerTitle: "🏠 Home Feed",
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
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={size}
              color={color}
            />
          ),
          headerTitle: "🔔 Notifications",
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
