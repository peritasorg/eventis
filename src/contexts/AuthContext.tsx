
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentTenant, setCurrentTenant] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple, synchronous function to load user data
  const loadUserData = async (userId: string): Promise<boolean> => {
    try {
      console.log('Loading user data for:', userId);
      
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Failed to load user profile:', profileError);
        return false;
      }
      
      setUserProfile(profile);
      console.log('User profile loaded for:', profile.email);
      
      // Load tenant if user has one
      if (profile.tenant_id) {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single();
        
        if (tenantError) {
          console.error('Failed to load tenant:', tenantError);
          return false;
        }
        
        setCurrentTenant(tenant);
        console.log('Tenant loaded:', tenant.business_name);
      }
      
      return true;
    } catch (error) {
      console.error('Error loading user data:', error);
      return false;
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await loadUserData(user.id);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (isMounted) setLoading(false);
          return;
        }
        
        if (!isMounted) return;
        
        if (currentSession?.user) {
          console.log('Found existing session for:', currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Load user data and wait for it to complete
          const success = await loadUserData(currentSession.user.id);
          if (!success) {
            console.error('Failed to load user data, signing out...');
            await supabase.auth.signOut();
          }
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (!isMounted) return;
        
        if (event === 'SIGNED_OUT' || !newSession?.user) {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setCurrentTenant(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          console.log('User signed in:', newSession.user.email);
          setLoading(true);
          setSession(newSession);
          setUser(newSession.user);
          
          // Load user data
          const success = await loadUserData(newSession.user.id);
          if (!success) {
            console.error('Failed to load user data after sign in');
            toast.error('Failed to load user data');
          }
          setLoading(false);
        }
      }
    );

    // Initialize
    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Signing in:', email);
      
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
      console.log('Signing up:', email);
      
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
        if (data.user.email_confirmed_at) {
          toast.success('Account created successfully!');
        } else {
          toast.success('Account created! Please check your email to verify your account.');
        }
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
      console.log('Signing out...');
      
      const { error } = await supabase.auth.signOut();
      
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
        
        // Force redirect to auth page
        window.location.href = '/auth';
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
