
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, DollarSign, Calendar, FileCheck } from 'lucide-react';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface EventBusinessFlowProps {
  depositPaid: boolean;
  balanceCleared: boolean;
  eventFinalized: boolean;
  eventId: string;
}

export const EventBusinessFlow: React.FC<EventBusinessFlowProps> = ({
  depositPaid,
  balanceCleared,
  eventFinalized,
  eventId
}) => {
  const updateEventMutation = useSupabaseMutation(
    async (updates: any) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event updated successfully!',
      invalidateQueries: [['event', eventId]]
    }
  );

  const handleMarkFinalized = () => {
    updateEventMutation.mutate({
      event_finalized: true,
      event_finalized_date: new Date().toISOString().split('T')[0]
    });
  };

  const steps = [
    {
      id: 'deposit',
      label: 'Deposit Paid',
      completed: depositPaid,
      icon: DollarSign,
      description: 'Customer deposit received'
    },
    {
      id: 'balance',
      label: 'Balance Cleared',
      completed: balanceCleared,
      icon: Calendar,
      description: 'Full payment received'
    },
    {
      id: 'finalized',
      label: 'Event Finalized',
      completed: eventFinalized,
      icon: FileCheck,
      description: 'Event marked as complete',
      action: !eventFinalized && balanceCleared ? handleMarkFinalized : undefined
    }
  ];

  return (
    <Card className="shadow-sm border-gray-200">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Process Flow</h3>
          <p className="text-gray-600 text-sm">Track your event's progress through key milestones</p>
        </div>
        
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-8 lg:space-x-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center text-center min-w-[120px]">
                    <div className={`
                      flex items-center justify-center w-16 h-16 rounded-full border-2 mb-4 transition-all duration-200
                      ${step.completed 
                        ? 'bg-green-50 border-green-500 text-green-600 shadow-md' 
                        : 'bg-gray-50 border-gray-300 text-gray-400'
                      }
                    `}>
                      {step.completed ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : (
                        <Icon className="w-8 h-8" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`font-semibold text-sm ${
                        step.completed ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-500 leading-tight">
                        {step.description}
                      </div>
                      {step.action && (
                        <Button
                          size="sm"
                          onClick={step.action}
                          className="mt-3 text-xs px-3 py-1.5 h-auto"
                          disabled={updateEventMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {!isLast && (
                    <div className={`w-12 lg:w-20 h-0.5 mx-4 lg:mx-8 transition-all duration-200 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
