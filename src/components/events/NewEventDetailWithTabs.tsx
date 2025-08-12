import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EventRecord } from './EventRecord';
import { EventFormTab } from './EventFormTab';
import { useEventForms } from '@/hooks/useEventForms';

export const NewEventDetailWithTabs: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { eventForms } = useEventForms(eventId);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Event ID not provided</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/events')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className={`grid w-full ${eventForms?.length > 0 ? `grid-cols-${Math.min(eventForms.length + 1, 4)}` : 'grid-cols-2'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {eventForms?.length === 0 && <TabsTrigger value="forms">Forms</TabsTrigger>}
          {eventForms?.map((eventForm) => (
            <TabsTrigger key={eventForm.id} value={eventForm.id}>
              {eventForm.form_label || eventForm.forms?.name || `Form ${eventForm.form_order}`}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="overview">
          <EventRecord />
        </TabsContent>
        
        {eventForms?.length === 0 && (
          <TabsContent value="forms">
            <EventFormTab eventId={eventId} />
          </TabsContent>
        )}
        
        {eventForms?.map((eventForm) => (
          <TabsContent key={eventForm.id} value={eventForm.id}>
            <EventFormTab eventId={eventId} eventFormId={eventForm.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};