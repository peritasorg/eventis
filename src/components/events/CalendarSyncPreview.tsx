import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, FileText, Edit2, Send } from 'lucide-react';
import { generateCalendarDescription } from '@/utils/calendarDescriptionGenerator';

interface CalendarSyncPreviewData {
  title: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
  action: 'create' | 'update';
}

interface CalendarSyncPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (editedData: CalendarSyncPreviewData) => Promise<void>;
  eventData: {
    id: string;
    title: string;
    event_date: string;
    event_end_date?: string;
    start_time?: string;
    end_time?: string;
    event_type: string;
    primary_contact_name?: string;
    primary_contact_number?: string;
    secondary_contact_name?: string;
    secondary_contact_number?: string;
    men_count?: number;
    ladies_count?: number;
    guest_mixture?: string;
    external_calendar_id?: string;
  };
  eventForms: Array<{
    id: string;
    form_label: string;
    start_time?: string;
    end_time?: string;
    men_count?: number;
    ladies_count?: number;
    form_responses: Record<string, any>;
    form_id: string;
  }>;
  tenantId: string;
}

export const CalendarSyncPreview: React.FC<CalendarSyncPreviewProps> = ({
  isOpen,
  onClose,
  onSync,
  eventData,
  eventForms,
  tenantId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [previewData, setPreviewData] = useState<CalendarSyncPreviewData>({
    title: '',
    startDateTime: '',
    endDateTime: '',
    description: '',
    action: 'create'
  });

  // Generate preview data when dialog opens
  useEffect(() => {
    if (isOpen && eventData) {
      generatePreviewData();
    }
  }, [isOpen, eventData, eventForms]);

  const generatePreviewData = async () => {
    try {
      // Generate description using the same logic as the actual sync
      const description = await generateCalendarDescription(
        eventData,
        eventForms,
        tenantId,
        eventData.event_type
      );

      // Format datetime strings
      const eventDate = eventData.event_date;
      const endDate = eventData.event_end_date || eventData.event_date;
      const startTime = eventData.start_time || '00:00';
      const endTime = eventData.end_time || '23:59';

      const startDateTime = `${eventDate}T${startTime}`;
      const endDateTime = `${endDate}T${endTime}`;

      setPreviewData({
        title: eventData.title || 'Untitled Event',
        startDateTime,
        endDateTime,
        description,
        action: eventData.external_calendar_id ? 'update' : 'create'
      });
    } catch (error) {
      console.error('Error generating preview data:', error);
      setPreviewData({
        title: eventData.title || 'Untitled Event',
        startDateTime: `${eventData.event_date}T${eventData.start_time || '00:00'}`,
        endDateTime: `${eventData.event_end_date || eventData.event_date}T${eventData.end_time || '23:59'}`,
        description: 'Error generating description',
        action: eventData.external_calendar_id ? 'update' : 'create'
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync(previewData);
      onClose();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateTimeStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Sync Preview
            <span className="text-sm font-normal text-muted-foreground">
              ({previewData.action === 'create' ? 'Creating new event' : 'Updating existing event'})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Event Title
            </Label>
            {isEditing ? (
              <Input
                id="title"
                value={previewData.title}
                onChange={(e) => setPreviewData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md">
                {previewData.title}
              </div>
            )}
          </div>

          {/* Event Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDateTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              {isEditing ? (
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  value={previewData.startDateTime}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, startDateTime: e.target.value }))}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {formatDateTime(previewData.startDateTime)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDateTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              {isEditing ? (
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  value={previewData.endDateTime}
                  onChange={(e) => setPreviewData(prev => ({ ...prev, endDateTime: e.target.value }))}
                />
              ) : (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {formatDateTime(previewData.endDateTime)}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Calendar Description
            </Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={previewData.description}
                onChange={(e) => setPreviewData(prev => ({ ...prev, description: e.target.value }))}
                rows={15}
                className="font-mono text-sm"
                placeholder="Enter calendar description"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                {previewData.description}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {isEditing ? 'View Preview' : 'Edit'}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSyncing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isSyncing ? 'Syncing...' : `Sync to Calendar`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};