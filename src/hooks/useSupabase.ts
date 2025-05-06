import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// Replace with your actual Supabase URL and anon key
const SUPABASE_URL = 'https://cnwizvmgtcckdpjnqxes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud2l6dm1ndGNja2Rwam5xeGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0OTI0MzAsImV4cCI6MjA2MjA2ODQzMH0.WupsJSBgRCjvUto0_B-U1PdwUIMCMTKvWWPwiklIToQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const useSupabase = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for active session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
        }
      );
      
      return () => subscription.unsubscribe();
    };
    
    getUser();
  }, []);
  
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { error };
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };
  
  return { supabase, user, loading, signInWithGoogle, signOut };
};

export default supabase;