
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';

const tiers = [
  {
    name: 'Professional',
    price: 99,
    description: 'Perfect for small banquet halls',
    features: [
      'Up to 50 events per month',
      'Basic customer management',
      'Standard reporting',
      'Email support',
      'Basic form builder'
    ]
  },
  {
    name: 'Business',
    price: 149,
    description: 'Great for growing businesses',
    popular: true,
    features: [
      'Up to 200 events per month',
      'Advanced customer management',
      'Advanced reporting & analytics',
      'Priority support',
      'Advanced form builder',
      'Staff management',
      'Financial tracking'
    ]
  },
  {
    name: 'Enterprise',
    price: 159,
    description: 'For large banquet operations',
    features: [
      'Unlimited events',
      'Premium customer management',
      'Custom reports & dashboards',
      '24/7 phone support',
      'Custom form builder',
      'Advanced staff management',
      'Complete financial suite',
      'API access'
    ]
  }
];

export const SubscriptionTiers = () => {
  const { subscriptionData, checkSubscriptionStatus } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tierName: string) => {
    setLoadingTier(tierName);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: tierName }
      });

      if (error) {
        toast.error(`Subscription error: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        
        // Check subscription status after a delay
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 5000);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentTier = (tierName: string) => {
    return subscriptionData?.subscribed && subscriptionData?.subscription_tier === tierName;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-gray-600 mt-2">Select the perfect plan for your banquet business</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`relative ${tier.popular ? 'border-blue-500 shadow-lg' : ''}`}>
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentTier(tier.name) ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe(tier.name)}
                  disabled={loadingTier === tier.name}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  {loadingTier === tier.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {subscriptionData?.subscribed && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Current subscription: <strong>{subscriptionData.subscription_tier}</strong>
            {subscriptionData.subscription_end && (
              <> • Renews on {new Date(subscriptionData.subscription_end).toLocaleDateString()}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
