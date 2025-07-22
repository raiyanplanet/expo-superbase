import { supabase } from '../supabase/client';
import {
    Comment,
    CreateCommentData,
    CreateFriendRequestData,
    CreatePostData,
    Friend,
    Like,
    Message,
    Post,
    Profile,
    UpdateProfileData
} from './types';

// Profile API
export const profileApi = {
  async getProfile(userId: string): Promise<Profile | null> {
    try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  },

  async ensureProfile(userId: string): Promise<Profile> {
    try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) return existingProfile;
    
    // Create profile if it doesn't exist
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: 'user_' + userId.substring(0, 8),
        full_name: 'User',
        bio: null,
        avatar_url: null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error ensuring profile:', error);
      throw error;
    }
  },

  async updateProfile(userId: string, updates: UpdateProfileData): Promise<Profile> {
    try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async searchUsers(query: string): Promise<Profile[]> {
    try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);
    
    if (error) throw error;
    return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
};

// Posts API
export const postsApi = {
  async getFeed(userId: string): Promise<Post[]> {
    try {
    // Use a simpler query instead of the complex function
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Get like counts and check if user liked each post
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
          try {
        const [likesResult, commentsResult, userLikeResult] = await Promise.all([
          supabase.from('likes').select('*').eq('post_id', post.id),
          supabase.from('comments').select('*').eq('post_id', post.id),
          supabase.from('likes').select('*').eq('post_id', post.id).eq('user_id', userId)
        ]);
        
        return {
          ...post,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          like_count: likesResult.data?.length || 0,
          comment_count: commentsResult.data?.length || 0,
          is_liked: (userLikeResult.data?.length || 0) > 0
        };
          } catch (error) {
            console.error('Error processing post:', post.id, error);
            return {
              ...post,
              username: post.profiles?.username,
              full_name: post.profiles?.full_name,
              avatar_url: post.profiles?.avatar_url,
              like_count: 0,
              comment_count: 0,
              is_liked: false
            };
          }
      })
    );
    
    return postsWithData;
    } catch (error) {
      console.error('Error getting feed:', error);
      return [];
    }
  },

  async getUserPosts(userId: string): Promise<Post[]> {
    try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(username, full_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get like counts and comment counts for each post
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
          try {
        const [likesResult, commentsResult] = await Promise.all([
          supabase.from('likes').select('*').eq('post_id', post.id),
          supabase.from('comments').select('*').eq('post_id', post.id)
        ]);
        
        return {
          ...post,
          username: post.profiles?.username,
          full_name: post.profiles?.full_name,
          avatar_url: post.profiles?.avatar_url,
          like_count: likesResult.data?.length || 0,
          comment_count: commentsResult.data?.length || 0
        };
          } catch (error) {
            console.error('Error processing user post:', post.id, error);
            return {
              ...post,
              username: post.profiles?.username,
              full_name: post.profiles?.full_name,
              avatar_url: post.profiles?.avatar_url,
              like_count: 0,
              comment_count: 0
            };
          }
      })
    );
    
    return postsWithData;
    } catch (error) {
      console.error('Error getting user posts:', error);
      return [];
    }
  },

  async createPost(userId: string, postData: CreatePostData): Promise<Post> {
    try {
    // Ensure profile exists first
    await profileApi.ensureProfile(userId);
    
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...postData, user_id: userId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  async updatePost(postId: string, updates: Partial<CreatePostData>): Promise<Post> {
    try {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    if (error) throw error;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
};

// Comments API
export const commentsApi = {
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(username, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data?.map(comment => ({
      ...comment,
      username: comment.profiles?.username,
      full_name: comment.profiles?.full_name,
      avatar_url: comment.profiles?.avatar_url
    })) || [];
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  },

  async createComment(userId: string, commentData: CreateCommentData): Promise<Comment> {
    try {
    const { data, error } = await supabase
      .from('comments')
      .insert({ ...commentData, user_id: userId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },

  async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  async deleteComment(commentId: string): Promise<void> {
    try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
};

// Likes API
export const likesApi = {
  async likePost(userId: string, postId: string): Promise<void> {
    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();
    
    if (existingLike) {
      // Like already exists, no need to insert
      return;
    }
    
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId });
    
    if (error) throw error;
  },

  async unlikePost(userId: string, postId: string): Promise<void> {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    
    if (error) throw error;
  },

  async getPostLikes(postId: string): Promise<Like[]> {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId);
    
    if (error) throw error;
    return data || [];
  }
};

// Friends API
export const friendsApi = {
  async sendFriendRequest(userId: string, friendData: CreateFriendRequestData): Promise<Friend> {
    try {
    const { data, error } = await supabase
      .from('friends')
      .insert({ requester_id: userId, addressee_id: friendData.addressee_id })
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  async acceptFriendRequest(friendId: string): Promise<Friend> {
    try {
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  async rejectFriendRequest(friendId: string): Promise<Friend> {
    try {
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'rejected' })
      .eq('id', friendId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  },

  async getFriendRequests(userId: string): Promise<Friend[]> {
    try {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        requester_profile:profiles!friends_requester_id_fkey(*),
        addressee_profile:profiles!friends_addressee_id_fkey(*)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data || [];
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  },

  async getFriends(userId: string): Promise<Friend[]> {
    try {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        requester_profile:profiles!friends_requester_id_fkey(*),
        addressee_profile:profiles!friends_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
    
    if (error) throw error;
    return data || [];
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  },

  async removeFriend(friendId: string): Promise<void> {
    try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendId);
    
    if (error) throw error;
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }
};

// Messages API
export const messagesApi = {
  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(*),
        receiver_profile:profiles!messages_receiver_id_fkey(*)
      `)
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        seen: false
      })
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(*),
        receiver_profile:profiles!messages_receiver_id_fkey(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async markMessagesAsSeen(senderId: string, receiverId: string): Promise<void> {
    const { error } = await supabase
      .rpc('mark_messages_as_seen', {
        p_sender_id: senderId,
        p_receiver_id: receiverId
      });

    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('seen', false);

    if (error) throw error;
    return count || 0;
  },

  async getUnreadCountForFriend(userId: string, friendId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', friendId)
      .eq('receiver_id', userId)
      .eq('seen', false);

    if (error) throw error;
    return count || 0;
  },

  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    if (error) throw error;
  },

  async deleteAllMessagesWithFriend(userId1: string, userId2: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`);
    if (error) throw error;
  },

  subscribeToMessages(userId1: string, userId2: string, callback: (message: Message) => void) {
    // Always use the same channel name for both users
    const sortedIds = [userId1, userId2].sort();
    const channelName = `messages:${sortedIds[0]}:${sortedIds[1]}`;
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id=eq.${userId1},receiver_id=eq.${userId2}),and(sender_id=eq.${userId2},receiver_id=eq.${userId1}))`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            console.log('Realtime: new message received', payload.new); // Debug log
            callback(payload.new as Message);
          }
        }
      )
      .subscribe();
  },

  /**
   * Subscribe to all incoming messages for a user (for global notifications/badges)
   */
  subscribeToIncomingMessages(userId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`incoming-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          console.log('Global Realtime: new incoming message', payload.new);
          callback(payload.new as Message);
        }
      )
      .subscribe();
  }
}; 

// Notifications API
export const notificationsApi = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) throw error;
  },

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  async clearAllNotifications(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },
}; 