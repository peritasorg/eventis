import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/hooks/useEventForms';

interface EventData {
  start_time: string | null;
  end_time: string | null;
  event_type?: string | null;
}

interface TimeDisplayProps {
  eventData: EventData;
  eventForms: EventForm[];
  onTimeChange: (field: 'start_time' | 'end_time', value: string | null) => void;
  formatTime: (timeString: string | null) => string;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  eventData,
  eventForms,
  onTimeChange,
  formatTime
}) => {
  const [manualEntryEnabled, setManualEntryEnabled] = useState(false);
  
  // Determine if this is a multi-form event (All Day event)
  const isMultiFormEvent = eventForms.length > 1;
  
  // Get the unique event types from forms to determine event complexity
  const formEventTypes = eventForms.map(form => form.form_label).filter(Boolean);
  const isSingleEventType = formEventTypes.length <= 1 && !isMultiFormEvent;
  
  // Calculate auto times from forms
  const getAutoCalculatedTimes = () => {
    const formsWithTimes = eventForms.filter(form => form.start_time && form.end_time);
    
    if (formsWithTimes.length === 0) return { start: null, end: null };
    
    const startTimes = formsWithTimes.map(form => form.start_time!).sort();
    const endTimes = formsWithTimes.map(form => form.end_time!).sort();
    
    return {
      start: startTimes[0],
      end: endTimes[endTimes.length - 1]
    };
  };
  
  const autoTimes = getAutoCalculatedTimes();
  
  // For All Day events (multi-form), show auto-calculated times
  // For single event type events, show manual entry with grayed out option
  
  if (isMultiFormEvent) {
    // All Day event - auto-calculated times (read-only)
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={formatTime(autoTimes.start)}
            readOnly
            className="bg-muted"
          />
          <div className="text-xs text-muted-foreground">Auto-calculated from forms</div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={formatTime(autoTimes.end)}
            readOnly
            className="bg-muted"
          />
          <div className="text-xs text-muted-foreground">Auto-calculated from forms</div>
        </div>
      </>
    );
  }
  
  // Single event type - manual entry with option to enable/disable
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="start_time">Start Time</Label>
        <Input
          id="start_time"
          type="time"
          value={formatTime(eventData.start_time || autoTimes.start)}
          onChange={(e) => onTimeChange('start_time', e.target.value || null)}
          readOnly={!manualEntryEnabled}
          className={!manualEntryEnabled ? "bg-muted" : ""}
        />
        {!manualEntryEnabled && (
          <div className="text-xs text-muted-foreground">
            From form time slots
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="end_time">End Time</Label>
        <Input
          id="end_time"
          type="time"
          value={formatTime(eventData.end_time || autoTimes.end)}
          onChange={(e) => onTimeChange('end_time', e.target.value || null)}
          readOnly={!manualEntryEnabled}
          className={!manualEntryEnabled ? "bg-muted" : ""}
        />
        {!manualEntryEnabled && (
          <div className="text-xs text-muted-foreground">
            From form time slots
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label></Label> {/* Empty label for alignment */}
        <Button
          variant={manualEntryEnabled ? "secondary" : "outline"}
          size="sm"
          onClick={() => setManualEntryEnabled(!manualEntryEnabled)}
          className="w-full"
        >
          {manualEntryEnabled ? "Use Form Times" : "Enter Manually"}
        </Button>
      </div>
    </>
  );
};