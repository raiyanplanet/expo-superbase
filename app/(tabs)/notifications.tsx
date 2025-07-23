"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { commentsApi, friendsApi, likesApi, postsApi } from "../../lib/api";
import { Comment, Friend, Like, Post } from "../../lib/types";
import { supabase } from "../../supabase/client";

interface NotificationItem {
  id: string;
  type: "friend_request" | "like" | "comment";
  created_at: string;
  data: Friend | Like | Comment;
  post?: Post;
  read?: boolean;
}

export default function Notifications() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else {
        setUser(data.user);
        loadNotifications(data.user.id);
      }
    });
  }, []);

  const loadNotifications = async (userId: string) => {
    try {
      setLoading(true);

      // Load friend requests
      const friendRequests = await friendsApi.getFriendRequests(userId);
      const friendNotifications: NotificationItem[] = friendRequests.map(
        (request) => ({
          id: `friend_${request.id}`,
          type: "friend_request",
          created_at: request.created_at,
          data: request,
          read: false,
        })
      );

      // Load likes on user's posts
      const userPosts = await postsApi.getUserPosts(userId);
      const likeNotifications: NotificationItem[] = [];

      for (const post of userPosts) {
        const likes = await likesApi.getPostLikes(post.id);
        const userLikes = likes.filter((like) => like.user_id !== userId);

        for (const like of userLikes) {
          likeNotifications.push({
            id: `like_${like.id}`,
            type: "like",
            created_at: like.created_at,
            data: like,
            post: post,
            read: false,
          });
        }
      }

      // Load comments on user's posts
      const commentNotifications: NotificationItem[] = [];

      for (const post of userPosts) {
        const comments = await commentsApi.getPostComments(post.id);
        const userComments = comments.filter(
          (comment) => comment.user_id !== userId
        );

        for (const comment of userComments) {
          commentNotifications.push({
            id: `comment_${comment.id}`,
            type: "comment",
            created_at: comment.created_at,
            data: comment,
            post: post,
            read: false,
          });
        }
      }

      // Combine and sort all notifications by date
      const allNotifications = [
        ...friendNotifications,
        ...likeNotifications,
        ...commentNotifications,
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await friendsApi.acceptFriendRequest(friendId);
      await loadNotifications(user.id);
      Alert.alert("Success", "Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      await friendsApi.rejectFriendRequest(friendId);
      await loadNotifications(user.id);
      Alert.alert("Success", "Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleViewPost = (postId: string) => {
    router.push(`/post/${postId}` as any);
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}` as any);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return "👥";
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      default:
        return "🔔";
    }
  };

  const getNotificationText = (notification: NotificationItem) => {
    switch (notification.type) {
      case "friend_request":
        const friendRequest = notification.data as Friend;
        const requesterProfile = friendRequest.requester_profile;
        return `sent you a friend request`;

      case "like":
        const post = notification.post;
        return `reacted to your post`;

      case "comment":
        const commentPost = notification.post;
        return `commented on your post`;

      default:
        return "New notification";
    }
  };

  const getNotificationUser = (notification: NotificationItem) => {
    switch (notification.type) {
      case "friend_request":
        const friendRequest = notification.data as Friend;
        return friendRequest.requester_profile;

      case "like":
        return null;

      case "comment":
        const comment = notification.data as Comment;
        return {
          id: comment.user_id,
          username: comment.username,
          full_name: comment.full_name,
          avatar_url: comment.avatar_url,
        };

      default:
        return null;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Less than 1 hour - show minutes
    if (diffInMinutes < 60) {
      if (diffInMinutes < 1) return "now";
      return `${diffInMinutes}m`;
    }

    // Less than 24 hours - show hours
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    // Yesterday
    if (diffInDays === 1) {
      return "Yesterday";
    }

    // Less than 7 days - show day name
    if (diffInDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }

    // Same year - show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // Different year - show full date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const userProfile = getNotificationUser(item);
    const isFriendRequest = item.type === "friend_request";
    const isUnread = !item.read;

    return (
      <Pressable
        className={`flex-row items-start px-4 py-3 rounded-lg mb-2 mx-2 ${isUnread ? "bg-blue-50" : "bg-white"} border-b border-gray-100`}
        onPress={() => {
          markAsRead(item.id);
          if (!isFriendRequest && item.post) {
            handleViewPost(item.post.id);
          } else if (userProfile && "id" in userProfile) {
            handleViewProfile(userProfile.id);
          }
        }}>
        {/* Profile Picture */}
        <View className="relative mr-3">
          <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                className="w-full h-full"
              />
            ) : (
              <Text className="text-lg font-bold text-gray-600">
                {userProfile?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            )}
          </View>

          {/* Notification Type Icon Badge */}
          <View
            className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center ${
              item.type === "friend_request"
                ? "bg-blue-500"
                : item.type === "like"
                  ? "bg-red-500"
                  : "bg-green-500"
            }`}>
            <Text className="text-white text-xs">
              {item.type === "friend_request"
                ? "👥"
                : item.type === "like"
                  ? "🤍"
                  : "💬"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-gray-500 text-xs font-medium">
              {getTimeAgo(item.created_at)}
            </Text>
            {isUnread && <View className="w-3 h-3 rounded-full bg-blue-500" />}
          </View>

          <Text className="text-gray-900 text-sm leading-5 mb-2">
            <Text className="font-semibold">
              {userProfile?.full_name ||
                userProfile?.username ||
                "Unknown User"}
            </Text>{" "}
            <Text className="font-normal">{getNotificationText(item)}</Text>
            {item.post && item.type !== "friend_request" && (
              <Text className="text-gray-600">
                {`: "${item.post.content?.substring(0, 40)}${item.post.content && item.post.content.length > 40 ? "..." : ""}"`}
              </Text>
            )}
          </Text>

          {/* Action Buttons for Friend Requests */}
          {isFriendRequest && (
            <View className="flex-row mt-2">
              <Pressable
                className="bg-blue-500 rounded-md px-6 py-2 mr-2"
                onPress={(e) => {
                  e.stopPropagation();
                  handleAcceptRequest((item.data as Friend).id);
                }}>
                <Text className="text-white text-sm font-semibold">
                  Confirm
                </Text>
              </Pressable>
              <Pressable
                className="bg-gray-200 rounded-md px-6 py-2"
                onPress={(e) => {
                  e.stopPropagation();
                  handleRejectRequest((item.data as Friend).id);
                }}>
                <Text className="text-gray-700 text-sm font-semibold">
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b mb-2 border-gray-200">
        {unreadCount > 0 && (
          <Pressable
            className="self-start"
            onPress={() => {
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true }))
              );
            }}>
            <Text className="text-blue-600 font-semibold text-sm">
              Mark all as read ({unreadCount})
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center p-4">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Text className="text-3xl">🔔</Text>
            </View>
            <Text className="text-gray-900 text-lg font-semibold text-center mb-2">
              No notifications yet
            </Text>
            <Text className="text-gray-500 text-center text-sm px-8 leading-5">
              When someone likes your posts, comments, or sends you a friend
              request, you all see it here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadNotifications(user.id)}
            tintColor="#1877f2"
          />
        }
      />
    </View>
  );
}
