import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EventRecord } from './EventRecord';
import { EventFormTab } from './EventFormTab';
import { SaveConfirmationDialog } from './SaveConfirmationDialog';
import { useEventForms } from '@/hooks/useEventForms';
import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';

export const NewEventDetailWithTabs: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { eventForms } = useEventForms(eventId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasOverviewChanges, setHasOverviewChanges] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const eventRecordSaveRef = useRef<(() => Promise<void>) | null>(null);

  // Update combined unsaved changes state
  useEffect(() => {
    console.log('Parent: hasOverviewChanges =', hasOverviewChanges, 'hasFormChanges =', hasFormChanges);
    const hasChanges = hasOverviewChanges || hasFormChanges;
    console.log('Parent: setting hasUnsavedChanges =', hasChanges);
    setHasUnsavedChanges(hasChanges);
  }, [hasOverviewChanges, hasFormChanges]);

  const {
    showDialog,
    handleNavigationAttempt,
    handleSaveAndContinue,
    handleDiscardAndContinue,
    handleCancel
  } = useSaveConfirmation({
    hasUnsavedChanges,
    onSave: async () => {
      console.log('Parent: onSave called, eventRecordSaveRef.current =', eventRecordSaveRef.current);
      if (eventRecordSaveRef.current) {
        await eventRecordSaveRef.current();
      }
      setHasUnsavedChanges(false);
      setHasOverviewChanges(false);
      setHasFormChanges(false);
    },
    onDiscard: () => {
      console.log('Parent: onDiscard called');
      setHasUnsavedChanges(false);
      setHasOverviewChanges(false);
      setHasFormChanges(false);
    }
  });

  const handleBackToEvents = () => {
    console.log('Parent: handleBackToEvents called, hasUnsavedChanges =', hasUnsavedChanges);
    handleNavigationAttempt(() => navigate('/events'));
  };

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Event ID not provided</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBackToEvents}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className={`inline-flex h-12 items-center justify-center rounded-xl bg-muted/50 backdrop-blur-sm p-1 text-muted-foreground shadow-sm border ${eventForms?.length > 0 ? `grid-cols-${Math.min(eventForms.length + 1, 4)}` : 'grid-cols-2'}`}>
              <TabsTrigger value="overview" className="px-6 py-2 rounded-lg">Overview</TabsTrigger>
              {eventForms?.length === 0 && <TabsTrigger value="forms" className="px-6 py-2 rounded-lg">Forms</TabsTrigger>}
              {eventForms?.map((eventForm) => (
                <TabsTrigger key={eventForm.id} value={eventForm.id} className="px-6 py-2 rounded-lg">
                  {eventForm.form_label || eventForm.forms?.name || `Form ${eventForm.form_order}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        
          <TabsContent value="overview" className="mt-8">
            <EventRecord 
              onUnsavedChanges={setHasOverviewChanges}
              onSave={eventRecordSaveRef}
            />
          </TabsContent>
          
          {eventForms?.length === 0 && (
            <TabsContent value="forms" className="mt-8">
              <EventFormTab 
                eventId={eventId} 
                onUnsavedChanges={setHasFormChanges}
              />
            </TabsContent>
          )}
          
          {eventForms?.map((eventForm) => (
            <TabsContent key={eventForm.id} value={eventForm.id} className="mt-8">
              <EventFormTab 
                eventId={eventId} 
                eventFormId={eventForm.id}
                onUnsavedChanges={setHasFormChanges}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <SaveConfirmationDialog
        open={showDialog}
        onOpenChange={(open) => !open && handleCancel()}
        onSaveAndContinue={handleSaveAndContinue}
        onDiscardAndContinue={handleDiscardAndContinue}
        title="Unsaved Changes"
        description="You have unsaved changes in this event. What would you like to do?"
      />
    </div>
  );
};