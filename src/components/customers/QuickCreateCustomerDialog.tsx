import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AddressSearchInput } from '@/components/ui/address-search-input';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QuickCreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: any) => void;
}

export const QuickCreateCustomerDialog: React.FC<QuickCreateCustomerDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated
}) => {
  const { currentTenant } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    } as any,
    notes: ''
  });

  const createCustomerMutation = useSupabaseMutation(
    async (customerData: typeof formData) => {
      if (!currentTenant?.id) throw new Error('No tenant ID');
      
      // Flatten the address object and create proper customer record
      const flattenedData = {
        name: `${customerData.first_name} ${customerData.last_name}`.trim(),
        email: customerData.email,
        phone: customerData.phone,
        address_line1: customerData.address?.line1 || '',
        address_line2: customerData.address?.line2 || '',
        city: customerData.address?.city || '',
        postal_code: customerData.address?.postcode || '',
        country: customerData.address?.country || 'United Kingdom',
        notes: customerData.notes,
        tenant_id: currentTenant.id,
        customer_type: 'individual',
        active: true,
        marketing_consent: false,
        vip_status: false
      };
      
      const { data, error } = await supabase
        .from('customers')
        .insert([flattenedData])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    {
      onSuccess: (newCustomer) => {
        toast.success('Customer created successfully!');
        onCustomerCreated(newCustomer);
        onOpenChange(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address: {
            line1: '',
            line2: '',
            city: '',
            county: '',
            postcode: '',
            country: 'United Kingdom'
          } as any,
          notes: ''
        });
      },
      onError: (error) => {
        toast.error('Failed to create customer: ' + error.message);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      toast.error('Please provide at least first and last name');
      return;
    }
    createCustomerMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
          
          <AddressSearchInput
            value={formData.address}
            onChange={(address) => setFormData(prev => ({ ...prev, address }))}
          />
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomerMutation.isPending}>
              {createCustomerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};