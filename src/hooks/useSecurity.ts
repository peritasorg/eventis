import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityEvent {
  type: 'login_failure' | 'suspicious_activity' | 'data_breach_attempt' | 'unauthorized_access';
  description: string;
  metadata?: Record<string, any>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurity = () => {
  const { currentTenant, user } = useAuth();

  // Log security events
  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    if (!currentTenant?.id) return;

    try {
      await supabase.rpc('log_security_event', {
        p_tenant_id: currentTenant.id,
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

  // Monitor for suspicious activity patterns
  useEffect(() => {
    if (!user || !currentTenant?.id) return;

    const monitorActivity = () => {
      // Check for multiple rapid requests (potential bot behavior)
      const requestCount = sessionStorage.getItem('request_count');
      const lastRequestTime = sessionStorage.getItem('last_request_time');
      const now = Date.now();

      if (requestCount && lastRequestTime) {
        const count = parseInt(requestCount);
        const timeDiff = now - parseInt(lastRequestTime);

        // If more than 50 requests in 1 minute, flag as suspicious
        if (count > 50 && timeDiff < 60000) {
          logSecurityEvent({
            type: 'suspicious_activity',
            description: 'Unusually high request frequency detected',
            metadata: { requestCount: count, timeWindow: timeDiff },
            riskLevel: 'medium'
          });

          // Clear the counter after logging
          sessionStorage.removeItem('request_count');
          sessionStorage.removeItem('last_request_time');
        }
      }

      // Update request tracking
      sessionStorage.setItem('request_count', (parseInt(requestCount || '0') + 1).toString());
      sessionStorage.setItem('last_request_time', now.toString());
    };

    // Monitor on page visibility changes (potential tab switching attacks)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched away from tab - could be suspicious in some contexts
        sessionStorage.setItem('tab_hidden_time', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        const hiddenTime = sessionStorage.getItem('tab_hidden_time');
        if (hiddenTime) {
          const timeAway = Date.now() - parseInt(hiddenTime);
          // If away for very short time but came back (possible automation)
          if (timeAway < 1000 && timeAway > 0) {
            logSecurityEvent({
              type: 'suspicious_activity',
              description: 'Rapid tab switching detected',
              metadata: { timeAway },
              riskLevel: 'low'
            });
          }
          sessionStorage.removeItem('tab_hidden_time');
        }
      }
    };

    // Set up monitoring
    const interval = setInterval(monitorActivity, 1000);
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

  // Content Security Policy violation handler
  useEffect(() => {
    const handleCSPViolation = (event: any) => {
      logSecurityEvent({
        type: 'data_breach_attempt',
        description: 'Content Security Policy violation detected',
        metadata: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          documentURI: event.documentURI
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