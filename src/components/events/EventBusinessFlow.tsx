
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
      <CardContent className="p-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4 lg:space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center text-center min-w-[100px]">
                    <div className={`
                      flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 transition-all duration-200
                      ${step.completed 
                        ? 'bg-green-50 border-green-500 text-green-600 shadow-md' 
                        : 'bg-gray-50 border-gray-300 text-gray-400'
                      }
                    `}>
                      {step.completed ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className={`font-medium text-xs ${
                        step.completed ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                      {step.action && (
                        <Button
                          size="sm"
                          onClick={step.action}
                          className="mt-2 text-xs px-2 py-1 h-auto"
                          disabled={updateEventMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {!isLast && (
                    <div className={`w-8 lg:w-12 h-0.5 mx-2 lg:mx-4 transition-all duration-200 ${
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
