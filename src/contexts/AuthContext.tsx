
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentTenant: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch current tenant data
          setTimeout(async () => {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('id', session.user.id)
                .single();
              
              if (userData?.tenant_id) {
                const { data: tenantData } = await supabase
                  .from('tenants')
                  .select('*')
                  .eq('id', userData.tenant_id)
                  .single();
                
                setCurrentTenant(tenantData);
              }
            } catch (error) {
              console.error('Error fetching tenant data:', error);
            }
          }, 0);
        } else {
          setCurrentTenant(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Signed in successfully!');
      return { error: null };
    } catch (error: any) {
      toast.error('An error occurred during sign in');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Account created successfully! Please check your email to verify your account.');
      return { error: null };
    } catch (error: any) {
      toast.error('An error occurred during sign up');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully!');
        setUser(null);
        setSession(null);
        setCurrentTenant(null);
      }
    } catch (error: any) {
      toast.error('An error occurred during sign out');
    }
  };

  const value = {
    user,
    session,
    currentTenant,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
