import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';

interface PaymentTimelineProps {
  eventId: string;
}

// Enhanced Payment interface with strict typing
interface Payment {
  id: string;
  event_id: string;
  tenant_id: string;
  payment_date: string;
  amount_gbp: number;
  payment_note: string | null;
  created_at: string;
}

// Data validation functions
const validatePayment = (payment: any): payment is Payment => {
  return (
    payment &&
    typeof payment === 'object' &&
    typeof payment.id === 'string' &&
    payment.id.length > 0 &&
    typeof payment.event_id === 'string' &&
    typeof payment.tenant_id === 'string' &&
    typeof payment.payment_date === 'string' &&
    typeof payment.amount_gbp === 'number' &&
    (payment.payment_note === null || typeof payment.payment_note === 'string') &&
    typeof payment.created_at === 'string'
  );
};

const validatePaymentArray = (payments: any[]): Payment[] => {
  if (!Array.isArray(payments)) {
    console.error('❌ Expected payments array, got:', typeof payments);
    return [];
  }
  
  const validPayments = payments.filter((payment, index) => {
    const isValid = validatePayment(payment);
    if (!isValid) {
      console.error(`❌ Invalid payment at index ${index}:`, payment);
    }
    return isValid;
  });
  
  console.log(`✅ Validated ${validPayments.length}/${payments.length} payments`);
  return validPayments;
};

