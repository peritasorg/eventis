
import React from 'react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrialBanner = () => {
  const { isTrialActive, isTrialExpired, daysRemaining } = useTrialStatus();
  const [isVisible, setIsVisible] = React.useState(true);
  const navigate = useNavigate();

  const handleSubscribe = () => {
    navigate('/settings');
  };

  if (!isVisible || (!isTrialActive && !isTrialExpired)) {
    return null;
  }

  if (isTrialExpired) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
        <div className="flex items-center justify-between w-full">
          <AlertDescription className="text-red-800 dark:text-red-200 flex-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Trial Expired</span> - Your free trial has ended. 
            <Button 
              variant="link" 
              className="p-0 ml-2 h-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              onClick={handleSubscribe}
            >
              Subscribe now to continue
            </Button>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-center justify-between w-full">
        <AlertDescription className="text-blue-800 dark:text-blue-200 flex-1">
          <span className="font-medium">Trial Mode Active</span> - You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining. 
          <Button 
            variant="link" 
            className="p-0 ml-2 h-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            onClick={handleSubscribe}
          >
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
