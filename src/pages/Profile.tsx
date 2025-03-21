import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/ui/UserAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from '@/components/posts/PostCard';
import PollCard from '@/components/polls/PollCard';
import { Post, Poll } from '@/lib/types';
import { User, Save, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Profile = () => {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [defaultAnonymous, setDefaultAnonymous] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userPolls, setUserPolls] = useState<Poll[]>([]);
  const [anonymousPosts, setAnonymousPosts] = useState<Post[]>([]);
  const [anonymousPolls, setAnonymousPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { toast } = useToast();
  
  useEffect(() => {
    if (user) {
      setDefaultAnonymous(user.defaultAnonymous || false);
      setName(user.name || '');
      fetchUserContent();
    }
  }, [user]);
  
  const fetchUserContent = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          author_id,
          is_anonymous,
          created_at,
          updated_at
        `)
        .eq('author_id', user.id)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;
      
      const { data: anonymousPostsData, error: anonymousPostsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          author_id,
          is_anonymous,
          created_at,
          updated_at
        `)
        .eq('author_id', user.id)
        .eq('is_anonymous', true)
        .order('created_at', { ascending: false });
      
      if (anonymousPostsError) throw anonymousPostsError;
      
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(`
          id,
          question,
          author_id,
          is_anonymous,
          created_at,
          expires_at,
          total_votes
        `)
        .eq('author_id', user.id)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false });
      
      if (pollsError) throw pollsError;
      
      const { data: anonymousPollsData, error: anonymousPollsError } = await supabase
        .from('polls')
        .select(`
          id,
          question,
          author_id,
          is_anonymous,
          created_at,
          expires_at,
          total_votes
        `)
        .eq('author_id', user.id)
        .eq('is_anonymous', true)
        .order('created_at', { ascending: false });
      
      if (anonymousPollsError) throw anonymousPollsError;
      
      const pollIds = [...(pollsData || []), ...(anonymousPollsData || [])].map(poll => poll.id);
      
      let pollOptionsMap: Record<string, any[]> = {};
      
      if (pollIds.length > 0) {
        const { data: optionsData, error: optionsError } = await supabase
          .from('poll_options')
          .select('*')
          .in('poll_id', pollIds);
        
        if (optionsError) throw optionsError;
        
        pollOptionsMap = (optionsData || []).reduce((acc, option) => {
          if (!acc[option.poll_id]) {
            acc[option.poll_id] = [];
          }
          acc[option.poll_id].push({
            id: option.id,
            text: option.text,
            votes: option.votes
          });
          return acc;
        }, {} as Record<string, any[]>);
      }
      
      const transformedPosts = (postsData || []).map(post => ({
        id: post.id,
        content: post.content,
        authorId: post.author_id,
        author: user,
        isAnonymous: post.is_anonymous,
        createdAt: new Date(post.created_at),
        updatedAt: new Date(post.updated_at),
        likes: 0,
        comments: 0,
      }));
      
      const transformedAnonymousPosts = (anonymousPostsData || []).map(post => ({
        id: post.id,
        content: post.content,
        authorId: post.author_id,
        author: user,
        isAnonymous: post.is_anonymous,
        createdAt: new Date(post.created_at),
        updatedAt: new Date(post.updated_at),
        likes: 0,
        comments: 0,
      }));
      
      const transformedPolls = (pollsData || []).map(poll => ({
        id: poll.id,
        question: poll.question,
        options: pollOptionsMap[poll.id] || [],
        authorId: poll.author_id,
        author: user,
        isAnonymous: poll.is_anonymous,
        createdAt: new Date(poll.created_at),
        expiresAt: poll.expires_at ? new Date(poll.expires_at) : undefined,
        totalVotes: poll.total_votes,
      }));
      
      const transformedAnonymousPolls = (anonymousPollsData || []).map(poll => ({
        id: poll.id,
        question: poll.question,
        options: pollOptionsMap[poll.id] || [],
        authorId: poll.author_id,
        author: user,
        isAnonymous: poll.is_anonymous,
        createdAt: new Date(poll.created_at),
        expiresAt: poll.expires_at ? new Date(poll.expires_at) : undefined,
        totalVotes: poll.total_votes,
      }));
      
      setUserPosts(transformedPosts);
      setAnonymousPosts(transformedAnonymousPosts);
      setUserPolls(transformedPolls);
      setAnonymousPolls(transformedAnonymousPolls);
    } catch (error) {
      console.error('Error fetching user content:', error);
      toast({
        title: "Error",
        description: "Failed to load your content. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim() || null,
          default_anonymous: defaultAnonymous
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Settings Saved",
        description: "Your profile settings have been updated successfully."
      });
      
      if (user.name !== name || user.defaultAnonymous !== defaultAnonymous) {
        fetchUserContent();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setEditingName(false);
    }
  };
  
  const handlePollDeleted = (pollId: string) => {
    setUserPolls(prev => prev.filter(poll => poll.id !== pollId));
    setAnonymousPolls(prev => prev.filter(poll => poll.id !== pollId));
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (deleteConfirmText.toLowerCase() !== 'delete my account') {
      toast({
        title: "Confirmation text doesn't match",
        description: "Please type 'delete my account' to confirm deletion",
        variant: "destructive"
      });
      return;
    }
    
    setIsDeletingAccount(true);
    
    try {
      await supabase.from('user_votes').delete().eq('user_id', user.id);
      await supabase.from('post_likes').delete().eq('user_id', user.id);
      
      const { data: userPollsData } = await supabase
        .from('polls')
        .select('id')
        .eq('author_id', user.id);
      
      if (userPollsData) {
        const pollIds = userPollsData.map(poll => poll.id);
        
        if (pollIds.length > 0) {
          await supabase.from('poll_options').delete().in('poll_id', pollIds);
          await supabase.from('user_votes').delete().in('poll_id', pollIds);
          await supabase.from('comments').delete().in('poll_id', pollIds);
        }
      }
      
      await supabase.from('polls').delete().eq('author_id', user.id);
      
      const { data: userPostsData } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', user.id);
      
      if (userPostsData) {
        const postIds = userPostsData.map(post => post.id);
        
        if (postIds.length > 0) {
          await supabase.from('comments').delete().in('post_id', postIds);
          await supabase.from('post_likes').delete().in('post_id', postIds);
        }
      }
      
      await supabase.from('posts').delete().eq('author_id', user.id);
      await supabase.from('comments').delete().eq('author_id', user.id);
      
      await supabase.from('profiles').delete().eq('id', user.id);
      
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      
      await logout();
      
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="app-container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-muted"></div>
              <div className="space-y-2">
                <div className="h-6 w-48 bg-muted rounded"></div>
                <div className="h-4 w-32 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container py-8 animate-fadeIn">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">Profile</h1>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <UserAvatar user={user} size="lg" />
              <div className="text-center md:text-left">
                {editingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-2 py-1 border rounded w-full max-w-[200px]"
                      placeholder="Your name"
                    />
                    <button 
                      onClick={() => setEditingName(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {user?.name || 'Anonymous'}
                    <button 
                      onClick={() => setEditingName(true)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                  </h2>
                )}
                <p className="text-muted-foreground">@{user?.username}</p>
                <p className="text-muted-foreground">Member since {new Date(user?.createdAt || '').toLocaleDateString()}</p>
                
                <div className="flex gap-4 mt-4 justify-center md:justify-start">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{userPosts.length + anonymousPosts.length}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{userPolls.length + anonymousPolls.length}</p>
                    <p className="text-sm text-muted-foreground">Polls</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Settings</h2>
          <div className="bg-card border rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="default-anonymous" className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium">Default to anonymous</p>
                    <p className="text-sm text-muted-foreground">When enabled, your posts and polls will be anonymous by default</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="default-anonymous"
                      className="sr-only"
                      checked={defaultAnonymous}
                      onChange={() => setDefaultAnonymous(!defaultAnonymous)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${defaultAnonymous ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${defaultAnonymous ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                </label>
              </div>
              
              <div>
                <label className="block font-medium mb-1">Email address</label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={user?.email}
                    readOnly
                    className="flex-1 p-2 rounded-md border bg-muted text-muted-foreground"
                  />
                  <button className="btn-secondary">
                    Change
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
              
              <div className="pt-2 border-t mt-4">
                <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
                  <DialogTrigger asChild>
                    <button className="text-destructive hover:text-destructive/80 text-sm font-medium transition-colors">
                      Delete account
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center text-destructive">
                        <AlertTriangle className="mr-2" size={18} />
                        Delete your account?
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. All your posts, polls, comments, and other data will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Type <span className="font-bold">delete my account</span> to confirm:
                      </p>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="delete my account"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteAccountDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount || deleteConfirmText.toLowerCase() !== 'delete my account'}
                        className="flex items-center gap-2"
                      >
                        {isDeletingAccount ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            Delete Account
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4">Your Content</h2>
          <div className="bg-card border rounded-lg">
            <Tabs defaultValue="posts">
              <TabsList className="w-full border-b rounded-none justify-start">
                <TabsTrigger value="posts" className="flex-1 md:flex-none">Posts</TabsTrigger>
                <TabsTrigger value="polls" className="flex-1 md:flex-none">Polls</TabsTrigger>
                <TabsTrigger value="anonymous" className="flex-1 md:flex-none">
                  <User size={16} className="mr-2" />
                  Anonymous
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="p-4">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-muted h-40 rounded-lg w-full"></div>
                    ))}
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-4">
                    {userPosts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">You haven't created any posts yet.</p>
                )}
              </TabsContent>
              
              <TabsContent value="polls" className="p-4">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-muted h-64 rounded-lg w-full"></div>
                    ))}
                  </div>
                ) : userPolls.length > 0 ? (
                  <div className="space-y-4">
                    {userPolls.map(poll => (
                      <PollCard key={poll.id} poll={poll} onDelete={() => handlePollDeleted(poll.id)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">You haven't created any polls yet.</p>
                )}
              </TabsContent>
              
              <TabsContent value="anonymous" className="p-4">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-muted h-40 rounded-lg w-full"></div>
                    ))}
                  </div>
                ) : anonymousPosts.length > 0 || anonymousPolls.length > 0 ? (
                  <div className="space-y-4">
                    {anonymousPosts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                    {anonymousPolls.map(poll => (
                      <PollCard key={poll.id} poll={poll} onDelete={() => handlePollDeleted(poll.id)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">You haven't created any anonymous content yet.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
