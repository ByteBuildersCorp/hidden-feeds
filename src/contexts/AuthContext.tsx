import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { supabase, checkUsernameExists, getUserByEmail } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const generateRandomUsername = () => {
  const adjectives = ['Happy', 'Lucky', 'Sunny', 'Cool', 'Swift', 'Clever'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Dolphin'];
  const randomNum = Math.floor(Math.random() * 1000);
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdjective}${randomNoun}${randomNum}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setIsLoading(true);
        
        if (event === 'SIGNED_IN' && session) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (error) throw error;
            
            if (data) {
              setUser({
                id: data.id,
                name: data.name || '',
                username: data.username || '',
                email: data.email || '',
                image: data.image,
                createdAt: new Date(data.created_at),
                defaultAnonymous: data.default_anonymous || false,
              });
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    const fetchInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (error) throw error;
            
            if (data) {
              setUser({
                id: data.id,
                name: data.name || '',
                username: data.username || '',
                email: data.email || '',
                image: data.image,
                createdAt: new Date(data.created_at),
                defaultAnonymous: data.default_anonymous || false,
              });
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      setIsLoading(true);
      
      toast({
        title: "Logging in...",
        description: "Verifying your credentials",
      });
      
      // Check if input is email format
      const isEmail = usernameOrEmail.includes('@');
      let email = usernameOrEmail;
      
      if (!isEmail) {
        // Search for username in profiles table
        const userProfile = await checkUsernameExists(usernameOrEmail);
        
        if (!userProfile || !userProfile.email) {
          throw new Error('Username not found');
        }
        
        email = userProfile.email;
      }
      
      // Attempt login with email
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, providedUsername?: string) => {
    try {
      setIsLoading(true);
      
      const username = providedUsername || generateRandomUsername();
      
      // Check if username already exists
      if (providedUsername) {
        const existingProfile = await checkUsernameExists(providedUsername);
        if (existingProfile) {
          throw new Error('Username is already taken');
        }
      }
      
      // Check if email already exists
      const existingEmail = await getUserByEmail(email);
      if (existingEmail) {
        throw new Error('Email is already registered');
      }
      
      // Register new user
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Registration successful",
        description: providedUsername 
          ? "Your account has been created. Please check your email for verification."
          : `Your account has been created with username: ${username}. Please check your email for verification.`,
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different information.",
        variant: "destructive",
      });
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      setUser(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Clear all realtime subscriptions
      supabase.removeAllChannels();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
