
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://addacohgwpytjvkslaox.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZGFjb2hnd3B5dGp2a3NsYW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MTQyOTgsImV4cCI6MjA1NzE5MDI5OH0.pfGzsi6bqAdi-4iD8s81wjFAXFruoan7mYrT0Xm_buI";

// Create the Supabase client with optimized auth settings
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: localStorage,
    },
  }
);

// Enable console logging for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event);
  console.log('Session:', session);
});

// Helper function to check if username exists in profiles
export const checkUsernameExists = async (username: string) => {
  // Case insensitive search for username
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', username)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking username:', error);
    throw error;
  }
  
  return data;
};

// Helper function to get user by email
export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
  
  return data;
};
