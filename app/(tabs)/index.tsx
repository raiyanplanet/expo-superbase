"use client";
import { AntDesign } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { friendsApi, likesApi, postsApi } from "../../lib/api";
import { Post } from "../../lib/types";
import { supabase } from "../../supabase/client";

// Cache keys for AsyncStorage
const CACHE_KEYS = {
  POSTS: "feed_posts",
  FRIENDS: "user_friends",
  LIKED_POSTS: "liked_posts",
  LAST_FETCH: "last_feed_fetch",
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export default function Feed() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set()); // Track expanded posts
  const [showPostModal, setShowPostModal] = useState(false); // For post input modal

  // Add ref for FlatList
  const flatListRef = useRef<FlatList>(null);
  const lastFocusTime = useRef<number>(0);

  // Handle tab focus - refresh and scroll to top when tab is pressed multiple times
  useFocusEffect(
    useCallback(() => {
      const currentTime = Date.now();

      // If the tab was focused again within 1 second, refresh and scroll to top
      if (currentTime - lastFocusTime.current < 1000 && user) {
        const refreshAndScroll = async () => {
          setRefreshing(true);
          await loadFriendsAndFeed(user.id);
          setRefreshing(false);

          // Scroll to top
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        };

        refreshAndScroll();
      }

      lastFocusTime.current = currentTime;
    }, [user])
  );

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          router.replace("/(auth)/login");
          return;
        }

        if (session?.user) {
          console.log("User authenticated, redirecting to tabs");
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (error) {
        console.error("Error in checkAuthAndRedirect:", error);
        router.replace("/(auth)/login");
      }
    };

    // Add a small delay to prevent flash
    const timer = setTimeout(() => {
      checkAuthAndRedirect();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Cache management functions (replace with AsyncStorage in your actual app)
  const saveToCache = async (key: string, data: any) => {
    try {
      // In your actual app, use: await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`Saving to cache: ${key}`, data);
    } catch (error) {
      console.error("Cache save error:", error);
    }
  };

  const getFromCache = async (key: string) => {
    try {
      // In your actual app, use:
      // const data = await AsyncStorage.getItem(key);
      // return data ? JSON.parse(data) : null;
      console.log(`Getting from cache: ${key}`);
      return null; // Placeholder - replace with actual AsyncStorage
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  };

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  useEffect(() => {
    const loadFriendsAndFeedWithCache = async (userId: string) => {
      try {
        // Try to load from cache first
        const cachedPosts = await getFromCache(CACHE_KEYS.POSTS);
        const cachedFriends = await getFromCache(CACHE_KEYS.FRIENDS);
        const cachedLikedPosts = await getFromCache(CACHE_KEYS.LIKED_POSTS);
        const lastFetch = await getFromCache(CACHE_KEYS.LAST_FETCH);

        // If cache is valid, use cached data
        if (
          cachedPosts &&
          cachedFriends &&
          lastFetch &&
          isCacheValid(lastFetch)
        ) {
          setPosts(cachedPosts);
          setFriends(cachedFriends);
          if (cachedLikedPosts) {
            setLikedPosts(new Set(cachedLikedPosts));
          }
          console.log("Loaded from cache");
          // Still fetch fresh data in background
          loadFriendsAndFeedFromAPI(userId, true);
          return;
        }
        // If no valid cache, load from API
        await loadFriendsAndFeedFromAPI(userId, false);
      } catch (error) {
        console.error("Error loading with cache:", error);
        await loadFriendsAndFeedFromAPI(userId, false);
      }
    };

    const loadUserData = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
          await loadFriendsAndFeedWithCache(data.user.id);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadUserData();
  }, []);

  const loadFriendsAndFeedFromAPI = async (
    userId: string,
    isBackgroundRefresh: boolean = false
  ) => {
    try {
      if (!isBackgroundRefresh) {
        console.log("Loading from API...");
      }

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

      // Track which posts the user has liked
      const likedPostIds = new Set<string>();
      for (const post of filteredPosts) {
        if (post.is_liked) {
          likedPostIds.add(post.id);
        }
      }
      setLikedPosts(likedPostIds);

      // Save to cache
      await saveToCache(CACHE_KEYS.POSTS, filteredPosts);
      await saveToCache(CACHE_KEYS.FRIENDS, friendsList);
      await saveToCache(CACHE_KEYS.LIKED_POSTS, Array.from(likedPostIds));
      await saveToCache(CACHE_KEYS.LAST_FETCH, Date.now());

      if (!isBackgroundRefresh) {
        console.log("Data loaded and cached");
      }
    } catch (error) {
      console.error("Error loading feed or friends:", error);
      if (!isBackgroundRefresh) {
        Alert.alert("Error", "Failed to load posts or friends");
      }
    }
  };

  const loadFriendsAndFeed = async (userId: string) => {
    await loadFriendsAndFeedFromAPI(userId, false);
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
      setPosting(true);
      await postsApi.createPost(user.id, { content: newPost.trim() });
      setNewPost("");
      // Refresh feed and update cache
      await loadFriendsAndFeedFromAPI(user.id, false);
      setShowPostModal(false); // Close modal after posting
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      const isCurrentlyLiked = likedPosts.has(postId);

      // Optimistically update UI first
      if (isCurrentlyLiked) {
        // Unlike the post
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  like_count: Math.max(0, (post.like_count || 0) - 1),
                  is_liked: false,
                }
              : post
          )
        );
        await likesApi.unlikePost(user.id, postId);
      } else {
        // Like the post
        setLikedPosts((prev) => new Set(prev).add(postId));
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  like_count: (post.like_count || 0) + 1,
                  is_liked: true,
                }
              : post
          )
        );
        await likesApi.likePost(user.id, postId);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      const isCurrentlyLiked = likedPosts.has(postId);
      if (!isCurrentlyLiked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  like_count: Math.max(0, (post.like_count || 0) - 1),
                  is_liked: false,
                }
              : post
          )
        );
      } else {
        setLikedPosts((prev) => new Set(prev).add(postId));
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  like_count: (post.like_count || 0) + 1,
                  is_liked: true,
                }
              : post
          )
        );
      }
      Alert.alert("Error", "Failed to update like");
    }
  };

  // Add this function to toggle expanded state for posts
  const toggleExpandPost = (postId: string) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = likedPosts.has(item.id);
    const MAX_LENGTH = 200;
    const isExpanded = expandedPosts.has(item.id);
    const shouldTruncate = item.content.length > MAX_LENGTH && !isExpanded;
    const displayContent = shouldTruncate
      ? item.content.slice(0, MAX_LENGTH) + "..."
      : item.content;

    return (
      <View className="bg-white mx-3 mb-2 rounded-xl shadow-sm border border-gray-100">
        {/* Post Header */}
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-center">
            <Pressable
              className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3 shadow-sm"
              onPress={() => router.push(`/user/${item.user_id}` as any)}>
              <Text className="text-xl font-bold text-white">
                {item.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </Pressable>
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
          <Text className="text-gray-800 text-xl leading-6">
            {displayContent}
            {shouldTruncate && (
              <Text
                className="text-purple-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Read More"}
              </Text>
            )}
            {isExpanded && item.content.length > MAX_LENGTH && (
              <Text
                className="text-purple-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Show Less"}
              </Text>
            )}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-2 px-3">
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500">
              {(item.like_count || 0) > 0
                ? `${item.like_count || 0} ${(item.like_count || 0) === 1 ? "like" : "likes"}`
                : "0 likes"}
            </Text>
          </View>
          <Text className="text-sm text-gray-500">
            {(item.comment_count || 0) > 0
              ? `${item.comment_count || 0} ${(item.comment_count || 0) === 1 ? "comment" : "comments"}`
              : "0 comments"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="border-t border-gray-100 mx-4"></View>
        <View className="flex-row justify-around py-2">
          <Pressable
            className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-full active:bg-red-50 bg-gray-50 ${
              isLiked ? "bg-red-50" : ""
            }`}
            onPress={() => handleLikePost(item.id)}>
            <Text
              className={`text-xl mr-2 ${isLiked ? "text-red-500" : "text-gray-600"}`}>
              {isLiked ? (
                <AntDesign name="heart" size={20} color="red" />
              ) : (
                <AntDesign name="hearto" size={20} color="gray" />
              )}
            </Text>
            <Text className="text-md text-gray-500">
              {item.like_count ?? 0}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center  px-3 py-2 rounded-full mx-1  active:bg-gray-50 bg-blue-50"
            onPress={() => router.push(`../post/${item.id}`)}>
            <AntDesign name="message1" size={20} color="black" />
            <Text className="text-md text-gray-500 ml-2">
              {item.comment_count ?? 0}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-full bg-gray-50"
            onPress={() => router.push(`../post/${item.id}`)}>
            <AntDesign name="sharealt" size={20} color="black" />
          </Pressable>
        </View>
      </View>
    );
  };

  // Show loading while checking authentication and loading data
  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-gray-600">Loading feed...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {/* Create Post Section */}
      <View className="bg-white mx-3 mt-2 mb-2 rounded-xl shadow-sm border border-gray-100">
        <Pressable
          onPress={() => setShowPostModal(true)}
          className="p-4 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center mr-3">
            <Text className="text-lg font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="bg-gray-100 rounded-full px-4 py-3 text-base text-gray-500">
              {"What's on your mind?"}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Post Input Modal */}
      <Modal
        visible={showPostModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowPostModal(false)}>
        <View className="flex-1 bg-black bg-opacity-40">
          <View className="flex-1 bg-white pt-8 px-4 pb-4">
            <Pressable
              className="absolute top-4 right-4 z-10 p-2"
              onPress={() => setShowPostModal(false)}>
              <Text className="text-3xl text-gray-400">×</Text>
            </Pressable>
            <View className="flex-row items-center mb-6 mt-2">
              <View className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center mr-3">
                <Text className="text-lg font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
              <Text className="font-semibold text-gray-900 text-base">
                {user?.full_name || user?.email || "User"}
              </Text>
            </View>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-base min-h-32 max-h-32 mb-3"
              placeholder="What's on your mind?"
              placeholderTextColor="#9CA3AF"
              value={newPost}
              onChangeText={setNewPost}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <View className="flex-row justify-between items-center mt-2">
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
                  newPost.trim() && !posting ? "bg-blue-500" : "bg-gray-300"
                }`}
                onPress={handleCreatePost}
                disabled={posting || !newPost.trim()}>
                <Text
                  className={`font-semibold ${
                    newPost.trim() && !posting ? "text-white" : "text-gray-500"
                  }`}>
                  {posting ? "Posting..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Posts Feed */}
      <FlatList
        ref={flatListRef}
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
