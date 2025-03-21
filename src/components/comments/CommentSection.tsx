
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/ui/UserAvatar';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  is_anonymous: boolean;
  created_at: string;
  profiles?: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    created_at: string;
    default_anonymous: boolean | null;
  };
}

interface CommentSectionProps {
  contentId: string;
  contentType: 'post' | 'poll';
}

const CommentSection = ({ contentId, contentType }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!contentId) {
      console.error('No content ID provided to CommentSection');
      setIsLoading(false);
      return;
    }
    
    fetchComments();
    
    // Set anonymous status based on user's default preference
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
    }
    
    // Subscribe to changes
    const channel = supabase
      .channel(`comments:${contentType}:${contentId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'comments',
        filter: contentType === 'post' 
          ? `post_id=eq.${contentId}` 
          : `poll_id=eq.${contentId}`
      }, () => {
        fetchComments();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, contentType, user]);

  const fetchComments = async () => {
    if (!contentId) return;
    
    setIsLoading(true);
    setFetchError(null);
    
    try {
      console.log(`Fetching comments for ${contentType} ID: ${contentId}`);
      
      // Fixed the query to properly join with profiles
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          author_id,
          is_anonymous,
          created_at,
          profiles(
            id,
            name,
            username,
            email,
            image,
            created_at,
            default_anonymous
          )
        `)
        .eq(contentType === 'post' ? 'post_id' : 'poll_id', contentId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }
      
      console.log('Fetched comments:', data);
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      setFetchError(error.message);
      toast({
        title: "Error",
        description: "Failed to load comments. Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to comment.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }
    
    if (!contentId) {
      toast({
        title: "Error",
        description: "Content ID is missing. Cannot add comment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log(`Adding comment to ${contentType} ID: ${contentId}`);
      
      const commentData = {
        content: newComment.trim(),
        author_id: user.id,
        is_anonymous: isAnonymous,
        [contentType === 'post' ? 'post_id' : 'poll_id']: contentId
      };
      
      console.log('Comment data:', commentData);
      
      // Insert the comment
      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select();
      
      if (error) throw error;
      
      // Fetch the profile data for the new comment
      if (newCommentData && newCommentData.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        const newCommentWithProfile = {
          ...newCommentData[0],
          profiles: profileData
        };
        
        setComments([...comments, newCommentWithProfile]);
        setNewComment('');
        
        toast({
          title: "Comment added",
          description: "Your comment has been posted successfully.",
        });
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);
      
      if (error) throw error;
      
      setComments(comments.filter(comment => comment.id !== commentId));
      
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (fetchError) {
    return (
      <div className="border-t px-4 py-3">
        <h3 className="text-sm font-medium mb-3">Comments</h3>
        <div className="text-center py-4">
          <p className="text-sm text-destructive">Failed to load comments. Please refresh and try again.</p>
          <button 
            onClick={fetchComments}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t px-4 py-3">
      <h3 className="text-sm font-medium mb-3">Comments</h3>
      
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-muted rounded"></div>
                <div className="h-3 w-3/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4 mb-4 max-h-80 overflow-y-auto">
          {comments.map(comment => {
            const isAuthor = user && user.id === comment.author_id;
            const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
            
            return (
              <div key={comment.id} className="flex items-start gap-2">
                <UserAvatar 
                  user={comment.is_anonymous ? null : comment.profiles ? {
                    id: comment.profiles.id,
                    name: comment.profiles.name || "",
                    username: comment.profiles.username || "",
                    email: comment.profiles.email || "",
                    image: comment.profiles.image,
                    createdAt: new Date(comment.profiles.created_at),
                    defaultAnonymous: comment.profiles.default_anonymous || false
                  } : null} 
                  isAnonymous={comment.is_anonymous}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="bg-muted/50 rounded-lg p-2 relative">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-medium">
                        {comment.is_anonymous ? 'Anonymous' : comment.profiles?.name || comment.profiles?.username || 'Unknown User'}
                      </p>
                      {isAuthor && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-full -mt-1 -mr-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm mt-1">{comment.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {user ? (
        <form onSubmit={handleSubmitComment} className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="anonymous-comment-toggle" className="flex items-center gap-2 cursor-pointer text-xs">
              <div className="relative">
                <input
                  type="checkbox"
                  id="anonymous-comment-toggle"
                  className="sr-only"
                  checked={isAnonymous}
                  onChange={() => setIsAnonymous(!isAnonymous)}
                />
                <div className={`block w-8 h-5 rounded-full transition-colors ${isAnonymous ? 'bg-primary' : 'bg-muted'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isAnonymous ? 'translate-x-3' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-muted-foreground">Comment anonymously</span>
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <UserAvatar 
              user={isAnonymous ? null : user}
              isAnonymous={isAnonymous}
              size="sm"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 pr-10 text-sm border rounded-full bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-sm text-center text-muted-foreground mt-2">
          Please log in to leave a comment.
        </p>
      )}
    </div>
  );
};

export default CommentSection;
