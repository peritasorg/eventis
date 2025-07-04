
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrialLockOverlayProps {
  children: React.ReactNode;
}

export const TrialLockOverlay: React.FC<TrialLockOverlayProps> = ({ children }) => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  const isTrialExpired = currentTenant?.subscription_status === 'trial' && 
    currentTenant?.trial_ends_at && 
    new Date(currentTenant.trial_ends_at) < new Date();

  const handleSubscribe = () => {
    navigate('/settings');
  };

  if (!isTrialExpired) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="filter blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Trial Expired</CardTitle>
            <CardDescription>
              Your free trial has ended. Subscribe to continue using the platform.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Your data is safe and preserved</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Choose from flexible pricing plans</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Instant access upon subscription</span>
              </div>
            </div>
            
            <Button 
              onClick={handleSubscribe}
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              View Subscription Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
</TrialLockOverlay>
