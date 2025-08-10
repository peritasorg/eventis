import React from 'react';
import { EventsTable } from './EventsTable';

interface SimpleEventListProps {
  events: any[];
  onEventClick: (eventId: string) => void;
  searchQuery?: string;
}

export const SimpleEventList: React.FC<SimpleEventListProps> = ({ 
  events, 
  onEventClick, 
  searchQuery 
}) => {
  return (
    <EventsTable 
      events={events} 
      onEventClick={onEventClick}
      searchQuery={searchQuery}
    />
  );
};