'use client';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { commentsApi, friendsApi, likesApi, postsApi } from '../../lib/api';
import { Comment, Friend, Like, Post } from '../../lib/types';
import { supabase } from '../../supabase/client';

interface NotificationItem {
  id: string;
  type: 'friend_request' | 'like' | 'comment';
  created_at: string;
  data: Friend | Like | Comment;
  post?: Post;
}

export default function Notifications() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login');
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
      const friendNotifications: NotificationItem[] = friendRequests.map(request => ({
        id: `friend_${request.id}`,
        type: 'friend_request',
        created_at: request.created_at,
        data: request
      }));

      // Load likes on user's posts
      const userPosts = await postsApi.getUserPosts(userId);
      const likeNotifications: NotificationItem[] = [];
      
      for (const post of userPosts) {
        const likes = await likesApi.getPostLikes(post.id);
        const userLikes = likes.filter(like => like.user_id !== userId);
        
        for (const like of userLikes) {
          likeNotifications.push({
            id: `like_${like.id}`,
            type: 'like',
            created_at: like.created_at,
            data: like,
            post: post
          });
        }
      }

      // Load comments on user's posts
      const commentNotifications: NotificationItem[] = [];
      
      for (const post of userPosts) {
        const comments = await commentsApi.getPostComments(post.id);
        const userComments = comments.filter(comment => comment.user_id !== userId);
        
        for (const comment of userComments) {
          commentNotifications.push({
            id: `comment_${comment.id}`,
            type: 'comment',
            created_at: comment.created_at,
            data: comment,
            post: post
          });
        }
      }

      // Combine and sort all notifications by date
      const allNotifications = [
        ...friendNotifications,
        ...likeNotifications,
        ...commentNotifications
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await friendsApi.acceptFriendRequest(friendId);
      await loadNotifications(user.id);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      await friendsApi.rejectFriendRequest(friendId);
      await loadNotifications(user.id);
      Alert.alert('Success', 'Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const handleViewPost = (postId: string) => {
    router.push(`/post/${postId}` as any);
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/user/${userId}` as any);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return '👥';
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getNotificationText = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'friend_request':
        const friendRequest = notification.data as Friend;
        const requesterProfile = friendRequest.requester_profile;
        return `${requesterProfile?.full_name || requesterProfile?.username || 'Someone'} sent you a friend request`;
      
      case 'like':
        const post = notification.post;
        return `liked your post: "${post?.content?.substring(0, 50)}${post?.content && post.content.length > 50 ? '...' : ''}"`;
      
      case 'comment':
        const commentPost = notification.post;
        return `commented on your post: "${commentPost?.content?.substring(0, 50)}${commentPost?.content && commentPost.content.length > 50 ? '...' : ''}"`;
      
      default:
        return 'New notification';
    }
  };

  const getNotificationUser = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'friend_request':
        const friendRequest = notification.data as Friend;
        return friendRequest.requester_profile;
      
      case 'like':
        // We need to get the user profile for likes
        return null; // Will be handled separately
      
      case 'comment':
        const comment = notification.data as Comment;
        return {
          id: comment.user_id,
          username: comment.username,
          full_name: comment.full_name,
          avatar_url: comment.avatar_url
        };
      
      default:
        return null;
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const userProfile = getNotificationUser(item);
    const isFriendRequest = item.type === 'friend_request';

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row items-center mb-3">
          <Pressable
            className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mr-3"
            onPress={() => userProfile && 'id' in userProfile && handleViewProfile(userProfile.id)}>
            <Text className="text-lg font-bold text-blue-600">
              {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">{getNotificationIcon(item.type)}</Text>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">
                  {userProfile?.full_name || userProfile?.username || 'Unknown User'}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {getNotificationText(item)}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isFriendRequest ? (
          <View className="flex-row">
            <Pressable 
              className="bg-green-500 rounded-lg px-4 py-2 mr-2 flex-1"
              onPress={() => handleAcceptRequest((item.data as Friend).id)}
            >
              <Text className="text-white text-center font-semibold">Accept</Text>
            </Pressable>
            <Pressable 
              className="bg-red-500 rounded-lg px-4 py-2 flex-1"
              onPress={() => handleRejectRequest((item.data as Friend).id)}
            >
              <Text className="text-white text-center font-semibold">Reject</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable 
            className="bg-blue-500 rounded-lg px-4 py-2"
            onPress={() => item.post && handleViewPost(item.post.id)}
          >
            <Text className="text-white text-center font-semibold">View Post</Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200">
        
        <Text className="text-gray-500 text-sm mt-1">
          {notifications.length} new notification{notifications.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-16">
            <Text className="text-6xl mb-4">🔔</Text>
            <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
              No notifications yet
            </Text>
            <Text className="text-gray-400 text-center leading-6">
              When someone likes your posts, comments, or sends you a friend request, you&apos;ll see it here.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={() => loadNotifications(user.id)} 
          />
        }
      />
    </View>
  );
} 