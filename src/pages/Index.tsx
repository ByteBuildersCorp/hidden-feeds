import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PostCard from '@/components/posts/PostCard';
import PollCard from '@/components/polls/PollCard';
import { Post, Poll } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ContentType = 'all' | 'posts' | 'polls';

const Index = () => {
  const [contentType, setContentType] = useState<ContentType>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        console.log('Fetching data from Supabase...');
        
        // Fetch posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            author_id,
            is_anonymous,
            created_at,
            updated_at,
            profiles:author_id (
              id,
              name,
              username,
              email,
              image,
              created_at,
              default_anonymous
            )
          `)
          .order('created_at', { ascending: false });
          
        if (postsError) {
          console.error('Error fetching posts:', postsError);
          throw postsError;
        }
        
        console.log('Posts data:', postsData);
        
        // Fetch polls with their options
        const { data: pollsData, error: pollsError } = await supabase
          .from('polls')
          .select(`
            id,
            question,
            author_id,
            is_anonymous,
            created_at,
            expires_at,
            total_votes,
            profiles:author_id (
              id,
              name,
              username,
              email,
              image,
              created_at,
              default_anonymous
            ),
            poll_options (
              id,
              text,
              votes
            )
          `)
          .order('created_at', { ascending: false });
          
        if (pollsError) {
          console.error('Error fetching polls:', pollsError);
          throw pollsError;
        }
        
        console.log('Polls data:', pollsData);
        
        // Fetch likes counts for posts
        const { data: likesData, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id, count(*)', { count: 'exact', head: false })
          .groupby('post_id');
        
        if (likesError) {
          console.error('Error fetching likes:', likesError);
          // Don't throw, we can continue without likes data
        }
        
        // Create a map of post IDs to likes counts
        const likesMap = new Map();
        likesData?.forEach(item => {
          likesMap.set(item.post_id, parseInt(item.count));
        });
        
        // Fetch comments counts for posts
        const { data: postCommentsData, error: postCommentsError } = await supabase
          .from('comments')
          .select('post_id, count(*)', { count: 'exact', head: false })
          .not('post_id', 'is', null)
          .groupby('post_id');
        
        if (postCommentsError) {
          console.error('Error fetching post comments:', postCommentsError);
          // Don't throw, we can continue without comments data
        }
        
        // Create a map of post IDs to comment counts
        const postCommentsMap = new Map();
        postCommentsData?.forEach(item => {
          postCommentsMap.set(item.post_id, parseInt(item.count));
        });
        
        // Format posts data
        const formattedPosts: Post[] = postsData.map(post => ({
          id: post.id,
          content: post.content,
          authorId: post.author_id,
          author: post.is_anonymous ? undefined : {
            id: post.profiles?.id || '',
            name: post.profiles?.name || '',
            username: post.profiles?.username || '',
            email: post.profiles?.email || '',
            image: post.profiles?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.username || post.profiles?.id || post.author_id}`,
            createdAt: new Date(post.profiles?.created_at || post.created_at),
            defaultAnonymous: post.profiles?.default_anonymous || false,
          },
          isAnonymous: post.is_anonymous,
          createdAt: new Date(post.created_at),
          updatedAt: new Date(post.updated_at),
          likes: likesMap.get(post.id) || 0,
          comments: postCommentsMap.get(post.id) || 0,
        }));
        
        // Format polls data
        const formattedPolls: Poll[] = pollsData.map(poll => ({
          id: poll.id,
          question: poll.question,
          authorId: poll.author_id,
          author: poll.is_anonymous ? undefined : {
            id: poll.profiles?.id || '',
            name: poll.profiles?.name || '',
            username: poll.profiles?.username || '',
            email: poll.profiles?.email || '',
            image: poll.profiles?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${poll.profiles?.username || poll.profiles?.id || poll.author_id}`,
            createdAt: new Date(poll.profiles?.created_at || poll.created_at),
            defaultAnonymous: poll.profiles?.default_anonymous || false,
          },
          isAnonymous: poll.is_anonymous,
          createdAt: new Date(poll.created_at),
          expiresAt: poll.expires_at ? new Date(poll.expires_at) : undefined,
          totalVotes: poll.total_votes,
          options: poll.poll_options.map(option => ({
            id: option.id,
            text: option.text,
            votes: option.votes,
          })),
        }));
        
        setPosts(formattedPosts);
        setPolls(formattedPolls);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading content",
          description: "Could not load posts and polls. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted"></div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded"></div>
                  <div className="h-3 w-16 bg-muted rounded"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-5/6 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (contentType === 'all') {
      // Mix posts and polls and sort by date
      const allContent = [
        ...posts.map(post => ({ type: 'post', content: post, date: new Date(post.createdAt) })),
        ...polls.map(poll => ({ type: 'poll', content: poll, date: new Date(poll.createdAt) })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      return (
        <div className="space-y-4">
          {allContent.map(item => (
            <div key={`${item.type}-${item.content.id}`} className="animate-slideIn">
              {item.type === 'post' ? (
                <PostCard post={item.content as Post} />
              ) : (
                <PollCard poll={item.content as Poll} />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (contentType === 'posts') {
      return (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="animate-slideIn">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      );
    }

    if (contentType === 'polls') {
      return (
        <div className="space-y-4">
          {polls.map(poll => (
            <div key={poll.id} className="animate-slideIn">
              <PollCard poll={poll} />
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="app-container py-8">
      <div className="text-center max-w-2xl mx-auto mb-8 fade-in">
        <h1 className="text-4xl font-bold mb-4">Welcome to <span className="text-primary">VibeSphere</span></h1>
        <p className="text-muted-foreground text-lg">
          Share your thoughts anonymously or publicly, create polls, and get AI-powered insights.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link to="/create-post" className="btn-primary">
            <Plus size={16} className="mr-2" />
            Create Post
          </Link>
          <Link to="/create-poll" className="btn-secondary">
            <Plus size={16} className="mr-2" />
            Create Poll
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="flex border-b mb-6">
          <button
            onClick={() => setContentType('all')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              contentType === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContentType('posts')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              contentType === 'posts'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setContentType('polls')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              contentType === 'polls'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Polls
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
