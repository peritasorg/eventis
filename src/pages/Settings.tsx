
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SubscriptionTiers } from '@/components/SubscriptionTiers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

export const Settings = () => {
  const { userProfile, currentTenant, subscriptionData, signOut, checkSubscriptionStatus } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        toast.error(`Portal error: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setIsLoading(true);
    try {
      await checkSubscriptionStatus();
      toast.success('Subscription status refreshed');
    } catch (error) {
      toast.error('Failed to refresh subscription status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="container mx-auto py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600">Manage your account and subscription</p>
          </div>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-gray-900">{userProfile?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-gray-900">{userProfile?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Name</label>
                  <p className="text-gray-900">{currentTenant?.business_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <p className="text-gray-900">{userProfile?.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>Current subscription information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      subscriptionData.subscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {subscriptionData.subscribed ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {subscriptionData.subscription_tier && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Plan:</span>
                      <span className="font-semibold">{subscriptionData.subscription_tier}</span>
                    </div>
                  )}
                  
                  {subscriptionData.subscription_end && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Next Billing:</span>
                      <span>{new Date(subscriptionData.subscription_end).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleManageSubscription}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Manage Subscription
                    </Button>
                    
                    <Button 
                      onClick={handleRefreshSubscription}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Refresh Status
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">No subscription data available</p>
                  <Button onClick={handleRefreshSubscription} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Check Subscription Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Subscription Plans */}
          {!subscriptionData?.subscribed && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Choose a Subscription Plan</h2>
              <SubscriptionTiers />
            </div>
          )}

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={signOut} variant="destructive">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
