import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnhancedEventFormTabProps {
  eventId: string;
  eventForm?: any;
}

export const EnhancedEventFormTab: React.FC<EnhancedEventFormTabProps> = ({
  eventId,
  eventForm
}) => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Form functionality is being rebuilt with the new architecture.
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Event ID: {eventId}</p>
            {eventForm && <p>Form: {eventForm.label || 'Unnamed Form'}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};