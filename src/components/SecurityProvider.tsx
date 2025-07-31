import React, { useEffect, ReactNode } from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { SECURITY_HEADERS, getCSPString } from '@/utils/securityConfig';

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { logSecurityEvent } = useSecurity();
  const { user } = useAuth();

  useEffect(() => {
    // Set security headers via meta tags (for additional protection)
    const setSecurityHeaders = () => {
      // Remove any existing security meta tags first
      const existingMeta = document.querySelectorAll('meta[http-equiv*="Security"], meta[http-equiv*="Content-Security"], meta[http-equiv*="X-"]');
      existingMeta.forEach(meta => meta.remove());

      // Apply all security headers from configuration
      Object.entries(SECURITY_HEADERS).forEach(([name, content]) => {
        const meta = document.createElement('meta');
        if (name.startsWith('X-') || name === 'Content-Security-Policy') {
          meta.httpEquiv = name;
        } else {
          meta.name = name.toLowerCase();
        }
        meta.content = content;
        document.head.appendChild(meta);
      });

      // Add Permissions Policy
      const permissionsMeta = document.createElement('meta');
      permissionsMeta.httpEquiv = 'Permissions-Policy';
      permissionsMeta.content = 'camera=(), microphone=(), geolocation=(), payment=()';
      document.head.appendChild(permissionsMeta);
    };

    setSecurityHeaders();

    // Monitor for developer tools (basic detection)
    const detectDevTools = () => {
      const threshold = 160;
      let devtools = false;

      const checkDevTools = () => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools) {
            devtools = true;
            if (user) {
              logSecurityEvent({
                type: 'suspicious_activity',
                description: 'Developer tools opened detected',
                metadata: { 
                  userAgent: navigator.userAgent,
                  viewport: { width: window.innerWidth, height: window.innerHeight }
                },
                riskLevel: 'low'
              });
            }
          }
        } else {
          devtools = false;
        }
      };

      // Check periodically
      const interval = setInterval(checkDevTools, 1000);
      return () => clearInterval(interval);
    };

    const cleanupDevToolsMonitor = detectDevTools();

    // Monitor for right-click context menu attempts on sensitive areas
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-sensitive]')) {
        e.preventDefault();
        logSecurityEvent({
          type: 'suspicious_activity',
          description: 'Right-click attempted on sensitive element',
          metadata: { elementType: target.tagName, elementClasses: target.className },
          riskLevel: 'low'
        });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    // Monitor for copy attempts on sensitive data
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 100) {
        logSecurityEvent({
          type: 'suspicious_activity',
          description: 'Large text selection copied',
          metadata: { selectionLength: selection.length },
          riskLevel: 'low'
        });
      }
    };

    document.addEventListener('copy', handleCopy);

    // Monitor for potential injection attempts via URL parameters
    const checkURLParams = () => {
      const params = new URLSearchParams(window.location.search);
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i
      ];

      for (const [key, value] of params.entries()) {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value) || pattern.test(key)) {
            logSecurityEvent({
              type: 'data_breach_attempt',
              description: 'Suspicious URL parameter detected',
              metadata: { parameter: key, value: value.substring(0, 100) },
              riskLevel: 'high'
            });
            
            // Clear the suspicious parameter
            params.delete(key);
            const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            window.history.replaceState({}, '', newURL);
            break;
          }
        }
      }
    };

    checkURLParams();

    return () => {
      cleanupDevToolsMonitor();
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [user, logSecurityEvent]);

  return <>{children}</>;
};