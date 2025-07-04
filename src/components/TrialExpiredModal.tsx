
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TrialExpiredModal = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  const isTrialExpired = currentTenant?.subscription_status === 'trial' && 
    currentTenant?.trial_ends_at && 
    new Date(currentTenant.trial_ends_at) < new Date();

  const handleSubscribe = () => {
    navigate('/settings');
  };

  return (
    <Dialog open={isTrialExpired} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">Trial Expired</DialogTitle>
          <DialogDescription className="text-base">
            Your 14-day free trial has ended. Subscribe now to continue using all features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your data is safely stored and won't be lost</li>
              <li>• Choose a plan that fits your business needs</li>
              <li>• Continue managing your events and customers</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleSubscribe}
            className="w-full"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            View Subscription Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
