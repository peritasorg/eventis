
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentTenant: any | null;
  userProfile: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cleanup function to clear all auth-related storage
const cleanupAuthState = () => {
  // Clear all potential auth keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage too
  Object.keys(sessionStorage || {}).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentTenant, setCurrentTenant] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user profile:', userError);
        return;
      }
      
      console.log('User profile data:', userData);
      setUserProfile(userData);
      
      // Get tenant data if user has tenant_id
      if (userData?.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', userData.tenant_id)
          .single();
        
        if (tenantError) {
          console.error('Error fetching tenant data:', tenantError);
        } else {
          console.log('Tenant data:', tenantData);
          setCurrentTenant(tenantData);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Defer data fetching to prevent potential deadlocks
          setTimeout(async () => {
            if (mounted) {
              await fetchUserData(session.user.id);
            }
          }, 100);
        } else if (!session?.user) {
          // Clear all data when user logs out
          setCurrentTenant(null);
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Clean up any existing state
      cleanupAuthState();
      
      // Attempt to sign out first to ensure clean state
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Pre-signin cleanup completed');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        toast.error(error.message);
        return { error };
      }
      
      if (data.user) {
        toast.success('Signed in successfully!');
        // Auth state change will handle the rest
        return { error: null };
      }
      
      return { error: new Error('Sign in failed') };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      toast.error('An error occurred during sign in');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoading(true);
      
      // Clean up any existing state
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message);
        return { error };
      }
      
      if (data.user) {
        toast.success('Account created successfully! Please check your email to verify your account.');
        return { error: null };
      }
      
      return { error: new Error('Sign up failed') };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      toast.error('An error occurred during sign up');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clean up state first
      cleanupAuthState();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Sign out error:', error);
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully!');
        
        // Clear all state
        setUser(null);
        setSession(null);
        setCurrentTenant(null);
        setUserProfile(null);
        
        // Force page reload for clean state
        setTimeout(() => {
          window.location.href = '/auth';
        }, 500);
      }
    } catch (error: any) {
      console.error('Sign out exception:', error);
      toast.error('An error occurred during sign out');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    currentTenant,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
