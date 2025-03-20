
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogIn } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(email, password, username);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Reset form fields when toggling
    setUsername('');
    setEmail('');
    setPassword('');
  };
  
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
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="johndoe"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="you@example.com"
                required
                disabled={isSubmitting || isLoading}
              />
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              required
              disabled={isSubmitting || isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-medium transition-colors flex items-center justify-center"
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
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={toggleAuthMode}
            disabled={isSubmitting || isLoading}
            className="text-primary hover:underline text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
