
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
    name: 'Eventis Pro',
    price: 199,
    description: 'A perfect entry-level solution to streamline basic workflows.',
    subtitle: 'For less complex operations',
    category: 'Starter • Primary',
    features: [
      'Up to 50 events per month.',
      'Basic dashboards and reports.',
      'Basic customer and lead management.',
      'Standard form builder with 10 templates.',
      'Core event management features.'
    ],
    bgColor: 'bg-cyan-100',
    buttonColor: 'bg-black text-white hover:bg-gray-800'
  },
  {
    name: 'Eventis Business',
    price: 249,
    description: 'Unlock advanced tools to drive team collaboration and boost productivity for your business',
    subtitle: 'For heavy operations',
    category: 'Growth',
    popular: true,
    features: [
      'Up to 200 events per month.',
      'Advanced customer management with segmentation.',
      'Unlimited form templates and field library.',
      'API access and integrations.',
      'Complete financial suite'
    ],
    bgColor: 'bg-slate-800',
    textColor: 'text-white',
    buttonColor: 'bg-white text-black hover:bg-gray-100'
  }
];

export const SubscriptionTiers = () => {
  const { subscriptionData, checkSubscriptionStatus } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tierName: string) => {
    try {
      setLoadingTier(tierName);
      
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">Select the perfect plan for your banquet business</p>
      </div>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {tiers.map((tier) => (
          <Card key={tier.name} className={`relative ${tier.bgColor} border-0 ${tier.textColor || 'text-black'}`}>
            {tier.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                Most Popular
              </Badge>
            )}
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tier.name === 'Eventis Business' ? 'bg-white' : 'bg-white'}`}>
                  {tier.name === 'Eventis Pro' && (
                    <div className="w-6 h-6 bg-cyan-500 rounded-full"></div>
                  )}
                  {tier.name === 'Eventis Business' && (
                    <div className="w-6 h-6 bg-black rounded"></div>
                  )}
                </div>
                <div>
                  <div className={`text-sm ${tier.name === 'Eventis Business' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {tier.subtitle}
                  </div>
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                </div>
              </div>
              
              <div className={`text-sm mb-2 ${tier.name === 'Eventis Business' ? 'text-gray-400' : 'text-gray-500'}`}>
                {tier.category}
              </div>
              
              <CardDescription className={`text-sm leading-relaxed ${tier.name === 'Eventis Business' ? 'text-gray-300' : 'text-gray-600'}`}>
                {tier.description}
              </CardDescription>
              
              <div className="mt-6">
                <span className="text-4xl font-bold">£{tier.price}</span>
                <span className={`text-sm ml-1 ${tier.name === 'Eventis Business' ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h4 className={`font-semibold mb-4 ${tier.name === 'Eventis Business' ? 'text-white' : 'text-black'}`}>
                  Features
                </h4>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tier.name === 'Eventis Business' ? 'text-white' : 'text-green-600'}`} />
                      <span className={`text-sm ${tier.name === 'Eventis Business' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {isCurrentTier(tier.name) ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className={`w-full ${tier.buttonColor} font-semibold`}
                  onClick={() => handleSubscribe(tier.name)}
                  disabled={loadingTier === tier.name}
                >
                  {loadingTier === tier.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {subscriptionData?.subscribed && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
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
