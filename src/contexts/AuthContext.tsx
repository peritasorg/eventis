import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentTenant: any | null;
  userProfile: any | null;
  subscriptionData: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
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
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
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
  const [subscriptionData, setSubscriptionData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Get user profile with better error handling
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (userError) {
        console.error('Error fetching user profile:', userError);
      }
      
      if (userData) {
        console.log('User profile found:', userData);
        setUserProfile(userData);
        
        // Get tenant data if user has tenant_id
        if (userData.tenant_id) {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', userData.tenant_id)
            .maybeSingle();
          
          if (tenantError) {
            console.error('Error fetching tenant data:', tenantError);
          } else if (tenantData) {
            console.log('Tenant data found:', tenantData);
            setCurrentTenant(tenantData);
          }
        }

        // Check subscription status
        await checkSubscriptionStatus();
      } else {
        console.log('No user profile found - creating user profile');
        // Trigger user profile creation
        await createUserProfile(userId);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUserProfile(null);
      setCurrentTenant(null);
      setSubscriptionData(null);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      console.log('Creating user profile for:', userId);
      
      // Get user info from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;
      
      // Create tenant first
      const businessName = authUser.user_metadata?.business_name || 'My Business';
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + userId.substring(0, 8);
      
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          business_name: businessName,
          slug: slug,
          contact_email: authUser.email,
          subscription_status: 'trial',
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          trial_used: true
        })
        .select()
        .single();
      
      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        return;
      }
      
      // Create user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email,
          first_name: authUser.user_metadata?.first_name || '',
          last_name: authUser.user_metadata?.last_name || '',
          tenant_id: tenantData.id,
          role: 'tenant_admin',
          active: true,
          email_verified: authUser.email_confirmed_at ? true : false
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return;
      }
      
      console.log('User profile created successfully');
      setUserProfile(userProfile);
      setCurrentTenant(tenantData);
      
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }
      
      console.log('Subscription status:', data);
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error invoking check-subscription:', error);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session first
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        console.log('Initial session:', session?.user?.email || 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if email is verified
          if (!session.user.email_confirmed_at) {
            console.warn('User email not confirmed');
            toast.error('Please verify your email address before using the app');
            await signOut();
            return;
          }
          
          // Fetch user data after setting session
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user');
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Check email verification
          if (!session.user.email_confirmed_at) {
            console.warn('User email not confirmed on sign in');
            toast.error('Please verify your email address before accessing your account');
            setTimeout(async () => {
              await signOut();
            }, 2000);
            return;
          }
          
          // Use setTimeout to prevent potential conflicts with auth state changes
          setTimeout(async () => {
            if (mounted) {
              await fetchUserData(session.user.id);
            }
          }, 100);
        } else if (!session?.user) {
          // Clear all data when user logs out
          setCurrentTenant(null);
          setUserProfile(null);
          setSubscriptionData(null);
        }
        
        // Only set loading to false after we've processed the auth change
        if (event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // Initialize auth
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
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          toast.error('Please verify your email address before signing in');
          await supabase.auth.signOut();
          return { error: new Error('Email not verified') };
        }
        
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
      
      // Clean up any existing state
      cleanupAuthState();
      
      // Use the actual app URL instead of localhost
      const redirectUrl = `${window.location.origin}/auth?verified=true`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl
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
          toast.success('Account created! Please check your email to verify your account before signing in.');
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
        setSubscriptionData(null);
        
        // Clean up storage
        cleanupAuthState();
        
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
    subscriptionData,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserData,
    checkSubscriptionStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
