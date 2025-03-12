
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
  author?: {
    id: string;
    name: string;
    username: string;
    email: string;
    image?: string;
    created_at: string;
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
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    
    // Set anonymous status based on user's default preference
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
    }
  }, [contentId, contentType, user]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          author_id,
          is_anonymous,
          created_at,
          profiles:author_id (
            id,
            name,
            username,
            email,
            image,
            created_at
          )
        `)
        .eq(contentType === 'post' ? 'post_id' : 'poll_id', contentId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments.",
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
    
    setIsSubmitting(true);
    
    try {
      const commentData = {
        content: newComment.trim(),
        author_id: user.id,
        is_anonymous: isAnonymous,
        [contentType === 'post' ? 'post_id' : 'poll_id']: contentId
      };
      
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          id,
          content,
          author_id,
          is_anonymous,
          created_at,
          profiles:author_id (
            id,
            name,
            username,
            email,
            image,
            created_at
          )
        `);
      
      if (error) throw error;
      
      if (data) {
        setComments([...comments, ...data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Error",
        description: "Failed to submit comment.",
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
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive",
      });
    }
  };

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
                  user={comment.is_anonymous ? null : comment.author ? {
                    id: comment.author.id,
                    name: comment.author.name,
                    username: comment.author.username,
                    email: comment.author.email,
                    image: comment.author.image,
                    createdAt: new Date(comment.author.created_at)
                  } : null} 
                  isAnonymous={comment.is_anonymous}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="bg-muted/50 rounded-lg p-2 relative">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-medium">
                        {comment.is_anonymous ? 'Anonymous' : comment.author?.name}
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
