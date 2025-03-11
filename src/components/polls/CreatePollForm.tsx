
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import { User, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CreatePollForm = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Set anonymous status based on user's default preference
    if (user && user.defaultAnonymous) {
      setIsAnonymous(user.defaultAnonymous);
    }
  }, [user]);
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    } else {
      toast({
        title: "Maximum options reached",
        description: "You can add up to 5 options for a poll.",
        variant: "destructive",
      });
    }
  };
  
  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast({
        title: "Cannot remove option",
        description: "A poll must have at least 2 options.",
        variant: "destructive",
      });
      return;
    }
    
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create a poll.",
        variant: "destructive",
      });
      return;
    }
    
    if (!question.trim()) {
      toast({
        title: "Cannot create poll",
        description: "Please enter a question for your poll.",
        variant: "destructive",
      });
      return;
    }
    
    if (options.some(option => !option.trim())) {
      toast({
        title: "Cannot create poll",
        description: "Please fill in all option fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the poll first
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
          question: question.trim(),
          author_id: user.id,
          is_anonymous: isAnonymous,
          total_votes: 0,
          // Add expiry date if needed
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days from now
        })
        .select();
      
      if (pollError) throw pollError;
      
      if (!pollData || pollData.length === 0) {
        throw new Error('Failed to create poll');
      }
      
      const pollId = pollData[0].id;
      
      // Create the poll options
      const optionsToInsert = options.map(option => ({
        poll_id: pollId,
        text: option.trim(),
        votes: 0,
      }));
      
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);
      
      if (optionsError) throw optionsError;
      
      toast({
        title: "Poll created",
        description: "Your poll has been published successfully.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: "Failed to create poll",
        description: "There was an error publishing your poll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    navigate(-1);
  };
  
  return (
    <div className="animate-fadeIn">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-center">Create Poll</h1>
        
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
                  <span className="text-xs text-muted-foreground">Poll anonymously</span>
                </label>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-sm font-medium mb-1">
                Question
              </label>
              <input
                id="question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full p-3 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Options
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 p-3 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-2 text-primary hover:text-primary/80 mt-3 text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <span>Add Option</span>
              </button>
            </div>
            
            <div className="flex justify-end items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !question.trim() || options.some(option => !option.trim())}
                className="btn-primary"
              >
                {isSubmitting ? 'Creating Poll...' : 'Create Poll'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePollForm;
