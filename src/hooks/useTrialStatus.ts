
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const useTrialStatus = () => {
  const { currentTenant } = useAuth();

  const trialStatus = useMemo(() => {
    if (!currentTenant) {
      return {
        isTrialActive: false,
        isTrialExpired: false,
        daysRemaining: 0,
        hasActiveSubscription: false,
        isLocked: false
      };
    }

    const isTrialMode = currentTenant.subscription_status === 'trial';
    const trialEndDate = currentTenant.trial_ends_at ? new Date(currentTenant.trial_ends_at) : null;
    const now = new Date();
    
    const isTrialExpired = isTrialMode && trialEndDate && trialEndDate < now;
    const isTrialActive = isTrialMode && trialEndDate && trialEndDate > now;
    
    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const hasActiveSubscription = currentTenant.subscription_status === 'active';
    const isLocked = isTrialExpired && !hasActiveSubscription;

    return {
      isTrialActive,
      isTrialExpired,
      daysRemaining,
      hasActiveSubscription,
      isLocked
    };
  }, [currentTenant]);

  return trialStatus;
};
