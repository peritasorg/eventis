import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventFormTab } from './EventFormTab';

interface EventDetailWithTabsProps {
  eventId: string;
  event?: any;
}

export const EventDetailWithTabs: React.FC<EventDetailWithTabsProps> = ({
  eventId,
  event
}) => {
  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{event?.title || 'Event Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {event?.description || 'No description available'}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Event Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Event Date:</strong> {event?.event_date || 'Not set'}</p>
                <p><strong>Status:</strong> {event?.status || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="forms">
          <EventFormTab eventId={eventId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};