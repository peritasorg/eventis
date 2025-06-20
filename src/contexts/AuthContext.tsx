
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateEmail, validatePassword, sanitizeInput, cleanupAuthState, secureSignOut, RateLimiter, logSecurityEvent } from '@/utils/securityUtils';

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

// Rate limiter for auth attempts
const authRateLimiter = new RateLimiter(3, 5 * 60 * 1000); // 3 attempts per 5 minutes

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

  const loadUserData = async (userId: string): Promise<boolean> => {
    try {
      console.log('Loading user data for:', userId);
      
      // Load user profile with proper error handling
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Failed to load user profile:', profileError);
        // Don't log security events during initial load to prevent blocking
        
        if (profileError.code === 'PGRST116') {
          console.log('User profile not found - might be a new user');
          return false;
        }
        throw profileError;
      }
      
      if (!profile) {
        console.error('No user profile found');
        return false;
      }
      
      setUserProfile(profile);
      console.log('User profile loaded:', profile.email);
      
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
        
        if (tenant) {
          setCurrentTenant(tenant);
          console.log('Tenant loaded:', tenant.business_name);
        }
      } else {
        console.log('User has no tenant assigned');
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

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
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
          
          const success = await loadUserData(currentSession.user.id);
          if (!success) {
            console.log('Could not load user data - user may need to complete registration');
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
          
          // Log security event after state is set
          setTimeout(() => {
            logSecurityEvent({
              action: 'user_signed_in',
              details: `User ${newSession.user.email} signed in successfully`,
              severity: 'low'
            });
          }, 100);
          
          const success = await loadUserData(newSession.user.id);
          if (!success) {
            console.log('Failed to load user data after sign in');
            toast.error('Failed to load user profile. Please contact support.');
          }
          setLoading(false);
        }
      }
    );

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Input validation
      if (!validateEmail(email)) {
        const error = new Error('Please enter a valid email address');
        // Don't log during validation
        return { error };
      }

      const sanitizedEmail = sanitizeInput(email);
      
      // Rate limiting
      if (!authRateLimiter.isAllowed(sanitizedEmail)) {
        const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(sanitizedEmail) / 1000 / 60);
        const error = new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`);
        toast.error(error.message);
        return { error };
      }

      setLoading(true);
      console.log('Signing in:', sanitizedEmail);
      
      // Clean up any existing auth state before signing in
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        // Log after the auth attempt
        setTimeout(() => {
          logSecurityEvent({
            action: 'signin_failed',
            details: `Failed sign in attempt for email: ${sanitizedEmail}`,
            severity: 'medium',
            metadata: { error: error.message }
          });
        }, 100);
        toast.error('Invalid email or password');
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
      // Input validation
      if (!validateEmail(email)) {
        const error = new Error('Please enter a valid email address');
        return { error };
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const error = new Error(passwordValidation.errors.join('. '));
        return { error };
      }

      const sanitizedEmail = sanitizeInput(email);
      const sanitizedMetadata = metadata ? {
        business_name: sanitizeInput(metadata.business_name || ''),
        full_name: sanitizeInput(metadata.full_name || ''),
        first_name: sanitizeInput(metadata.first_name || ''),
        last_name: sanitizeInput(metadata.last_name || '')
      } : {};

      // Rate limiting
      if (!authRateLimiter.isAllowed(sanitizedEmail)) {
        const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(sanitizedEmail) / 1000 / 60);
        const error = new Error(`Too many attempts. Please try again in ${remainingTime} minutes.`);
        toast.error(error.message);
        return { error };
      }

      setLoading(true);
      console.log('Signing up:', sanitizedEmail);
      
      // Clean up any existing auth state before signing up
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          data: sanitizedMetadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        toast.error(error.message);
        return { error };
      }
      
      if (data.user) {
        // Log after successful signup
        setTimeout(() => {
          logSecurityEvent({
            action: 'user_signed_up',
            details: `New user registered: ${sanitizedEmail}`,
            severity: 'low'
          });
        }, 100);
        
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
      console.log('Signing out...');
      
      if (user?.email) {
        // Log before signing out
        setTimeout(() => {
          logSecurityEvent({
            action: 'user_signed_out',
            details: `User ${user.email} signed out`,
            severity: 'low'
          });
        }, 100);
      }
      
      await secureSignOut();
    } catch (error: any) {
      console.error('Sign out exception:', error);
      toast.error('An error occurred during sign out');
      // Still clean up and redirect even on error
      cleanupAuthState();
      window.location.href = '/auth';
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
