"use client";
import LoadingSpinner from "@/components/Spinner";
import { AntDesign } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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

const { width } = Dimensions.get("window");

// Cache keys for AsyncStorage
const CACHE_KEYS = {
  POSTS: "feed_posts",
  FRIENDS: "user_friends",
  LIKED_POSTS: "liked_posts",
  LAST_FETCH: "last_feed_fetch",
};

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Refined Skeleton Components
type SkeletonBoxProps = {
  width: number;
  height: number;
  style?: object;
};

const SkeletonBox = ({ width: w, height: h, style = {} }: SkeletonBoxProps) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-w, w],
  });

  return (
    <View
      style={[
        {
          width: w,
          height: h,
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          overflow: "hidden",
        },
        style,
      ]}>
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          transform: [{ translateX }],
        }}
      />
    </View>
  );
};

const PostSkeleton = () => (
  <View className="bg-white mx-3 mb-3 rounded-xl border border-gray-100">
    <View className="p-4">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <SkeletonBox
          width={48}
          height={48}
          style={{ borderRadius: 24, marginRight: 12 }}
        />
        <View className="flex-1">
          <SkeletonBox width={120} height={16} style={{ marginBottom: 6 }} />
          <SkeletonBox width={80} height={12} />
        </View>
      </View>

      {/* Content */}
      <View className="mb-4">
        <SkeletonBox
          width={width - 80}
          height={16}
          style={{ marginBottom: 8 }}
        />
        <SkeletonBox
          width={width - 120}
          height={16}
          style={{ marginBottom: 8 }}
        />
        <SkeletonBox width={width - 160} height={16} />
      </View>

      {/* Actions */}
      <View className="flex-row pt-3 border-t border-gray-100">
        <SkeletonBox width={60} height={32} style={{ marginRight: 20 }} />
        <SkeletonBox width={60} height={32} style={{ marginRight: 20 }} />
        <SkeletonBox width={60} height={32} />
      </View>
    </View>
  </View>
);

const CreatePostSkeleton = () => (
  <View className="bg-white mx-3 mt-2 mb-3 rounded-xl border border-gray-100">
    <View className="p-4 flex-row items-center">
      <SkeletonBox
        width={40}
        height={40}
        style={{ borderRadius: 20, marginRight: 12 }}
      />
      <SkeletonBox
        width={width - 120}
        height={36}
        style={{ borderRadius: 18 }}
      />
    </View>
  </View>
);

