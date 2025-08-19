import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      const leadDataToSave = {
        ...formData,
        tenant_id: currentTenant.id,
        date_of_interest: dateOfInterest ? format(dateOfInterest, 'yyyy-MM-dd') : null,
        appointment_date: appointmentDate ? format(appointmentDate, 'yyyy-MM-dd') : null,
        date_of_contact: dateOfContact ? format(dateOfContact, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        estimated_guests: (formData.men_count || 0) + (formData.ladies_count || 0),
        lead_score: 0,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null
      };

      let result;
      if (isEdit && leadData?.id) {
        result = await supabase
          .from('leads')
          .update(leadDataToSave)
          .eq('id', leadData.id)
          .eq('tenant_id', currentTenant.id);
      } else {
        result = await supabase
          .from('leads')
          .insert([leadDataToSave]);
      }

      if (result.error) throw result.error;

      toast.success(isEdit ? 'Lead updated successfully!' : 'Lead created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead. Please try again.');
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
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
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
          <Label htmlFor="event_type">Event Type *</Label>
          <Select value={formData.event_type} onValueChange={(value) => handleInputChange('event_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>
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
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (isEdit ? 'Update Lead' : 'Create Lead')}
        </Button>
      </div>
    </form>
  );
};