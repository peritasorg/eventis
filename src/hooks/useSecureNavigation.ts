import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { safeNavigate } from '@/utils/security';
import { useSecurity } from './useSecurity';

export const useSecureNavigation = () => {
  const navigate = useNavigate();
  const { logSecurityEvent } = useSecurity();

  const secureNavigate = useCallback((path: string, options?: { replace?: boolean }) => {
    try {
      // Log navigation for security monitoring
      if (path.includes('..') || path.includes('%2e%2e')) {
        logSecurityEvent({
          type: 'suspicious_activity',
          description: 'Directory traversal attempt in navigation',
          metadata: { attemptedPath: path },
          riskLevel: 'medium'
        });
        return;
      }

      safeNavigate(navigate, path);
      
      if (options?.replace) {
        navigate(path, { replace: true });
      }
    } catch (error) {
      logSecurityEvent({
        type: 'suspicious_activity',
        description: 'Navigation error occurred',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error', path },
        riskLevel: 'low'
      });
      
      // Fallback to safe route
      navigate('/');
    }
  }, [navigate, logSecurityEvent]);

  return { secureNavigate };
};