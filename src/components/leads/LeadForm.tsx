import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LeadFormProps {
  onSuccess: () => void;
  eventTypeConfigs: any[];
  leadData?: any;
  isEdit?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ 
  onSuccess, 
  eventTypeConfigs, 
  leadData, 
  isEdit = false 
}) => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dateOfInterest, setDateOfInterest] = useState<Date | undefined>(
    leadData?.date_of_interest ? new Date(leadData.date_of_interest) : undefined
  );
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(
    leadData?.appointment_date ? new Date(leadData.appointment_date) : undefined
  );
  const [dateOfContact, setDateOfContact] = useState<Date | undefined>(
    leadData?.date_of_contact ? new Date(leadData.date_of_contact) : new Date()
  );

  const [formData, setFormData] = useState({
    name: leadData?.name || '',
    email: leadData?.email || '',
    phone: leadData?.phone || '',
    event_type: leadData?.event_type || '',
    men_count: leadData?.men_count || 0,
    ladies_count: leadData?.ladies_count || 0,
    guest_mixture: leadData?.guest_mixture || 'Mixed',
    estimated_budget: leadData?.estimated_budget || '',
    status: leadData?.status || 'new',
    source: leadData?.source || 'website',
    notes: leadData?.notes || '',
    priority: leadData?.priority || 'medium'
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setIsLoading(true);
    try {
      // Prepare lead data with proper field mapping and validation
      const leadDataToSave = {
        tenant_id: currentTenant.id,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        event_type: formData.event_type || null,
        men_count: parseInt(formData.men_count.toString()) || 0,
        ladies_count: parseInt(formData.ladies_count.toString()) || 0,
        guest_mixture: formData.guest_mixture || 'Mixed',
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget.toString()) : null,
        estimated_guests: (parseInt(formData.men_count.toString()) || 0) + (parseInt(formData.ladies_count.toString()) || 0),
        status: formData.status || 'new',
        source: formData.source || 'website',
        priority: formData.priority || 'medium',
        notes: formData.notes?.trim() || null,
        lead_score: 0,
        date_of_interest: dateOfInterest ? format(dateOfInterest, 'yyyy-MM-dd') : null,
        appointment_date: appointmentDate ? format(appointmentDate, 'yyyy-MM-dd') : null,
        date_of_contact: dateOfContact ? format(dateOfContact, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        updated_at: new Date().toISOString()
      };

      console.log('Saving lead data:', leadDataToSave);

      let result;
      if (isEdit && leadData?.id) {
        result = await supabase
          .from('leads')
          .update(leadDataToSave)
          .eq('id', leadData.id)
          .eq('tenant_id', currentTenant.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('leads')
          .insert([leadDataToSave])
          .select()
          .single();
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      console.log('Lead saved successfully:', result.data);
      toast.success(isEdit ? 'Lead updated successfully!' : 'Lead created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('not-null')) {
        toast.error('Please fill in all required fields.');
      } else if (error.message?.includes('duplicate')) {
        toast.error('A lead with this information already exists.');
      } else if (error.message?.includes('foreign key')) {
        toast.error('Invalid event type selected.');
      } else {
        toast.error(`Failed to save lead: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleConvertToCustomer = async () => {
    if (!leadData || !currentTenant?.id) return;

    setIsLoading(true);
    try {
      // Create customer record with comprehensive data mapping
      const customerData = {
        tenant_id: currentTenant.id,
        name: leadData.name.trim(),
        email: leadData.email?.trim() || null,
        phone: leadData.phone?.trim() || null,
        customer_type: 'individual',
        notes: leadData.notes?.trim() || null,
        lead_id: leadData.id,
        active: true,
        customer_since: new Date().toISOString().split('T')[0],
        marketing_consent: false,
        vip_status: false,
        preferred_contact_method: leadData.email ? 'email' : 'phone',
        // Additional fields from lead data
        total_events: 0,
        total_spent: 0,
        average_event_value: 0
      };

      console.log('Creating customer with data:', customerData);

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (customerError) {
        console.error('Customer creation error:', customerError);
        throw customerError;
      }

      console.log('Customer created successfully:', customer);

      // Update lead status to won and add conversion date
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'won',
          conversion_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadData.id)
        .eq('tenant_id', currentTenant.id);

      if (leadError) {
        console.error('Lead update error:', leadError);
        throw leadError;
      }

      console.log('Lead status updated to won');

      toast.success('Lead successfully converted to customer!');
      onSuccess(); // Close the dialog
      
      // Navigate to the new customer profile
      navigate(`/customers/${customer.id}`);
      
    } catch (error: any) {
      console.error('Error converting lead to customer:', error);
      
      if (error.message?.includes('duplicate')) {
        toast.error('A customer with this information already exists.');
      } else if (error.message?.includes('not-null') || error.message?.includes('null value')) {
        toast.error('Missing required customer information. Please ensure name is provided.');
      } else if (error.message?.includes('foreign key')) {
        toast.error('Invalid data reference. Please check the lead information.');
      } else {
        toast.error(`Failed to convert lead: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="event_type">Event Type {!isEdit && '(Optional)'}</Label>
          <Select value={formData.event_type || 'none'} onValueChange={(value) => handleInputChange('event_type', value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {!isEdit && <SelectItem value="none">Not specified yet</SelectItem>}
              {eventTypeConfigs.map((config) => (
                <SelectItem key={config.id} value={config.event_type}>
                  {config.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="guest_mixture">Guest Mix</Label>
          <Select value={formData.guest_mixture} onValueChange={(value) => handleInputChange('guest_mixture', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mixed">Mixed</SelectItem>
              <SelectItem value="Men Only">Men Only</SelectItem>
              <SelectItem value="Ladies Only">Ladies Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="men_count">Men Count</Label>
          <Input
            id="men_count"
            type="number"
            min="0"
            value={formData.men_count}
            onChange={(e) => handleInputChange('men_count', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="ladies_count">Ladies Count</Label>
          <Input
            id="ladies_count"
            type="number"
            min="0"
            value={formData.ladies_count}
            onChange={(e) => handleInputChange('ladies_count', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <Label>Date of Interest</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateOfInterest && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateOfInterest ? format(dateOfInterest, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateOfInterest}
              onSelect={setDateOfInterest}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Appointment Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !appointmentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {appointmentDate ? format(appointmentDate, "PPP") : "Schedule appointment"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={appointmentDate}
              onSelect={setAppointmentDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="estimated_budget">Estimated Budget (£)</Label>
        <Input
          id="estimated_budget"
          type="number"
          min="0"
          step="0.01"
          value={formData.estimated_budget}
          onChange={(e) => handleInputChange('estimated_budget', e.target.value)}
        />
      </div>

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
        <Button type="button" variant="outline" onClick={onSuccess}>
          {isEdit ? 'Cancel' : 'Close'}
        </Button>
        {isEdit && leadData?.status !== 'won' && (
          <Button 
            type="button" 
            onClick={handleConvertToCustomer}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Converting...' : 'Convert to Customer'}
          </Button>
        )}
        {isEdit && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Update Lead'}
          </Button>
        )}
        {!isEdit && (
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Create Lead'}
          </Button>
        )}
      </div>
    </form>
  );
};