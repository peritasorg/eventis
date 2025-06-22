
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Success = () => {
  const { checkSubscriptionStatus } = useAuth();

  useEffect(() => {
    // Check subscription status when the success page loads
    const timer = setTimeout(() => {
      checkSubscriptionStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkSubscriptionStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing to BanquetPro. Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            You can now access all the premium features of your chosen plan.
          </p>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/">
                Go to Dashboard
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link to="/settings">
                Manage Subscription
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
