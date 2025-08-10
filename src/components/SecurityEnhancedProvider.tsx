import React, { useEffect, ReactNode } from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { SECURITY_HEADERS, getCSPString } from '@/utils/securityConfig';

interface SecurityEnhancedProviderProps {
  children: ReactNode;
}

export const SecurityEnhancedProvider: React.FC<SecurityEnhancedProviderProps> = ({ children }) => {
  const { logSecurityEvent } = useSecurity();
  const { user } = useAuth();

  useEffect(() => {
    // Enhanced security headers with stricter CSP
    const setEnhancedSecurityHeaders = () => {
      // Remove any existing security meta tags first
      const existingMeta = document.querySelectorAll('meta[http-equiv*="Security"], meta[http-equiv*="Content-Security"], meta[http-equiv*="X-"]');
      existingMeta.forEach(meta => meta.remove());

      // Apply enhanced security headers
      const enhancedHeaders = {
        ...SECURITY_HEADERS,
        'Content-Security-Policy': getCSPString(),
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
      };

      Object.entries(enhancedHeaders).forEach(([name, content]) => {
        const meta = document.createElement('meta');
        meta.httpEquiv = name;
        meta.content = content;
        document.head.appendChild(meta);
      });
    };

    setEnhancedSecurityHeaders();

    // Enhanced security monitoring with better detection
    const setupSecurityMonitoring = () => {
      let suspiciousActivityScore = 0;
      let lastActivityReset = Date.now();

      // Reset suspicious activity score every hour
      const scoreResetInterval = setInterval(() => {
        suspiciousActivityScore = 0;
        lastActivityReset = Date.now();
      }, 3600000); // 1 hour

      // Monitor for injection attempts via console
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('<script') || message.includes('javascript:') || message.includes('eval(')) {
          suspiciousActivityScore += 10;
          if (suspiciousActivityScore > 50) {
            logSecurityEvent({
              type: 'injection_attempt',
              description: 'Potential script injection detected in console',
              metadata: { 
                message: message.substring(0, 200),
                score: suspiciousActivityScore
              },
              riskLevel: 'high'
            });
          }
        }
        originalConsoleLog.apply(console, args);
      };

      console.error = (...args: any[]) => {
        const message = args.join(' ');
        // Monitor for security-related errors
        if (message.includes('Content Security Policy') || 
            message.includes('Mixed Content') ||
            message.includes('CORS')) {
          logSecurityEvent({
            type: 'security_error',
            description: 'Security-related browser error detected',
            metadata: { 
              error: message.substring(0, 200),
              timestamp: Date.now()
            },
            riskLevel: 'medium'
          });
        }
        originalConsoleError.apply(console, args);
      };

      // Monitor for rapid navigation attempts (possible bot behavior)
      let navigationCount = 0;
      const handleNavigation = () => {
        navigationCount++;
        if (navigationCount > 20) { // More than 20 navigations in 5 minutes
          logSecurityEvent({
            type: 'suspicious_navigation',
            description: 'Rapid navigation pattern detected',
            metadata: { 
              navigationCount,
              timeWindow: '5 minutes'
            },
            riskLevel: 'medium'
          });
          navigationCount = 0; // Reset to prevent spam
        }
      };

      window.addEventListener('popstate', handleNavigation);
      
      const navigationResetInterval = setInterval(() => {
        navigationCount = 0;
      }, 300000); // Reset every 5 minutes

      return () => {
        clearInterval(scoreResetInterval);
        clearInterval(navigationResetInterval);
        window.removeEventListener('popstate', handleNavigation);
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    };

    const cleanupSecurityMonitoring = setupSecurityMonitoring();

    // Enhanced CSP violation handler
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      logSecurityEvent({
        type: 'csp_violation',
        description: 'Content Security Policy violation detected',
        metadata: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
          effectiveDirective: event.effectiveDirective
        },
        riskLevel: 'high'
      });
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Log successful security initialization
    if (user) {
      logSecurityEvent({
        type: 'security_init',
        description: 'Enhanced security monitoring initialized',
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          securityFeatures: [
            'CSP enabled',
            'Enhanced headers',
            'Injection monitoring',
            'Navigation monitoring'
          ]
        },
        riskLevel: 'low'
      });
    }

    return () => {
      cleanupSecurityMonitoring();
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    };
  }, [user, logSecurityEvent]);

  return <>{children}</>;
};