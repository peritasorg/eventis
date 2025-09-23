import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CreditCard, Calendar, Check, ArrowLeft } from 'lucide-react';
import { SubscriptionTiers } from '@/components/SubscriptionTiers';
import { useNavigate } from 'react-router-dom';

export const BillingSettings = () => {
  const { subscriptionData, checkSubscriptionStatus } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // Determine if user has an active subscription
  const hasActiveSubscription = subscriptionData?.subscribed === true;

  // Show plans automatically if no active subscription
  useEffect(() => {
    if (subscriptionData !== null && !hasActiveSubscription) {
      setShowPlans(true);
    }
  }, [subscriptionData, hasActiveSubscription]);

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
    <div className="p-8 bg-background min-h-screen">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing preferences</p>
      </div>

      <div className="max-w-4xl space-y-6">

        {/* Current Subscription Status */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          {subscriptionData ? (
            <div className="space-y-4">
              {hasActiveSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {subscriptionData.subscription_tier || 'Active Subscription'}
                      </h3>
                      <p className="text-muted-foreground">Active subscription</p>
                    </div>
                    <Badge className={getStatusColor('active')}>
                      Active
                    </Badge>
                  </div>

                  {subscriptionData.subscription_end && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Renews on {new Date(subscriptionData.subscription_end).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleManageSubscription} 
                      disabled={loading}
                      className="flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Manage Subscription
                    </Button>

                    <Button 
                      variant="outline" 
                      onClick={() => setShowPlans(!showPlans)}
                      className="flex items-center justify-center gap-2"
                    >
                      {showPlans ? 'Hide Plans' : 'Change Plan'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">No Active Subscription</h3>
                    <p className="text-muted-foreground">
                      Choose a plan below to get started with premium features
                    </p>
                  </div>
                  <Badge className={getStatusColor('canceled')}>
                    Free Plan
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading subscription information...</p>
            </div>
          )}
        </CardContent>
        </Card>

        {/* Plan Selection - Show automatically if no subscription or when toggled */}
        {(showPlans || !hasActiveSubscription) && (
          <Card className="transition-all hover:shadow-md">
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
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle>Billing Features</CardTitle>
            <CardDescription>Available features with your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Payment & Security</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Multiple payment methods</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Account Management</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Easy plan upgrades/downgrades</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Billing history & invoices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Usage analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};