export const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ eventId }) => {
  const { currentTenant } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [validatedPayments, setValidatedPayments] = useState<Payment[]>([]);

  // Enhanced fetch with proper React Query configuration and data validation
  const { data: rawPayments, refetch, isLoading, error } = useSupabaseQuery(
    ['event_payments', eventId],
    async () => {
      console.log('🔄 Fetching payments for event:', eventId);
      
      if (!eventId || !currentTenant?.id) {
        console.log('⚠️ Missing eventId or tenant, returning empty array');
        return [];
      }
      
      const { data, error } = await supabase
        .from('event_payments')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Payment fetch error:', error);
        throw error;
      }
      
      console.log('📄 Raw payments from database:', data);
      return data || [];
    }
  );

  // Data validation and monitoring with useEffect
  useEffect(() => {
    if (rawPayments) {
      console.log('🔍 Processing raw payments:', rawPayments);
      
      // Validate and process payments
      const processed = validatePaymentArray(rawPayments);
      
      // Check for data corruption
      if (processed.length !== rawPayments.length) {
        console.warn(`⚠️ Data validation filtered out ${rawPayments.length - processed.length} invalid payments`);
      }
      
      // Deep clone to prevent mutations
      const clonedPayments = processed.map(payment => ({ ...payment }));
      setValidatedPayments(clonedPayments);
      
      console.log('✅ Final validated payments:', clonedPayments);
    } else {
      console.log('📭 No payments data available');
      setValidatedPayments([]);
    }
  }, [rawPayments]);

  // Monitor payment data integrity
  useEffect(() => {
    if (validatedPayments.length > 0) {
      const corruptedPayments = validatedPayments.filter(payment => !validatePayment(payment));
      if (corruptedPayments.length > 0) {
        console.error('🚨 DETECTED CORRUPTED PAYMENTS:', corruptedPayments);
        toast.error('Data integrity issue detected. Please refresh the page.');
      }
    }
  }, [validatedPayments]);

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
      
      const formattedDate = new Date(paymentDate).toISOString().split('T')[0];
      console.log('💾 Inserting payment:', { 
        event_id: eventId, 
        payment_date: formattedDate, 
        amount_gbp: amountGbp,
        original_date: paymentDate
      });
      
      const { data: insertedPayment, error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          event_id: eventId,
          tenant_id: currentTenant.id,
          payment_date: formattedDate,
          amount_gbp: amountGbp,
          payment_note: paymentNote.trim() || null
        })
        .select()
        .single();
      
      if (paymentError) {
        console.error('❌ Payment insert error:', paymentError);
        throw paymentError;
      }
      
      console.log('✅ Payment inserted successfully:', insertedPayment);

      // Also add to communications timeline
      const { error: commError } = await supabase
        .from('event_communications')
        .insert({
          event_id: eventId,
          tenant_id: currentTenant.id,
          communication_date: formattedDate,
          communication_type: 'payment',
          note: `Payment received: £${amountGbp.toFixed(2)}${paymentNote.trim() ? ` - ${paymentNote.trim()}` : ''}`
        });
      
      if (commError) throw commError;
    },
    {
      onSuccess: async () => {
        toast.success('Payment recorded successfully');
        setAmount('');
        setPaymentNote('');
        setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
        setIsDialogOpen(false);
        
        await refetch();
        console.log('🔄 Payment list refreshed after successful insert');
      },
      invalidateQueries: [['event_payments', eventId], ['event-form-totals', eventId]],
      onError: (error) => {
        toast.error('Failed to record payment: ' + error.message);
      }
    }
  );

  // Delete payment mutation
  const deletePaymentMutation = useSupabaseMutation(
    async (paymentId: string) => {
      if (!currentTenant?.id) throw new Error('Missing tenant ID');
      if (!paymentId || typeof paymentId !== 'string') {
        throw new Error('Invalid payment ID');
      }
      
      console.log('🗑️ Deleting payment:', paymentId);
      
      // First, get the payment details for logging
      const { data: payment } = await supabase
        .from('event_payments')
        .select('amount_gbp')
        .eq('id', paymentId)
        .single();
      
      // Delete from event_payments
      const { error: paymentError } = await supabase
        .from('event_payments')
        .delete()
        .eq('id', paymentId)
        .eq('tenant_id', currentTenant.id);
      
      if (paymentError) throw paymentError;

      // Also add deletion note to communications timeline
      if (payment) {
        const formattedDate = new Date().toISOString().split('T')[0];
        await supabase
          .from('event_communications')
          .insert({
            event_id: eventId,
            tenant_id: currentTenant.id,
            communication_date: formattedDate,
            communication_type: 'payment',
            note: `Payment deleted: £${payment.amount_gbp.toFixed(2)}`
          });
      }
    },
    {
      onSuccess: () => {
        toast.success('Payment deleted successfully');
        refetch();
      },
      invalidateQueries: [['event_payments', eventId], ['event-form-totals', eventId]],
      onError: (error) => {
        toast.error('Failed to delete payment: ' + error.message);
      }
    }
  );

  const handleAddPayment = () => {
    addPaymentMutation.mutate({});
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  
  const totalPaid = validatedPayments?.reduce((sum, payment) => sum + payment.amount_gbp, 0) || 0;

  // Enhanced error handling and loading states
  if (error) {
    console.error('❌ Payment fetch error:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>Error loading payments. Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                  <PriceInput
                    value={parseFloat(amount) || 0}
                    onChange={(value) => setAmount(value.toString())}
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
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading payments...</p>
          </div>
        ) : validatedPayments && validatedPayments.length > 0 ? (
          <>
            <div className="space-y-3 mb-4">
              {validatedPayments.map((payment) => {
                // Additional runtime validation for each payment
                if (!validatePayment(payment)) {
                  console.error('🚨 Corrupted payment detected during render:', payment);
                  return null;
                }
                
                return (
                  <div key={payment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0">
                      <CreditCard className="h-4 w-4 mt-1 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : 'No date'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(payment.amount_gbp)}
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this payment of {formatCurrency(payment.amount_gbp)}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => {
                                    console.log('🔍 Attempting to delete payment:', { id: payment.id, payment });
                                    
                                    if (!payment.id || typeof payment.id !== 'string' || payment.id.trim() === '') {
                                      console.error('❌ Invalid payment ID for deletion:', payment.id);
                                      toast.error('Cannot delete payment: Invalid payment ID');
                                      return;
                                    }
                                    
                                    console.log('✅ Payment ID validated, proceeding with deletion:', payment.id);
                                    deletePaymentMutation.mutate(payment.id);
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {payment.payment_note && (
                        <p className="text-xs text-muted-foreground">{payment.payment_note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
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