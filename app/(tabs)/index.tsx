"use client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { friendsApi, postsApi } from "../../lib/api";
import { Post } from "../../lib/types";
import { supabase } from "../../supabase/client";

export default function Feed() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
          await loadFriendsAndFeed(data.user.id);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  const loadFriendsAndFeed = async (userId: string) => {
    try {
      setLoading(true);
      const friendsList = await friendsApi.getFriends(userId);
      setFriends(friendsList);
      // Get all friend user IDs
      const friendIds = friendsList.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      // Optionally include the user's own posts in their feed:
      friendIds.push(userId);
      // Fetch all posts, then filter to only those from friends (and self)
      const allPosts = await postsApi.getFeed(userId);
      const filteredPosts = allPosts.filter((post) =>
        friendIds.includes(post.user_id)
      );
      setPosts(filteredPosts);
    } catch (error) {
      console.error("Error loading feed or friends:", error);
      Alert.alert("Error", "Failed to load posts or friends");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadFriendsAndFeed(user.id);
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;

    try {
      setLoading(true);
      await postsApi.createPost(user.id, { content: newPost.trim() });
      setNewPost("");
      await loadFriendsAndFeed(user.id);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View className="bg-white mx-3 mb-2 rounded-xl shadow-sm border border-gray-100">
      {/* Post Header */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3 shadow-sm">
            <Text className="text-xl font-bold text-white">
              {item.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-base">
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
          <Pressable className="p-2">
            <Text className="text-gray-400 text-xl">⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* Post Content */}
      <View className="px-4 pb-3">
        <Text className="text-gray-800 text-base leading-6">
          {item.content}
        </Text>
      </View>

      {/* Engagement Stats */}
      <View className="px-4 pb-2">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500">
              {(item.like_count ?? 0) > 0
                ? `${item.like_count ?? 0} ${(item.like_count ?? 0) === 1 ? "like" : "likes"}`
                : ""}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            {(item.comment_count ?? 0) > 0
              ? `${item.comment_count ?? 0} ${(item.comment_count ?? 0) === 1 ? "comment" : "comments"}`
              : ""}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="border-t border-gray-100 mx-4"></View>
      <View className="flex-row justify-around py-2">
        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-lg active:bg-gray-50"
          onPress={() => router.push(`../post/${item.id}`)}>
          <Text className="text-xl mr-2">👍</Text>
          <Text className="text-gray-600 font-medium">Like</Text>
        </Pressable>

        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-lg active:bg-gray-50"
          onPress={() => router.push(`../post/${item.id}`)}>
          <Text className="text-xl mr-2">💬</Text>
          <Text className="text-gray-600 font-medium">Comment</Text>
        </Pressable>

        <Pressable
          className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-lg active:bg-gray-50"
          onPress={() => router.push(`../post/${item.id}`)}>
          <Text className="text-xl mr-2">📤</Text>
          <Text className="text-gray-600 font-medium">Share</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 16, color: '#6b7280' }}>Loading feed...</Text>
      </View>
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-100">
      {/* Create Post Section */}
      <View className="bg-white mx-3 mt-2 mb-2 rounded-xl shadow-sm border border-gray-100">
        <View className="p-4">
          {/* User Avatar and Input */}
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center mr-3">
              <Text className="text-lg font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || "U"}
                
              </Text>
            </View>
            <View className="flex-1">
              <TextInput
                className="bg-gray-100 rounded-full px-4 py-3 text-base"
                placeholder="What's on your mind?"
                value={newPost}
                onChangeText={setNewPost}
                multiline={false}
                style={{ maxHeight: 100 }}
              />
            </View>
          </View>

          {/* Expanded Text Area (when typing) */}
          {newPost.trim() && (
            <View className="mb-3">
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-base min-h-20"
                placeholder="Share your thoughts..."
                value={newPost}
                onChangeText={setNewPost}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Action Row */}
          <View className="border-t border-gray-100 pt-3 mt-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row">
                <Pressable className="flex-row items-center mr-6 py-2">
                  <Text className="text-lg mr-2">📷</Text>
                  <Text className="text-gray-600 font-medium">Photo</Text>
                </Pressable>
                <Pressable className="flex-row items-center mr-6 py-2">
                  <Text className="text-lg mr-2">😊</Text>
                  <Text className="text-gray-600 font-medium">Feeling</Text>
                </Pressable>
              </View>

              <Pressable
                className={`px-6 py-2 rounded-full ${
                  newPost.trim() && !loading ? "bg-blue-500" : "bg-gray-300"
                }`}
                onPress={handleCreatePost}
                disabled={loading || !newPost.trim()}>
                <Text
                  className={`font-semibold ${
                    newPost.trim() && !loading ? "text-white" : "text-gray-500"
                  }`}>
                  {loading ? "Posting..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          friends.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-6xl mb-4">👥</Text>
              <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
                Your feed is empty
              </Text>
              <Text className="text-gray-400 text-center leading-6">
                Add friends to see their posts here!
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-6xl mb-4">📭</Text>
              <Text className="text-gray-500 text-xl font-semibold text-center mb-2">
                No posts from your friends yet
              </Text>
              <Text className="text-gray-400 text-center leading-6">
                When your friends post, youll see them here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