export default function Feed() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showPostModal, setShowPostModal] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Add ref for FlatList
  const flatListRef = useRef<FlatList>(null);
  const lastFocusTime = useRef<number>(0);

  // Smooth entrance animation when content loads
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle tab focus
  useFocusEffect(
    useCallback(() => {
      const currentTime = Date.now();
      if (currentTime - lastFocusTime.current < 1000 && user && !isLoading) {
        const refreshAndScroll = async () => {
          setRefreshing(true);
          await loadFriendsAndFeed(user.id);
          setRefreshing(false);
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        };
        refreshAndScroll();
      }
      lastFocusTime.current = currentTime;
    }, [user, isLoading])
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error || !session?.user) {
          router.replace("/(auth)/login");
          return;
        }
      } catch (error) {
        console.error("Auth error:", error);
        router.replace("/(auth)/login");
      }
    };
    checkAuth();
  }, []);

  // Cache functions (simplified for demo)
  const saveToCache = async (key: string, data: any) => {
    try {
      console.log(`Caching: ${key}`);
    } catch (error) {
      console.error("Cache error:", error);
    }
  };

  const getFromCache = async (key: string) => {
    try {
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  };

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  useEffect(() => {
    const initializeFeed = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const { data } = await supabase.auth.getUser();
        if (!data.user) return;

        setUser(data.user);

        // Try cache first
        const cachedPosts = await getFromCache(CACHE_KEYS.POSTS);
        const cachedFriends = await getFromCache(CACHE_KEYS.FRIENDS);
        const lastFetch = await getFromCache(CACHE_KEYS.LAST_FETCH);

        if (
          cachedPosts &&
          cachedFriends &&
          lastFetch &&
          isCacheValid(lastFetch)
        ) {
          setPosts(cachedPosts);
          setFriends(cachedFriends);
          setIsLoading(false);
          animateIn();
          // Load fresh data in background
          loadFriendsAndFeedFromAPI(data.user.id, true);
          return;
        }

        // Load fresh data
        await loadFriendsAndFeedFromAPI(data.user.id, false);
      } catch (error) {
        console.error("Initialization error:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
        animateIn();
      }
    };

    initializeFeed();
  }, []);

  const loadFriendsAndFeedFromAPI = async (
    userId: string,
    isBackground = false
  ) => {
    try {
      const [friendsList, allPosts] = await Promise.all([
        friendsApi.getFriends(userId),
        postsApi.getFeed(userId),
      ]);

      const friendIds = friendsList.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      friendIds.push(userId);

      const filteredPosts = allPosts.filter((post) =>
        friendIds.includes(post.user_id)
      );

      setFriends(friendsList);
      setPosts(filteredPosts);

      const likedPostIds = new Set<string>();
      filteredPosts.forEach((post) => {
        if (post.is_liked) likedPostIds.add(post.id);
      });
      setLikedPosts(likedPostIds);

      // Cache the data
      await Promise.all([
        saveToCache(CACHE_KEYS.POSTS, filteredPosts),
        saveToCache(CACHE_KEYS.FRIENDS, friendsList),
        saveToCache(CACHE_KEYS.LIKED_POSTS, Array.from(likedPostIds)),
        saveToCache(CACHE_KEYS.LAST_FETCH, Date.now()),
      ]);

      setHasError(false);
    } catch (error) {
      console.error("API load error:", error);
      if (!isBackground) {
        setHasError(true);
      }
    }
  };

  const loadFriendsAndFeed = async (userId: string) => {
    await loadFriendsAndFeedFromAPI(userId, false);
  };

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    setHasError(false);
    try {
      await loadFriendsAndFeed(user.id);
    } catch (error) {
      setHasError(true);
    }
    setRefreshing(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;

    try {
      setPosting(true);
      await postsApi.createPost(user.id, { content: newPost.trim() });
      setNewPost("");
      await loadFriendsAndFeedFromAPI(user.id, false);
      setShowPostModal(false);
    } catch (error) {
      console.error("Post creation error:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      const isCurrentlyLiked = likedPosts.has(postId);

      // Optimistic update
      if (isCurrentlyLiked) {
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
      console.error("Like error:", error);
      // Revert on error
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
    }
  };

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
      <View className="bg-white mx-3 mb-3 rounded-xl shadow-sm border border-gray-50">
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-center">
            <Pressable
              className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3"
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

        <View className="px-4 pb-3">
          <Text className="text-gray-800 text-lg leading-6">
            {displayContent}
            {shouldTruncate && (
              <Text
                className="text-blue-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Read More"}
              </Text>
            )}
            {isExpanded && item.content.length > MAX_LENGTH && (
              <Text
                className="text-blue-500 font-medium"
                onPress={() => toggleExpandPost(item.id)}>
                {" Show Less"}
              </Text>
            )}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-2 px-4">
          <Text className="text-sm text-gray-500">
            {(item.like_count || 0) > 0
              ? `${item.like_count || 0} ${(item.like_count || 0) === 1 ? "like" : "likes"}`
              : ""}
          </Text>
          <Text className="text-sm text-gray-500">
            {(item.comment_count || 0) > 0
              ? `${item.comment_count || 0} ${(item.comment_count || 0) === 1 ? "comment" : "comments"}`
              : ""}
          </Text>
        </View>

        <View className="border-t border-gray-100 mx-4"></View>
        <View className="flex-row py-1">
          <Pressable
            className={`flex-1 flex-row items-center justify-center py-3 mx-2 rounded-full ${
              isLiked ? "bg-red-50" : ""
            }`}
            onPress={() => handleLikePost(item.id)}>
            <AntDesign
              name={isLiked ? "heart" : "hearto"}
              size={18}
              color={isLiked ? "#ef4444" : "#6b7280"}
            />
            <Text className="text-sm ml-1 text-gray-500">
              {(item.like_count || 0) > 0
                ? `${item.like_count || 0} ${(item.like_count || 0) === 1 ? "" : ""}`
                : ""}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center bg-blue-50 justify-center py-3 mx-2 rounded-full"
            onPress={() => router.push(`../post/${item.id}`)}>
            <AntDesign name="message1" size={18} color="#6b7280" />
            <Text className="text-sm font-medium text-gray-500 ml-2">
              {(item.comment_count || 0) > 0
                ? `${item.comment_count || 0} ${(item.comment_count || 0) === 1 ? "" : ""}`
                : ""}
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 flex-row items-center justify-center py-3 bg-gray-50 mx-2 rounded-full"
            onPress={() => router.push(`../post/${item.id}`)}>
            <AntDesign name="sharealt" size={18} color="#6b7280" />
            <Text className="ml-2 text-sm text-gray-600">Share</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Loading screen with skeletons
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <CreatePostSkeleton />
        {[1, 2, 3, 4, 5].map((i) => (
          <PostSkeleton key={i} />
        ))}
      </View>
    );
  }

  // Error state
  if (hasError) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-4xl mb-4">🔄</Text>
        <Text className="text-gray-700 text-lg font-medium text-center mb-2">
          Something went wrong
        </Text>
        <Text className="text-gray-500 text-center mb-6 leading-5">
          We couldnt load your feed. Check your connection and try again.
        </Text>
        <Pressable
          className="bg-blue-500 px-8 py-3 rounded-full"
          onPress={() => user && loadFriendsAndFeed(user.id)}>
          <Text className="text-white font-semibold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Animated content */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        {/* Create Post Section */}
        <View className="bg-white mx-3 mt-2 mb-3 rounded-xl shadow-sm border border-gray-50">
          <Pressable
            onPress={() => setShowPostModal(true)}
            className="p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center mr-3">
              <Text className="text-lg font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="bg-gray-100 rounded-full px-4 py-3 text-base text-gray-500">
                Whats on your mind?
              </Text>
            </View>
          </Pressable>
        </View>

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
              colors={["#3B82F6"]}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-5xl mb-4">
                {friends.length === 0 ? "👥" : "📭"}
              </Text>
              <Text className="text-gray-600 text-lg font-medium text-center mb-2">
                {friends.length === 0 ? "No friends yet" : "No posts to show"}
              </Text>
              <Text className="text-gray-500 text-center leading-5">
                {friends.length === 0
                  ? "Add friends to see their posts in your feed"
                  : "When your friends post, you'll see their updates here"}
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostModal(false)}>
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <Pressable onPress={() => setShowPostModal(false)}>
              <Text className="text-gray-600 text-base font-medium">
                Cancel
              </Text>
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900">
              Create post
            </Text>
            <Pressable
              className={`px-6 py-2 rounded-lg ${
                newPost.trim() && !posting ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={handleCreatePost}
              disabled={posting || !newPost.trim()}>
              <Text
                className={`font-semibold text-sm ${
                  newPost.trim() && !posting ? "text-white" : "text-gray-400"
                }`}>
                {posting ? <LoadingSpinner /> : "Post"}
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <View className="flex-1 bg-white">
            {/* User Info */}
            <View className="flex-row items-center px-4 py-3">
              <View className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                <Text className="text-lg font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
              <View>
                <Text className="font-semibold text-gray-900 text-base">
                  {user?.full_name || user?.email || "User"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-gray-200 px-2 py-1 rounded flex-row items-center">
                    <Text className="text-xs text-gray-600 mr-1">🌍</Text>
                    <Text className="text-xs text-gray-600 font-medium">
                      Public
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Text Input */}
            <View className="px-4">
              <TextInput
                className="text-lg text-gray-800 max-h-[300px] min-h-[120px]"
                placeholder="What's on your mind?"
                placeholderTextColor="#9CA3AF"
                value={newPost}
                onChangeText={setNewPost}
                multiline
                textAlignVertical="top"
                autoFocus
                style={{
                  fontSize: 18,
                  lineHeight: 24,
                }}
              />
            </View>

            {/* Bottom Actions */}
            <View className="border-t border-gray-200 bg-white">
              <View className="px-4 py-3">
                <Text className="text-base font-medium text-gray-900 mb-3">
                  Add to your post
                </Text>
                <View className="flex-row flex-wrap items-center justify-between">
                  <Pressable className="flex-row items-center bg-gray-50 px-4 py-2 rounded-lg flex-1 mr-2">
                    <Text className="text-2xl mr-2">📷</Text>
                    <Text className="text-gray-700 font-medium">
                      Photo/Video
                    </Text>
                  </Pressable>
                  <Pressable className="flex-row items-center bg-gray-50 px-4 py-2 rounded-lg flex-1 ml-2">
                    <Text className="text-2xl mr-2">😊</Text>
                    <Text className="text-gray-700 font-medium">Feeling</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
