
import { supabase } from '@/integrations/supabase/client';

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

export const validateBusinessName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 100 && /^[a-zA-Z0-9\s\-&.,()]+$/.test(name);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Session security utilities
export const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const secureSignOut = async () => {
  try {
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    await supabase.auth.signOut({ scope: 'global' });
    
    // Force page reload for clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Sign out error:', error);
    // Even if sign out fails, clean up and redirect
    cleanupAuthState();
    window.location.href = '/auth';
  }
};

// Rate limiting utility
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) { // 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window has passed
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if under limit
    if (record.count < this.maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }

    return false;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

// Security logging
export const logSecurityEvent = async (event: {
  action: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: any;
}) => {
  try {
    await supabase.from('activity_logs').insert({
      action: event.action,
      description: event.details,
      security_event: true,
      risk_level: event.severity,
      metadata: event.metadata || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};
