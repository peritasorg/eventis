import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface SimpleEventListProps {
  events: any[];
  onEventClick: (eventId: string) => void;
}

export const SimpleEventList: React.FC<SimpleEventListProps> = ({ events, onEventClick }) => {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {event.event_date ? format(new Date(event.event_date), 'PPP') : 'No date set'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEventClick(event.id)}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};