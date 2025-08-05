import React, { useState } from 'react';
import { Check, Clock, DollarSign, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseMutation, useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedBusinessFlowProps {
  eventId: string;
  depositPaid: boolean;
  balanceCleared: boolean;
  eventFinalized: boolean;
  depositAmount?: number;
  totalAmount?: number;
  compact?: boolean;
}

export const EnhancedBusinessFlow: React.FC<EnhancedBusinessFlowProps> = ({
  eventId,
  depositPaid,
  balanceCleared,
  eventFinalized,
  depositAmount = 0,
  totalAmount = 0,
  compact = false
}) => {
  const { currentTenant } = useAuth();
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [tempDepositAmount, setTempDepositAmount] = useState(depositAmount.toString());

  // Query for total paid calculation
  const { data: paymentData } = useSupabaseQuery(
    ['payment-totals', eventId],
    async () => {
      if (!eventId) return { totalPaid: 0 };
      
      const { data, error } = await supabase
        .rpc('calculate_total_paid', { p_event_id: eventId });
      
      if (error) {
        console.error('Error calculating total paid:', error);
        return { totalPaid: 0 };
      }
      
      return { totalPaid: data || 0 };
    }
  );

  const updateDepositMutation = useSupabaseMutation(
    async (newDepositAmount: number) => {
      const { data, error } = await supabase
        .from('events')
        .update({ deposit_amount: newDepositAmount })
        .eq('id', eventId)
        .eq('tenant_id', currentTenant?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Deposit amount updated successfully!',
      invalidateQueries: [['event', eventId], ['payment-totals', eventId]]
    }
  );

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

  const handleDepositSave = () => {
    const newAmount = parseFloat(tempDepositAmount) || 0;
    updateDepositMutation.mutate(newAmount);
    setIsEditingDeposit(false);
  };

  const handleDepositCancel = () => {
    setTempDepositAmount(depositAmount.toString());
    setIsEditingDeposit(false);
  };

  const totalPaid = paymentData?.totalPaid || 0;
  const balanceDue = totalAmount - totalPaid;

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
            onClick={() => finalizeEventMutation.mutate(undefined)}
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
      description: `Deposit: £${depositAmount.toFixed(2)}`,
      action: (
        <div className="flex items-center gap-2">
          {isEditingDeposit ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={tempDepositAmount}
                onChange={(e) => setTempDepositAmount(e.target.value)}
                className="w-20 h-6 text-xs"
                step="0.01"
              />
              <Button
                size="sm"
                onClick={handleDepositSave}
                disabled={updateDepositMutation.isPending}
                className="h-6 px-2 text-xs"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDepositCancel}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditingDeposit(true)}
              className="h-6 px-2 text-xs"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    },
    {
      label: 'Balance Cleared',
      completed: balanceCleared,
      icon: balanceCleared ? Check : DollarSign,
      description: `Balance Due: £${balanceDue.toFixed(2)}`,
      details: `Total Paid: £${totalPaid.toFixed(2)} / £${totalAmount.toFixed(2)}`
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
          onClick={() => finalizeEventMutation.mutate(undefined)}
          disabled={finalizeEventMutation.isPending}
          className="ml-2"
        >
          {finalizeEventMutation.isPending ? 'Finalizing...' : 'Mark Complete'}
        </Button>
      ) : null
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Business Process Flow</CardTitle>
      </CardHeader>
      <CardContent>
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
                  {step.details && (
                    <p className="text-xs text-gray-400">{step.details}</p>
                  )}
                </div>
                {step.action}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};