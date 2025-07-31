import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurity } from '@/hooks/useSecurity';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TrialValidatorProps {
  children: React.ReactNode;
}

interface TrialStatus {
  valid: boolean;
  reason: string;
  expired: boolean;
  days_remaining?: number;
}

export const TrialValidator: React.FC<TrialValidatorProps> = ({ children }) => {
  const { currentTenant, user } = useAuth();
  const { validateTrialStatus, logSecurityEvent } = useSecurity();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!currentTenant?.id || !user) {
        setIsValidating(false);
        return;
      }

      try {
        // Use server-side validation to prevent client-side bypass
        const response = await validateTrialStatus();
        
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const status = response as unknown as TrialStatus;
          setTrialStatus(status);
          
          // Log security events for expired access attempts
          if (!status.valid) {
            logSecurityEvent({
              type: 'unauthorized_access',
              description: `Trial access denied: ${status.reason}`,
              metadata: { 
                tenantId: currentTenant.id,
                reason: status.reason 
              },
              riskLevel: 'medium'
            });
          }
        } else {
          // Handle unexpected response format
          setTrialStatus({ valid: false, reason: 'invalid_response', expired: true });
        }
      } catch (error) {
        console.error('Failed to validate trial status:', error);
        logSecurityEvent({
          type: 'suspicious_activity',
          description: 'Trial validation failed',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          riskLevel: 'high'
        });
        
        // Default to invalid on error for security
        setTrialStatus({ valid: false, reason: 'validation_failed', expired: true });
      } finally {
        setIsValidating(false);
      }
    };

    checkTrialStatus();
    
    // Re-validate periodically (every 5 minutes)
    const interval = setInterval(checkTrialStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentTenant?.id, user, validateTrialStatus, logSecurityEvent]);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If trial is invalid, show appropriate message
  if (trialStatus && !trialStatus.valid) {
    const getMessage = () => {
      switch (trialStatus.reason) {
        case 'trial_expired':
          return 'Your free trial has expired. Please upgrade to continue using the service.';
        case 'tenant_not_found':
          return 'Account not found. Please contact support.';
        case 'tenant_deactivated':
          return 'Your account has been deactivated. Please contact support.';
        case 'subscription_inactive':
          return 'Your subscription is inactive. Please update your billing information.';
        default:
          return 'Access denied. Please check your account status.';
      }
    };

    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">{getMessage()}</p>
          <button 
            onClick={() => window.location.href = '/settings'}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
          >
            Manage Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};