import React from 'react';
import { Check, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EventBusinessFlowProps {
  depositPaid: boolean;
  balanceCleared: boolean;
  eventFinalized: boolean;
  eventId: string;
  compact?: boolean;
}

export const EventBusinessFlow: React.FC<EventBusinessFlowProps> = ({
  depositPaid,
  balanceCleared,
  eventFinalized,
  eventId,
  compact = false
}) => {
  const { currentTenant } = useAuth();

  const finalizeEventMutation = useSupabaseMutation(
    async () => {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          event_finalized: true,
          event_finalized_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event finalized successfully!',
      invalidateQueries: [['event', eventId]]
    }
  );

  const handleMarkFinalized = () => {
    finalizeEventMutation.mutate(undefined);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1 ${depositPaid ? 'text-green-600' : 'text-gray-400'}`}>
          {depositPaid ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          <span>Deposit</span>
        </div>
        <div className={`flex items-center gap-1 ${balanceCleared ? 'text-green-600' : 'text-gray-400'}`}>
          {balanceCleared ? <Check className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
          <span>Balance</span>
        </div>
        <div className={`flex items-center gap-1 ${eventFinalized ? 'text-green-600' : 'text-gray-400'}`}>
          {eventFinalized ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          <span>Final</span>
        </div>
        {balanceCleared && !eventFinalized && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkFinalized}
            disabled={finalizeEventMutation.isPending}
            className="h-6 px-2 text-xs"
          >
            Finalize
          </Button>
        )}
      </div>
    );
  }

  const steps = [
    {
      label: 'Deposit Paid',
      completed: depositPaid,
      icon: depositPaid ? Check : Clock,
      description: 'Initial payment received'
    },
    {
      label: 'Balance Cleared',
      completed: balanceCleared,
      icon: balanceCleared ? Check : DollarSign,
      description: 'Full payment completed'
    },
    {
      label: 'Event Finalized',
      completed: eventFinalized,
      icon: eventFinalized ? Check : Clock,
      description: 'Event marked as complete',
      action: balanceCleared && !eventFinalized ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkFinalized}
          disabled={finalizeEventMutation.isPending}
          className="ml-2"
        >
          {finalizeEventMutation.isPending ? 'Finalizing...' : 'Mark Complete'}
        </Button>
      ) : null
    }
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        return (
          <div key={step.label} className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              step.completed 
                ? 'bg-green-100 border-green-500 text-green-700' 
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                step.completed ? 'text-green-900' : 'text-gray-900'
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {step.action}
          </div>
        );
      })}
    </div>
  );
};