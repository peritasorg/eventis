
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convertLeadToCustomer } from '@/utils/leadConversion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserPlus, Calendar, Users } from 'lucide-react';
import { sanitizeInput, validateEmail, validatePhone, validateTextLength } from '@/utils/security';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onSuccess: () => void;
}

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  open,
  onOpenChange,
  lead,
  onSuccess
}) => {
  const { currentTenant } = useAuth();
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const [isConverting, setIsConverting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    customer_type: 'individual',
    notes: '',
    create_event: false,
    event_name: '',
    event_type: '',
    event_date: '',
    estimated_guests: 50,
    estimated_budget: ''
  });

  // Pre-fill form data when lead changes
  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        customer_type: lead.company ? 'corporate' : 'individual',
        notes: lead.notes || '',
        create_event: !!lead.event_date,
        event_name: lead.event_type ? `${lead.event_type} for ${lead.name}` : '',
        event_type: lead.event_type || '',
        event_date: lead.event_date || '',
        estimated_guests: lead.estimated_guests || 50,
        estimated_budget: lead.estimated_budget ? lead.estimated_budget.toString() : ''
      });
    }
  }, [lead]);

  const handleConvert = async () => {
    if (!currentTenant?.id || !lead) return;

    // Validate and sanitize inputs before conversion
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('Name is required');
    }
    
    if (formData.email && !validateEmail(formData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.push('Please enter a valid phone number');
    }
    
    if (formData.notes && !validateTextLength(formData.notes, 2000)) {
      errors.push('Notes are too long (max 2000 characters)');
    }
    
    if (formData.create_event && !formData.event_name?.trim()) {
      errors.push('Event name is required when creating an event');
    }
    
    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertLeadToCustomer({
        leadId: lead.id,
        tenantId: currentTenant.id,
        leadData: {
          name: sanitizeInput(formData.name),
          email: formData.email ? sanitizeInput(formData.email) : undefined,
          phone: formData.phone ? sanitizeInput(formData.phone) : undefined,
          company: formData.company ? sanitizeInput(formData.company) : undefined,
          event_type: formData.create_event ? formData.event_type : undefined,
          event_date: formData.create_event ? formData.event_date : undefined,
          estimated_guests: formData.create_event ? formData.estimated_guests : undefined,
          estimated_budget: formData.create_event ? parseFloat(formData.estimated_budget) || undefined : undefined,
          notes: formData.notes ? sanitizeInput(formData.notes) : undefined
        }
      });

      toast.success(`Lead converted to customer successfully! ${result.event ? 'Event created.' : ''}`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert lead to customer');
    } finally {
      setIsConverting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convert Lead to Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Customer Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customer_type">Customer Type</Label>
              <Select value={formData.customer_type} onValueChange={(value) => setFormData({...formData, customer_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Event Creation Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="create_event"
                checked={formData.create_event}
                onChange={(e) => setFormData({...formData, create_event: e.target.checked})}
              />
              <Label htmlFor="create_event" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Create Event from Lead Information
              </Label>
            </div>

            {formData.create_event && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Event Details</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_name">Event Name</Label>
                    <Input
                      id="event_name"
                      value={formData.event_name}
                      onChange={(e) => setFormData({...formData, event_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select value={formData.event_type} onValueChange={(value) => setFormData({...formData, event_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypeConfigs?.map(config => (
                          <SelectItem key={config.id} value={config.event_type}>
                            {config.display_name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Event Date</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_guests" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Estimated Guests
                    </Label>
                    <Input
                      id="estimated_guests"
                      type="number"
                      value={formData.estimated_guests}
                      onChange={(e) => setFormData({...formData, estimated_guests: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimated_budget">Estimated Budget (£)</Label>
                  <Input
                    id="estimated_budget"
                    type="number"
                    step="0.01"
                    value={formData.estimated_budget}
                    onChange={(e) => setFormData({...formData, estimated_budget: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about the customer..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={!formData.name || isConverting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConverting ? 'Converting...' : 'Convert to Customer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
