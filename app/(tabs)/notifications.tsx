'use client';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { friendsApi } from '../../lib/api';
import { Friend } from '../../lib/types';
import { supabase } from '../../supabase/client';

export default function Notifications() {
  const [user, setUser] = useState<any>(null);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login');
      else {
        setUser(data.user);
        loadFriendRequests(data.user.id);
      }
    });
  }, []);

  const loadFriendRequests = async (userId: string) => {
    try {
      setLoading(true);
      const requests = await friendsApi.getFriendRequests(userId);
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await friendsApi.acceptFriendRequest(friendId);
      await loadFriendRequests(user.id);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      await friendsApi.rejectFriendRequest(friendId);
      await loadFriendRequests(user.id);
      Alert.alert('Success', 'Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const renderNotification = ({ item }: { item: Friend }) => {
    const requesterProfile = item.requester_profile;
    if (!requesterProfile) return null;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <View className="flex-row items-center mb-3">
          <View className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mr-3">
            <Text className="text-lg font-bold text-blue-600">
              {requesterProfile.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold">{requesterProfile.full_name || requesterProfile.username || 'Unknown User'}</Text>
            <Text className="text-gray-500 text-sm">sent you a friend request</Text>
            <Text className="text-gray-400 text-xs">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View className="flex-row">
          <Pressable 
            className="bg-green-500 rounded-lg px-4 py-2 mr-2 flex-1"
            onPress={() => handleAcceptRequest(item.id)}
          >
            <Text className="text-white text-center font-semibold">Accept</Text>
          </Pressable>
          <Pressable 
            className="bg-red-500 rounded-lg px-4 py-2 flex-1"
            onPress={() => handleRejectRequest(item.id)}
          >
            <Text className="text-white text-center font-semibold">Reject</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={friendRequests}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500 text-center">No notifications</Text>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={() => loadFriendRequests(user.id)} 
          />
        }
      />
    </View>
  );
} 