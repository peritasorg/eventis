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
  const { eventForms } = useEventForms(eventId);
  const primaryEventForm = eventForms?.[0];

  if (!primaryEventForm) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No form associated with this event
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