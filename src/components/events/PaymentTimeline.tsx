import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';

interface PaymentTimelineProps {
  eventId: string;
}

export const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ eventId }) => {
  const { currentTenant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Fetch payments
  const { data: payments, refetch } = useSupabaseQuery(
    ['event_payments', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_payments')
        .select('*')
        .eq('event_id', eventId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  // Add payment mutation
  const addPaymentMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id || !amount.trim()) {
        throw new Error('Missing required data');
      }
      
      const amountGbp = parseFloat(amount);
      if (isNaN(amountGbp) || amountGbp <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Insert payment
      const { error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          event_id: eventId,
          tenant_id: currentTenant.id,
          payment_date: paymentDate,
          amount_gbp: amountGbp,
          payment_note: paymentNote.trim() || null
        });
      
      if (paymentError) throw paymentError;

      // Also add to communications timeline
      const { error: commError } = await supabase
        .from('event_communications')
        .insert({
          event_id: eventId,
          tenant_id: currentTenant.id,
          communication_date: paymentDate,
          communication_type: 'payment',
          note: `Payment received: £${amountGbp.toFixed(2)}${paymentNote.trim() ? ` - ${paymentNote.trim()}` : ''}`
        });
      
      if (commError) throw commError;
    },
    {
      onSuccess: () => {
        toast.success('Payment recorded successfully');
        setAmount('');
        setPaymentNote('');
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
        setIsDialogOpen(false);
        refetch();
      },
      invalidateQueries: [['event_payments', eventId], ['event-form-totals', eventId]],
      onError: (error) => {
        toast.error('Failed to record payment: ' + error.message);
      }
    }
  );

  const handleAddPayment = () => {
    addPaymentMutation.mutate({});
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  
  const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount_gbp, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Timeline
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (£)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_note">Note (optional)</Label>
                  <Textarea
                    id="payment_note"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Payment details..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleAddPayment}
                  disabled={!amount.trim() || addPaymentMutation.isPending}
                  className="w-full"
                >
                  {addPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {payments && payments.length > 0 ? (
          <>
            <div className="space-y-3 mb-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-4 w-4 mt-1 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(payment.amount_gbp)}
                      </span>
                    </div>
                    {payment.payment_note && (
                      <p className="text-xs text-muted-foreground">{payment.payment_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Total Paid:</span>
                <span className="text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No payments recorded yet. Record your first payment to track financial progress.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};