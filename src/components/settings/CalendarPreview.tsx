import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CalendarPreviewProps {
  eventId?: string;
}

export const CalendarPreview = ({ eventId }: CalendarPreviewProps) => {
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch event data for preview
  const { data: eventData } = useQuery({
    queryKey: ['event-preview', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          customers (*)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!eventId
  });

  // Fetch event forms data
  const { data: eventForms } = useQuery({
    queryKey: ['event-forms-preview', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_forms')
        .select(`
          *,
          forms (name)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId
  });

  const formatCalendarDescription = () => {
    if (!eventData) return '';

    let description = '';

    // Basic event info
    description += `Event Type: ${eventData.event_type || 'Not specified'}\n\n`;
    
    // Customer info
    if (eventData.customers) {
      description += `Customer: ${eventData.customers.name || eventData.primary_contact_name || 'Not specified'}\n\n`;
    }

    // Contact information
    if (eventData.primary_contact_name || eventData.primary_contact_number) {
      description += `Primary Contact: ${eventData.primary_contact_name || 'Not specified'}`;
      if (eventData.primary_contact_number) {
        description += ` - ${eventData.primary_contact_number}`;
      }
      description += '\n';
    }

    if (eventData.secondary_contact_name || eventData.secondary_contact_number) {
      description += `Secondary Contact: ${eventData.secondary_contact_name || 'Not specified'}`;
      if (eventData.secondary_contact_number) {
        description += ` - ${eventData.secondary_contact_number}`;
      }
      description += '\n';
    }

    description += '\n';

    // Guest counts
    description += `Men Count: ${eventData.men_count || 0}\n`;
    description += `Ladies Count: ${eventData.ladies_count || 0}\n`;
    description += `Total Guest Count: ${(eventData.men_count || 0) + (eventData.ladies_count || 0)}\n\n`;

    // Form data
    if (eventForms && eventForms.length > 0) {
      eventForms.forEach((eventForm: any) => {
        if (eventForm.form_responses) {
          const responses = eventForm.form_responses;
          
          Object.keys(responses).forEach(fieldId => {
            const fieldData = responses[fieldId];
            
            if (fieldData && fieldData.enabled && fieldData.value) {
              let fieldLine = '';
              
              // Get field name from the response data
              const fieldName = fieldData.label || fieldData.name || 'Field';
              
              // Add the field name
              fieldLine += fieldName;
              
              // Add quantity if exists and > 1
              if (fieldData.quantity && fieldData.quantity > 1) {
                fieldLine += ` - ${fieldData.quantity}`;
              }
              
              // Add price if exists (format as currency)
              if (fieldData.price && fieldData.price > 0) {
                fieldLine += ` - £${fieldData.price}`;
              }
              
              // Add notes if they exist
              if (fieldData.notes && fieldData.notes.trim()) {
                fieldLine += ` - ${fieldData.notes.trim()}`;
              }
              
              description += fieldLine + '\n';
            }
          });
        }
      });
    }

    return description.trim();
  };

  const formatEventTime = () => {
    if (!eventData) return 'Time not set';

    const startTime = eventData.start_time ? eventData.start_time.slice(0, 5) : 'Start time not set';
    const endTime = eventData.end_time ? eventData.end_time.slice(0, 5) : 'End time not set';
    
    return `${startTime} - ${endTime}`;
  };

  const formatEventDate = () => {
    if (!eventData?.event_date) return 'Date not set';
    
    return new Date(eventData.event_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!eventData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Preview</CardTitle>
          <CardDescription>
            Select an event to see how it will appear in your calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4" />
            <p>No event selected for preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar Preview
        </CardTitle>
        <CardDescription>
          Preview of how this event will appear in Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Event Title */}
          <div>
            <h3 className="font-semibold text-lg">{eventData.title || 'Event Title'}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatEventDate()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatEventTime()}
              </div>
            </div>
          </div>

          {/* Event Type Badge */}
          {eventData.event_type && (
            <Badge variant="secondary">{eventData.event_type}</Badge>
          )}

          {/* Description Preview */}
          <div>
            <h4 className="font-medium mb-2">Calendar Description</h4>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {formatCalendarDescription()}
              </pre>
            </div>
          </div>

          {/* Sync Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sync Status</span>
              <Badge variant="outline">Ready to Sync</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};