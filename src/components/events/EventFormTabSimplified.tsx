import React from 'react';
import { EnhancedEventFormTab } from './EnhancedEventFormTab';


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
  
  // Always show the enhanced form tab
  return (
    <EnhancedEventFormTab
      eventId={eventId}
    />
  );
};