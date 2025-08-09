
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseMutation, useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { useEventTypeFormMappingsForCreation } from '@/hooks/useEventTypeFormMappings';
import { useEventSessions } from '@/hooks/useEventSessions';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionSplittingOption } from './SessionSplittingOption';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  onSuccess: () => void;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onSuccess
}) => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [isMultipleDays, setIsMultipleDays] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [previewMappings, setPreviewMappings] = useState<any[]>([]);
  const [shouldSplitSessions, setShouldSplitSessions] = useState(false);
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const { getFormMappingsForEventType } = useEventTypeFormMappingsForCreation();

  // Get selected event type configuration
  const selectedEventTypeConfig = useMemo(() => {
    return eventTypeConfigs?.find(config => config.event_type === selectedEventType);
  }, [eventTypeConfigs, selectedEventType]);

  const { data: customers } = useSupabaseQuery(
    ['customers'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (error) {
        console.error('Customers error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const createEventMutation = useSupabaseMutation(
    async (eventData: any) => {
      // Create the main/parent event
      const { data: parentEvent, error } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          tenant_id: currentTenant?.id,
          is_sub_event: false
        }])
        .select()
        .single();
      
      if (error) throw error;

      // If splitting sessions, create sub-events
      if (shouldSplitSessions && selectedEventTypeConfig?.default_sessions) {
        const sessionInserts = selectedEventTypeConfig.default_sessions.map((session, index) => {
          const sessionName = selectedEventTypeConfig.split_naming_pattern
            .replace('{Parent}', eventData.event_name)
            .replace('{Session}', session.name);

          return {
            tenant_id: currentTenant?.id,
            parent_event_id: parentEvent.id,
            is_sub_event: true,
            session_type: session.name,
            session_order: index,
            event_name: sessionName,
            event_type: eventData.event_type,
            customer_id: eventData.customer_id,
            event_start_date: eventData.event_start_date,
            event_end_date: eventData.event_end_date,
            start_time: session.start_time,
            end_time: session.end_time,
            estimated_guests: 0, // Will be filled by user
            status: 'inquiry',
            booking_stage: 'initial'
          };
        });

        const { data: sessions, error: sessionsError } = await supabase
          .from('events')
          .insert(sessionInserts)
          .select();

        if (sessionsError) {
          console.error('Error creating sessions:', sessionsError);
          toast.error('Event created but failed to create sessions');
        } else {
          // Auto-assign forms to each session
          if (previewMappings.length > 0 && sessions) {
            const allFormInserts = [];
            
            for (const session of sessions) {
              const sessionFormInserts = previewMappings.map((mapping, index) => ({
                tenant_id: currentTenant?.id,
                event_id: session.id,
                form_template_id: mapping.form_template_id,
                form_label: mapping.default_label,
                tab_order: index + 1,
                form_responses: {},
                form_total: 0,
                is_active: true
              }));
              allFormInserts.push(...sessionFormInserts);
            }

            const { error: formsError } = await supabase
              .from('event_forms')
              .insert(allFormInserts);

            if (formsError) {
              console.error('Error auto-assigning forms to sessions:', formsError);
            }
          }
        }
      } else {
        // For single events, auto-assign forms as before
        if (previewMappings.length > 0) {
          const formInserts = previewMappings.map((mapping, index) => ({
            tenant_id: currentTenant?.id,
            event_id: parentEvent.id,
            form_template_id: mapping.form_template_id,
            form_label: mapping.default_label,
            tab_order: index + 1,
            form_responses: {},
            form_total: 0,
            is_active: true
          }));

          const { error: formsError } = await supabase
            .from('event_forms')
            .insert(formInserts);

          if (formsError) {
            console.error('Error auto-assigning forms:', formsError);
            toast.error('Event created but failed to assign forms');
          } else if (formInserts.length > 0) {
            toast.success(`Event created with ${formInserts.length} form(s) auto-assigned!`);
          }
        }
      }
      
      return parentEvent;
    },
    {
      successMessage: shouldSplitSessions 
        ? 'Event created with sessions successfully!' 
        : (previewMappings.length === 0 ? 'Event created successfully!' : undefined),
      onSuccess: (data) => {
        onSuccess();
        // Navigate to the new event's detail page
        navigate(`/events/${data.id}`);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const startDate = formData.get('event_start_date') as string;
    const endDate = isMultipleDays ? (formData.get('event_end_date') as string) : startDate;
    
    const eventData = {
      event_name: formData.get('event_name') as string,
      event_type: formData.get('event_type') as string,
      event_start_date: startDate,
      event_end_date: endDate,
      event_multiple_days: isMultipleDays,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      estimated_guests: parseInt(formData.get('estimated_guests') as string) || 0,
      customer_id: formData.get('customer_id') as string || null,
      status: 'inquiry',
      internal_notes: formData.get('internal_notes') as string,
    };

    createEventMutation.mutate(eventData);
  };

  // Handle event type selection and fetch form mappings
  const handleEventTypeChange = async (eventType: string) => {
    setSelectedEventType(eventType);
    setShouldSplitSessions(false); // Reset splitting option when event type changes
    
    if (eventType) {
      const mappings = await getFormMappingsForEventType(eventType);
      setPreviewMappings(mappings);
    } else {
      setPreviewMappings([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name *</Label>
              <Input id="event_name" name="event_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select name="event_type" value={selectedEventType} onValueChange={handleEventTypeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeConfigs?.map(config => (
                    <SelectItem key={config.id} value={config.event_type}>
                      {config.display_name}
                    </SelectItem>
                  ))}
                  {(!eventTypeConfigs || eventTypeConfigs.length === 0) && (
                    <SelectItem value="other">Other</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Session Splitting Option */}
          {selectedEventTypeConfig && (
            <SessionSplittingOption
              eventTypeConfig={selectedEventTypeConfig}
              onSelectionChange={setShouldSplitSessions}
              selectedValue={shouldSplitSessions ? 'split' : 'single'}
            />
          )}
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="event_multiple_days"
                checked={isMultipleDays}
                onCheckedChange={(checked) => setIsMultipleDays(checked as boolean)}
              />
              <Label htmlFor="event_multiple_days">Multiple day event</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_start_date">Event Start Date *</Label>
                <Input 
                  id="event_start_date" 
                  name="event_start_date" 
                  type="date" 
                  defaultValue={selectedDate}
                  required 
                />
              </div>
              {isMultipleDays && (
                <div className="space-y-2">
                  <Label htmlFor="event_end_date">Event End Date *</Label>
                  <Input 
                    id="event_end_date" 
                    name="event_end_date" 
                    type="date" 
                    required 
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" name="start_time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" name="end_time" type="time" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_guests">Estimated Guests</Label>
              <Input id="estimated_guests" name="estimated_guests" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select name="customer_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <Textarea id="internal_notes" name="internal_notes" placeholder="Any internal notes..." />
          </div>

          {/* Form Assignment Preview */}
          {previewMappings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Forms to be Auto-Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  The following {previewMappings.length} form(s) will be automatically added to this event:
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewMappings.map((mapping, index) => (
                    <Badge key={mapping.id} variant="secondary" className="text-xs">
                      {index + 1}. {mapping.default_label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? 'Creating...' : 'Create & Open Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
