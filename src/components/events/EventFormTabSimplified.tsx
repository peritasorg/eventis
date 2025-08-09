import React from 'react';
import { EnhancedEventFormTab } from './EnhancedEventFormTab';
import { useEventForms } from '@/hooks/useEventForms';

interface EventFormTabProps {
  eventForm?: any;
  eventId: string;
  onFormChange?: (total: number) => void;
}

export const EventFormTab: React.FC<EventFormTabProps> = ({ 
  eventId,
  onFormChange 
}) => {
  console.log('🐛 EventFormTab Debug - eventId:', eventId);
  
  const { eventForms } = useEventForms(eventId);
  console.log('🐛 EventFormTab Debug - eventForms:', eventForms);
  console.log('🐛 EventFormTab Debug - eventForms length:', eventForms?.length);
  
  const primaryEventForm = eventForms?.[0];
  console.log('🐛 EventFormTab Debug - primaryEventForm:', primaryEventForm);

  if (!primaryEventForm) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No form associated with this event</p>
        <p className="text-sm mt-2">Debug: eventId={eventId}, eventForms.length={eventForms?.length || 0}</p>
      </div>
    );
  }

  return (
    <EnhancedEventFormTab
      eventId={eventId}
      eventForm={primaryEventForm}
    />
  );
};