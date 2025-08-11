import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CreditCard, Calendar, Check } from 'lucide-react';
import { SubscriptionTiers } from '@/components/SubscriptionTiers';
import { Separator } from '@/components/ui/separator';

export const BillingSettings = () => {
  const { subscriptionData, checkSubscriptionStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing preferences</p>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {subscriptionData.subscription_tier || 'Free Trial'}
                  </h3>
                  <p className="text-muted-foreground">
                    {subscriptionData.subscribed ? 'Active subscription' : 'Trial period'}
                  </p>
                </div>
                <Badge className={getStatusColor(subscriptionData.subscribed ? 'active' : 'trialing')}>
                  {subscriptionData.subscribed ? 'Active' : 'Trial'}
                </Badge>
              </div>

              {subscriptionData.subscription_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {subscriptionData.subscribed ? 'Renews' : 'Expires'} on{' '}
                  {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                </div>
              )}

              <div className="flex gap-3">
                {subscriptionData.subscribed && (
                  <Button 
                    onClick={handleManageSubscription} 
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Manage Subscription
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => setShowPlans(!showPlans)}
                >
                  {subscriptionData.subscribed ? 'Change Plan' : 'Upgrade Now'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading subscription information...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selection */}
      {showPlans && (
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Choose the plan that best fits your business needs</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionTiers />
          </CardContent>
        </Card>
      )}

      {/* Billing Features */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Features</CardTitle>
          <CardDescription>Available features with your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Payment & Security</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Secure payment processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>PCI DSS compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Multiple payment methods</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Account Management</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Easy plan upgrades/downgrades</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Billing history & invoices</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Usage analytics</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};