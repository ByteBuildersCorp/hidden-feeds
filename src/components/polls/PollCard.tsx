import React, { useState, useEffect } from 'react';
import { Poll, PollOption } from '@/lib/types';
import UserAvatar from '@/components/ui/UserAvatar';
import { BarChart2, Share2, MoreHorizontal, Trash2, X, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CommentSection from '@/components/comments/CommentSection';

interface PollCardProps {
  poll: Poll;
  onDelete?: () => void;
}

const PollCard = ({ poll, onDelete }: PollCardProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollData, setPollData] = useState<PollOption[]>(poll.options);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showResults, setShowResults] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_votes')
        .select('option_id')
        .eq('poll_id', poll.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setSelectedOption(data.option_id);
        setHasVoted(true);
      }
    };
    
    const getCommentCount = async () => {
      const { count } = await supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('poll_id', poll.id);
      
      setCommentCount(count || 0);
    };
    
    checkVoteStatus();
    getCommentCount();
  }, [poll.id, user]);
  
  const handleVote = async (optionId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to vote in polls.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasVoted) return;
    
    try {
      const { error } = await supabase
        .from('user_votes')
        .insert({
          poll_id: poll.id,
          option_id: optionId,
          user_id: user.id
        });
      
      if (error) throw error;
      
      setSelectedOption(optionId);
      setHasVoted(true);
      
      setPollData(prev => 
        prev.map(option => 
          option.id === optionId 
            ? { ...option, votes: option.votes + 1 } 
            : option
        )
      );
      
      toast({
        title: "Vote recorded",
        description: "Your vote has been successfully recorded.",
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== poll.authorId) {
      toast({
        title: "Unauthorized",
        description: "You can only delete your own polls.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      console.log("Starting poll deletion process for poll ID:", poll.id);
      
      // Delete related comments
      console.log("Deleting comments for poll ID:", poll.id);
      const { error: commentsError, count: commentsDeleted } = await supabase
        .from('comments')
        .delete()
        .eq('poll_id', poll.id)
        .select('id');
      
      if (commentsError) {
        console.error("Error deleting comments:", commentsError);
        throw commentsError;
      }
      console.log(`Deleted ${commentsDeleted?.length || 0} comments`);
      
      // Delete user votes
      console.log("Deleting votes for poll ID:", poll.id);
      const { error: votesError, count: votesDeleted } = await supabase
        .from('user_votes')
        .delete()
        .eq('poll_id', poll.id)
        .select('id');
      
      if (votesError) {
        console.error("Error deleting votes:", votesError);
        throw votesError;
      }
      console.log(`Deleted ${votesDeleted?.length || 0} votes`);
      
      // Delete poll options
      console.log("Deleting options for poll ID:", poll.id);
      const { error: optionsError, count: optionsDeleted } = await supabase
        .from('poll_options')
        .delete()
        .eq('poll_id', poll.id)
        .select('id');
      
      if (optionsError) {
        console.error("Error deleting poll options:", optionsError);
        throw optionsError;
      }
      console.log(`Deleted ${optionsDeleted?.length || 0} options`);
      
      // Finally delete the poll itself
      console.log("Deleting poll with ID:", poll.id);
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', poll.id);
      
      if (error) {
        console.error("Error deleting poll:", error);
        throw error;
      }
      
      console.log("Poll deleted successfully");
      toast({
        title: "Poll deleted",
        description: "Your poll has been deleted successfully.",
      });
      
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error('Error deleting poll:', error);
      toast({
        title: "Error",
        description: "Failed to delete poll: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this poll on VibeSphere',
          text: poll.question,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Poll link copied to clipboard!",
        });
      }
    } catch (error) {
      console.error('Error sharing poll:', error);
    }
  };
  
  const toggleResults = () => {
    setShowResults(!showResults);
  };
  
  const totalVotes = pollData.reduce((sum, option) => sum + option.votes, 0);
  const timeAgo = formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true });
  const isAuthor = user && user.id === poll.authorId;
  
  const pollEndsText = poll.expiresAt 
    ? formatDistanceToNow(new Date(poll.expiresAt), { addSuffix: true }) 
    : null;
  
  return (
    <div className="bg-card border rounded-lg overflow-hidden transition-all duration-300 card-hover animate-fadeIn">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar 
              user={poll.author || null} 
              isAnonymous={poll.isAnonymous} 
            />
            <div>
              <h3 className="font-medium text-card-foreground">
                {poll.isAnonymous ? 'Anonymous' : poll.author?.name}
              </h3>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          {isAuthor && (
            <div className="relative">
              <button 
                className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              >
                <MoreHorizontal size={18} />
              </button>
              
              {showDeleteConfirm && (
                <div className="absolute right-0 top-8 bg-background border rounded-md shadow-md p-3 z-10 w-56">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Delete poll?</h4>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    This action cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm px-3 py-2 rounded-md"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Deleting...' : 'Delete Poll'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-3 mb-4">
          <h4 className="text-lg font-medium mb-4">{poll.question}</h4>
          
          <div className="space-y-3">
            {pollData.map((option) => {
              const percentage = totalVotes > 0 
                ? Math.round((option.votes / totalVotes) * 100) 
                : 0;
              
              return (
                <div key={option.id} className="relative">
                  <button
                    onClick={() => handleVote(option.id)}
                    disabled={hasVoted}
                    className={cn(
                      "w-full text-left p-3 rounded-md border transition-all relative z-10",
                      hasVoted 
                        ? "cursor-default" 
                        : "hover:border-primary hover:bg-primary/5 cursor-pointer",
                      selectedOption === option.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex justify-between">
                      <span>{option.text}</span>
                      {(hasVoted && showResults) && <span className="font-medium">{percentage}%</span>}
                    </div>
                  </button>
                  
                  {(hasVoted && showResults) && (
                    <div 
                      className={cn(
                        "absolute inset-0 bg-primary/10 rounded-md z-0 transition-all duration-500",
                        selectedOption === option.id ? "bg-primary/20" : ""
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {pollEndsText && (
            <p className="text-xs text-muted-foreground mt-4">
              Poll ends {pollEndsText}
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mt-4">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>
      </div>
      
      <div className="border-t flex items-center justify-between px-4 py-2">
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
        >
          <MessageSquare size={16} />
          <span>{commentCount}</span>
        </button>
        
        <button 
          onClick={toggleResults}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
        >
          {showResults ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showResults ? 'Hide Results' : 'Show Results'}</span>
        </button>
        
        <button 
          onClick={handleShare}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>
      
      {showComments && (
        <CommentSection contentId={poll.id} contentType="poll" />
      )}
    </div>
  );
};

export default PollCard;
