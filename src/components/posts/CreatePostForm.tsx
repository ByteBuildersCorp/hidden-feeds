import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import { User, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CreatePostForm = () => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
    }
  }, [user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create a post.",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Cannot create post",
        description: "Please enter some content for your post.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          author_id: user.id,
          is_anonymous: isAnonymous,
        })
        .select()
        .single();
      
      if (postError) throw postError;

      if (aiFeedback) {
        const { error: commentError } = await supabase
          .from('comments')
          .insert({
            content: aiFeedback,
            author_id: user.id,
            post_id: postData.id,
            is_anonymous: true,
          });

        if (commentError) throw commentError;
      }
      
      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        description: "There was an error publishing your post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    navigate(-1);
  };

  const getFeedback = async () => {
    if (!content.trim()) {
      toast({
        title: "Cannot get feedback",
        description: "Please enter some content first.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingFeedback(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          type: 'post'
        }),
      });

      const data = await response.json();
      setAiFeedback(data.feedback);
    } catch (error) {
      console.error('Error getting feedback:', error);
      toast({
        title: "Failed to get feedback",
        description: "There was an error getting AI feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGettingFeedback(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-center">Create Post</h1>
        
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <UserAvatar user={user} isAnonymous={isAnonymous} />
              {isAnonymous && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <User size={12} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{isAnonymous ? 'Anonymous' : user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <label htmlFor="anonymous-toggle" className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="anonymous-toggle"
                      className="sr-only"
                      checked={isAnonymous}
                      onChange={() => setIsAnonymous(!isAnonymous)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Post anonymously</span>
                </label>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full min-h-[150px] p-3 rounded-md border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            
            {aiFeedback && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">AI Suggestion:</p>
                <p className="text-sm text-muted-foreground">{aiFeedback}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center gap-3 mt-4">
              <button
                type="button"
                onClick={getFeedback}
                disabled={isGettingFeedback || !content.trim()}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Wand2 size={16} />
                {isGettingFeedback ? 'Getting Feedback...' : 'Get AI Feedback'}
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostForm;
