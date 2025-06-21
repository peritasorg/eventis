
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const TrialBanner = () => {
  const { currentTenant } = useAuth();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!currentTenant || currentTenant.subscription_status !== 'trial' || !isVisible) {
    return null;
  }

  // Calculate days remaining (mock calculation - you'll need to implement based on your trial logic)
  const trialEndDate = new Date(currentTenant.created_at);
  trialEndDate.setDate(trialEndDate.getDate() + 14); // Assuming 14-day trial
  const today = new Date();
  const daysRemaining = Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-center justify-between w-full">
        <AlertDescription className="text-blue-800 dark:text-blue-200 flex-1">
          <span className="font-medium">Trial Mode Active</span> - You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining. 
          <Button variant="link" className="p-0 ml-2 h-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
            Subscribe now to continue
          </Button>
        </AlertDescription>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};
