"use client";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { commentsApi, likesApi } from "../../lib/api";
import { Comment, Post } from "../../lib/types";
import { supabase } from "../../supabase/client";

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadData();

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUser(userData.user);

      await Promise.all([loadPost(userData.user.id), loadComments()]);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load post data");
    } finally {
      setLoading(false);
    }
  };

  const loadPost = async (userId?: string) => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey(username, full_name, avatar_url)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      const [likesResult, commentsResult, userLikeResult] = await Promise.all([
        supabase.from("likes").select("id").eq("post_id", id),
        supabase.from("comments").select("id").eq("post_id", id),
        userId
          ? supabase
              .from("likes")
              .select("id")
              .eq("post_id", id)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setPost({
        ...data,
        username: data.profiles?.username,
        full_name: data.profiles?.full_name,
        avatar_url: data.profiles?.avatar_url,
        like_count: likesResult.data?.length || 0,
        comment_count: commentsResult.data?.length || 0,
        is_liked: !!userLikeResult.data,
      });
    } catch (error) {
      console.error("Error loading post:", error);
      throw error;
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const commentsData = await commentsApi.getPostComments(id);
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
      throw error;
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      await Promise.all([loadPost(user.id), loadComments()]);
    } catch (error) {
      Alert.alert("Error", "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [user, id]);

  const handleLike = async () => {
    if (!user || !post || likeLoading) return;

    try {
      setLikeLoading(true);
      const isCurrentlyLiked = post.is_liked;

      // Optimistic update
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_liked: !isCurrentlyLiked,
              like_count: isCurrentlyLiked
                ? Math.max(0, (prev.like_count || 1) - 1)
                : (prev.like_count || 0) + 1,
            }
          : null
      );

      // API call
      if (isCurrentlyLiked) {
        await likesApi.unlikePost(user.id, post.id);
      } else {
        await likesApi.likePost(user.id, post.id);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_liked: post.is_liked,
              like_count: post.like_count,
            }
          : null
      );
      Alert.alert("Error", "Failed to update like");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleComment = async () => {
    if (!user || !post || !newComment.trim() || commentLoading) return;

    const commentContent = newComment.trim();

    try {
      setCommentLoading(true);

      // Create optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        post_id: post.id,
        user_id: user.id,
        content: commentContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
      };

      // Add optimistic comment and update count
      setComments((prev) => [...prev, optimisticComment]);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: (prev.comment_count || 0) + 1,
            }
          : null
      );
      setNewComment("");

      // Scroll to new comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // API call
      const newCommentData = await commentsApi.createComment(user.id, {
        post_id: post.id,
        content: commentContent,
      });

      // Replace optimistic comment with real one
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === optimisticComment.id ? newCommentData : comment
        )
      );
    } catch (error) {
      console.error("Error creating comment:", error);
      // Revert optimistic updates
      setComments((prev) =>
        prev.filter((comment) => comment.id !== `temp-${Date.now()}`)
      );
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: Math.max(0, (prev.comment_count || 1) - 1),
            }
          : null
      );
      setNewComment(commentContent); // Restore comment text
      Alert.alert("Error", "Failed to post comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!commentId.startsWith("temp-")) {
      Alert.alert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // Optimistic update
                const commentToDelete = comments.find(
                  (c) => c.id === commentId
                );
                setComments((prev) =>
                  prev.filter((comment) => comment.id !== commentId)
                );
                setPost((prev) =>
                  prev
                    ? {
                        ...prev,
                        comment_count: Math.max(
                          0,
                          (prev.comment_count || 1) - 1
                        ),
                      }
                    : null
                );

                await commentsApi.deleteComment(commentId);
              } catch (error) {
                console.error("Error deleting comment:", error);
                // Revert if failed
                const commentToDelete = comments.find(
                  (c) => c.id === commentId
                );
                if (commentToDelete) {
                  setComments((prev) =>
                    [...prev, commentToDelete].sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    )
                  );
                  setPost((prev) =>
                    prev
                      ? {
                          ...prev,
                          comment_count: (prev.comment_count || 0) + 1,
                        }
                      : null
                  );
                }
                Alert.alert("Error", "Failed to delete comment");
              }
            },
          },
        ]
      );
    }
  };

  const handleInputFocus = () => {
    setTimeout(
      () => {
        flatListRef.current?.scrollToEnd({ animated: true });
      },
      Platform.OS === "ios" ? 300 : 500
    );
  };

  const renderHeader = () => {
    if (!post) return null;

    return (
      <View className="bg-white mb-2">
        {/* Post Content */}
        <View className="p-4">
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3 shadow-sm">
              <Text className="text-xl font-bold text-white">
                {post.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 text-base">
                {post.full_name || post.username || "Unknown User"}
              </Text>
              <Text className="text-gray-500 text-sm">
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          <Text className="text-gray-800 text-base leading-6 mb-4">
            {post.content}
          </Text>

          {/* Engagement Stats */}
          <View className="flex-row justify-between items-center py-2 border-t border-gray-100">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500">
                {(post.like_count || 0) > 0
                  ? `${post.like_count || 0} ${(post.like_count || 0) === 1 ? "like" : "likes"}`
                  : "0 likes"}
              </Text>
            </View>
            <Text className="text-sm text-gray-500">
              {(post.comment_count || 0) > 0
                ? `${post.comment_count || 0} ${(post.comment_count || 0) === 1 ? "comment" : "comments"}`
                : "0 comments"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="border-t border-gray-100 pt-2 mt-2">
            <View className="flex-row justify-around">
              <Pressable
                className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-full active:bg-gray-50 ${
                  post.is_liked ? "bg-red-50" : ""
                }`}
                onPress={handleLike}
                disabled={likeLoading}>
                <Text
                  className={`text-xl mr-2 ${
                    post.is_liked ? "" : "opacity-60"
                  }`}>
                  {post.is_liked ? (
                    <AntDesign name="heart" size={20} color="red" />
                  ) : (
                    <AntDesign name="hearto" size={20} color="black" />
                  )}
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-full bg-blue-50"
                onPress={() => textInputRef.current?.focus()}>
                <AntDesign name="message1" size={20} color="black" />
                <Text className="ml-2 text-gray-800">
                  {post.comment_count || 0} {post.comment_count === 1 ? "" : ""}
                </Text>
              </Pressable>

              <Pressable className="flex-1 flex-row items-center justify-center py-3 mx-1 rounded-full bg-gray-50">
                <AntDesign name="sharealt" size={20} color="black" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Comments Header */}
        <View className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <Text className="font-semibold text-gray-700">
            Comments {comments.length > 0 ? `(${comments.length})` : ""}
          </Text>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View className="bg-white px-4 py-3">
      <View className="flex-row items-start gap-2 bg-gray-50 p-3">
        <View className="w-8 h-8 rounded-full m-2 bg-blue-500 flex items-center justify-center mr-3 ">
          <Text className="text-sm font-bold text-white">
            {item.username?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-bold text-sm text-gray-900">
              {item.full_name || item.username || "Unknown User"}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-xs">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {user && item.user_id === user.id && (
                <Pressable
                  onPress={() => handleDeleteComment(item.id)}
                  className="ml-2 w-6 h-6 rounded-full  flex items-center justify-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <FontAwesome name="trash-o" size={20} color="red" />
                </Pressable>
              )}
            </View>
          </View>
          <Text className="text-gray-800 text-base leading-5">
            {item.content}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyComments = () => (
    <View className="bg-white p-8 items-center">
      <AntDesign name="message1" size={24} color="black" />
      <Text className="text-gray-500 mt-2">No comments yet</Text>
      <Text className="text-gray-400 text-sm mt-1">
        Be the first to comment!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">Post not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={30}>
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-4 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-blue-500 text-xl">←</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Post</Text>
        </View>

        {/* Content */}
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComments}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: keyboardHeight > 0 ? 20 : 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {/* Comment Input */}
        {user && (
          <View
            className="bg-white border-t border-gray-200"
            style={{
              paddingBottom: Platform.OS === "ios" ? 20 : 16,
              paddingTop: 16,
              paddingHorizontal: 16,
            }}>
            <View className="flex-row items-end">
              <View className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center mr-3 mb-1">
                <Text className="text-sm font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
              <TextInput
                ref={textInputRef}
                className="flex-1 border border-gray-300 rounded-full px-4 py-4 mr-3  max-h-[100px]"
                placeholder="Write a comment..."
                placeholderTextColor="#9CA3AF"
                value={newComment}
                onChangeText={setNewComment}
                onFocus={handleInputFocus}
                multiline
                maxLength={500}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
              />
              <Pressable
                className={`rounded-full px-6 py-4 ${
                  newComment.trim() && !commentLoading
                    ? "bg-blue-500"
                    : "bg-gray-300"
                }`}
                onPress={handleComment}
                disabled={!newComment.trim() || commentLoading}>
                <Text
                  className={`font-medium text-sm ${
                    newComment.trim() && !commentLoading
                      ? "text-white"
                      : "text-gray-500"
                  }`}>
                  {commentLoading ? "..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
