import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityEvent {
  type: 'login_failure' | 'suspicious_activity' | 'data_breach_attempt' | 'unauthorized_access' | 
        'development_activity' | 'data_access' | 'injection_attempt' | 'security_error' | 
        'suspicious_navigation' | 'csp_violation' | 'security_init' | 'session_activity';
  description: string;
  metadata?: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurity = () => {
  const { currentTenant, user } = useAuth();

  // Log security events with smart rate limiting
  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    if (!currentTenant?.id) return;

    try {
      // Use the smart audit function to prevent event flooding
      await supabase.rpc('audit_security_event_smart', {
        p_event_type: event.type,
        p_description: event.description,
        p_metadata: event.metadata || {},
        p_risk_level: event.riskLevel || 'low'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [currentTenant?.id]);

  // Validate trial status server-side
  const validateTrialStatus = useCallback(async () => {
    if (!currentTenant?.id) return null;

    try {
      const { data, error } = await supabase.rpc('validate_trial_status', {
        p_tenant_id: currentTenant.id
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to validate trial status:', error);
      return null;
    }
  }, [currentTenant?.id]);

  // Monitor for suspicious activity patterns with improved thresholds
  useEffect(() => {
    if (!user || !currentTenant?.id) return;

    let requestCount = 0;
    let lastResetTime = Date.now();
    
    const monitorActivity = () => {
      requestCount++;
      const now = Date.now();
      
      // Reset counter every 5 minutes
      if (now - lastResetTime > 300000) {
        requestCount = 0;
        lastResetTime = now;
      }

      // Only flag if extremely high request count (more than 200 in 5 minutes)
      if (requestCount > 200) {
        logSecurityEvent({
          type: 'suspicious_activity',
          description: 'Extremely high request frequency detected',
          metadata: { 
            requestCount, 
            timeWindow: '5 minutes',
            requestsPerMinute: Math.round(requestCount / 5)
          },
          riskLevel: 'high'
        });
        requestCount = 0; // Reset to prevent spam
      }
    };

    // Monitor on page visibility changes with rate limiting
    let lastTabSwitch = 0;
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden' && (now - lastTabSwitch > 30000)) {
        lastTabSwitch = now;
        logSecurityEvent({
          type: 'session_activity',
          description: 'User tab switching detected',
          metadata: { timestamp: now },
          riskLevel: 'low'
        });
      }
    };

    // Monitor less frequently to reduce noise
    const interval = setInterval(monitorActivity, 10000); // Every 10 seconds
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, currentTenant?.id, logSecurityEvent]);

  // Secure localStorage/sessionStorage usage
  const secureStore = useCallback((key: string, value: string, persistent = false) => {
    try {
      const storage = persistent ? localStorage : sessionStorage;
      // Add basic obfuscation for sensitive data
      const obfuscated = btoa(value);
      storage.setItem(key, obfuscated);
    } catch (error) {
      console.warn('Secure storage failed:', error);
    }
  }, []);

  const secureRetrieve = useCallback((key: string, persistent = false): string | null => {
    try {
      const storage = persistent ? localStorage : sessionStorage;
      const obfuscated = storage.getItem(key);
      if (!obfuscated) return null;
      return atob(obfuscated);
    } catch (error) {
      console.warn('Secure retrieval failed:', error);
      return null;
    }
  }, []);

  // Enhanced Content Security Policy violation handler
  useEffect(() => {
    const handleCSPViolation = (event: any) => {
      logSecurityEvent({
        type: 'csp_violation',
        description: 'Content Security Policy violation detected',
        metadata: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          documentURI: event.documentURI,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber
        },
        riskLevel: 'high'
      });
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);
    return () => document.removeEventListener('securitypolicyviolation', handleCSPViolation);
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    validateTrialStatus,
    secureStore,
    secureRetrieve
  };
};