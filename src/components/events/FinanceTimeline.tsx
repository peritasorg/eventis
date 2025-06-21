
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceTimelineProps {
  eventId: string;
}

export const FinanceTimeline: React.FC<FinanceTimelineProps> = ({ eventId }) => {
  const { currentTenant } = useAuth();
  const [isAddingPayment, setIsAddingPayment] = useState(false);

  const { data: payments, refetch } = useSupabaseQuery(
    ['finance-timeline', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('finance_timeline')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .order('payment_date', { ascending: false });
      
      if (error) {
        console.error('Finance timeline error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const addPaymentMutation = useSupabaseMutation(
    async (paymentData: any) => {
      const { data, error } = await supabase
        .from('finance_timeline')
        .insert([{
          ...paymentData,
          tenant_id: currentTenant?.id,
          event_id: eventId
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Payment logged successfully!',
      invalidateQueries: [['finance-timeline', eventId], ['event', eventId]],
      onSuccess: () => {
        setIsAddingPayment(false);
      }
    }
  );

  const handleAddPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const paymentData = {
      payment_type: formData.get('payment_type') as string,
      amount: parseFloat(formData.get('amount') as string),
      payment_date: formData.get('payment_date') as string,
      payment_method: formData.get('payment_method') as string,
      reference_number: formData.get('reference_number') as string,
      notes: formData.get('notes') as string,
    };

    addPaymentMutation.mutate(paymentData);
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'card': return CreditCard;
      case 'bank_transfer': return DollarSign;
      default: return DollarSign;
    }
  };

  const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finance Timeline
            <span className="text-sm font-normal text-gray-600">
              (Total Paid: £{totalPaid.toLocaleString()})
            </span>
          </div>
          <Dialog open={isAddingPayment} onOpenChange={setIsAddingPayment}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_type">Payment Type</Label>
                    <Select name="payment_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partial_payment">Partial Payment</SelectItem>
                        <SelectItem value="final_payment">Final Payment</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (£)</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      name="payment_date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select name="payment_method" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    name="reference_number"
                    placeholder="Transaction reference, cheque number, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddingPayment(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addPaymentMutation.isPending}>
                    {addPaymentMutation.isPending ? 'Saving...' : 'Log Payment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments && payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment) => {
              const Icon = getPaymentIcon(payment.payment_method);
              return (
                <div key={payment.id} className="border-l-2 border-green-200 pl-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{payment.payment_type.replace('_', ' ')}</span>
                          <span className="font-bold text-green-600">
                            £{payment.amount.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                        {payment.reference_number && (
                          <span className="ml-2">• Ref: {payment.reference_number}</span>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-gray-700">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No payments logged yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
