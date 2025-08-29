import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, Edit3 } from 'lucide-react';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface EditableBalanceProps {
  eventId: string;
  currentBalance: number;
  eventTotal: number;
  onBalanceUpdated: () => void;
}

export const EditableBalance: React.FC<EditableBalanceProps> = ({
  eventId,
  currentBalance,
  eventTotal,
  onBalanceUpdated
}) => {
  const { currentTenant } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [editData, setEditData] = useState<{
    newBalance: number;
    reason: string;
  } | null>(null);

  const editBalanceMutation = useSupabaseMutation(async ({ newBalance, reason }: { newBalance: number; reason: string }) => {
    if (!eventId || !currentTenant?.id) throw new Error('Missing event or tenant ID');
    
    const { data: userData } = await supabase.auth.getUser();
    
    // First, log the balance modification
    const { error: logError } = await supabase
      .from('balance_modifications')
      .insert({
        tenant_id: currentTenant.id,
        event_id: eventId,
        modified_by: userData.user?.id,
        original_balance: currentBalance,
        new_balance: newBalance,
        edit_reason: reason,
        risk_acknowledged: true
      });
    
    if (logError) throw logError;
    
    // Calculate the difference and add it as a payment adjustment
    const balanceDifference = currentBalance - newBalance;
    
    if (balanceDifference !== 0) {
      const { error: paymentError } = await supabase
        .from('event_payments')
        .insert({
          tenant_id: currentTenant.id,
          event_id: eventId,
          amount_gbp: balanceDifference,
          payment_note: `Balance adjustment: ${reason}`,
          payment_date: new Date().toISOString().split('T')[0]
        });
      
      if (paymentError) throw paymentError;
    }
    
    // Log in communication timeline
    const { error: commError } = await supabase
      .from('communication_timeline')
      .insert({
        tenant_id: currentTenant.id,
        event_id: eventId,
        communication_type: 'other',
        summary: `Balance manually adjusted from ${formatCurrency(currentBalance)} to ${formatCurrency(newBalance)}. Reason: ${reason}`,
        follow_up_required: false
      });
    
    if (commError) throw commError;
    
    return { newBalance };
  }, {
    successMessage: 'Balance updated successfully!',
    onSuccess: () => {
      setShowEditDialog(false);
      setShowRiskDialog(false);
      setEditData(null);
      onBalanceUpdated();
    }
  });

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBalance = parseFloat(formData.get('new_balance') as string);
    const reason = formData.get('reason') as string;
    
    setEditData({ newBalance, reason });
    setShowEditDialog(false);
    setShowRiskDialog(true);
  };

  const confirmEdit = () => {
    if (editData) {
      editBalanceMutation.mutate(editData);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Remaining Balance</Label>
        <div className="flex items-center gap-2">
          <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium flex-1">
            {formatCurrency(currentBalance)}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEditDialog(true)}
            className="h-10 px-3"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Balance Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Edit Remaining Balance
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Editing the balance directly affects financial records. 
                This action will be logged and tracked for audit purposes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Balance:</span>
                <div className="font-medium">{formatCurrency(currentBalance)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Event Total:</span>
                <div className="font-medium">{formatCurrency(eventTotal)}</div>
              </div>
            </div>

            <div>
              <Label htmlFor="new_balance">New Balance Amount *</Label>
              <Input 
                id="new_balance" 
                name="new_balance" 
                type="number" 
                step="0.01"
                min="0"
                defaultValue={currentBalance}
                required 
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason for Change *</Label>
              <Textarea 
                id="reason" 
                name="reason" 
                placeholder="Explain why the balance is being adjusted..." 
                required 
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Continue to Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Risk Confirmation Dialog */}
      <AlertDialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Balance Change
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                You are about to change the remaining balance from{' '}
                <strong>{formatCurrency(currentBalance)}</strong> to{' '}
                <strong>{formatCurrency(editData?.newBalance || 0)}</strong>.
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <strong>This action will:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>Create an audit trail in the system</li>
                  <li>Add a communication log entry</li>
                  <li>Adjust payment records to reflect the change</li>
                  <li>Cannot be undone automatically</li>
                </ul>
              </div>

              <div>
                <strong>Reason:</strong> {editData?.reason}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRiskDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmEdit}
              className="bg-red-600 hover:bg-red-700"
              disabled={editBalanceMutation.isPending}
            >
              {editBalanceMutation.isPending ? 'Processing...' : 'Confirm Change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};