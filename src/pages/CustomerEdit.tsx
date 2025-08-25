import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  company: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
  dietary_requirements: string;
  accessibility_requirements: string;
  special_requests: string;
}

export const CustomerEdit: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch customer data
  const { data: customer, isLoading } = useSupabaseQuery(
    ['customer', customerId],
    async () => {
      if (!customerId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CustomerFormData>();

  // Reset form when customer data loads
  React.useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        mobile: customer.mobile || '',
        company: customer.company || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        city: customer.city || '',
        postal_code: customer.postal_code || '',
        country: customer.country || 'GB',
        notes: customer.notes || '',
        dietary_requirements: customer.dietary_requirements || '',
        accessibility_requirements: customer.accessibility_requirements || '',
        special_requests: customer.special_requests || '',
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    if (!customerId || !currentTenant?.id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      toast.success('Customer updated successfully');
      navigate(`/customers/${customerId}`);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading customer details...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-lg text-muted-foreground">Customer not found</div>
        <Button onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/customers/${customerId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Customer</h1>
            <p className="text-muted-foreground">{customer.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Customer full name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  {...register('company')}
                  placeholder="Company name (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="customer@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                {...register('mobile')}
                placeholder="Mobile number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                {...register('address_line1')}
                placeholder="Street address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                {...register('address_line2')}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="City"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  placeholder="Postal code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="Country code (e.g., GB)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Any additional notes about this customer"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dietary_requirements">Dietary Requirements</Label>
              <Textarea
                id="dietary_requirements"
                {...register('dietary_requirements')}
                placeholder="Any dietary requirements or allergies"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessibility_requirements">Accessibility Requirements</Label>
              <Textarea
                id="accessibility_requirements"
                {...register('accessibility_requirements')}
                placeholder="Any accessibility requirements"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests</Label>
              <Textarea
                id="special_requests"
                {...register('special_requests')}
                placeholder="Any special requests or preferences"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/customers/${customerId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};