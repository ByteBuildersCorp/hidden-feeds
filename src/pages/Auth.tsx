
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Reduce initial render delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setFormLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        // Optimistic UI update
        toast({
          title: "Logging in...",
          description: "Verifying your credentials",
        });
        
        await login(username, password);
      } else {
        // Optimistic UI update
        toast({
          title: "Creating account...",
          description: "Setting up your profile",
        });
        
        await register(email, password, username);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleAuthMode = () => {
    if (isSubmitting) return; // Prevent toggling during submission
    
    setIsLogin(!isLogin);
    // Reset form fields when toggling
    setUsername('');
    setEmail('');
    setPassword('');
  };
  
  // Show skeleton while checking auth state
  if (formLoading) {
    return (
      <div className="app-container py-12">
        <div className="max-w-md mx-auto bg-card border rounded-lg p-8 shadow-sm">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-2/4 mx-auto mt-2" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return null; // User will be redirected by the useEffect
  }
  
  return (
    <div className="app-container py-12">
      <div className="max-w-md mx-auto bg-card border rounded-lg p-8 shadow-sm animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            {isLogin ? 'Welcome Back' : 'Join VibeSphere'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
              disabled={isSubmitting || isLoading}
              className="w-full"
            />
          </div>
          
          {!isLogin && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting || isLoading}
                className="w-full"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting || isLoading}
              className="w-full"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full"
          >
            {isLoading || isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
            ) : isLogin ? (
              <>
                <LogIn size={18} className="mr-2" />
                Sign In
              </>
            ) : (
              <>
                <User size={18} className="mr-2" />
                Create Account
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={toggleAuthMode}
            disabled={isSubmitting || isLoading}
            className="text-primary text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
