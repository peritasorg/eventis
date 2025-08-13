import React from 'react';
import { useParams } from 'react-router-dom';
import { PDFCanvasEditor } from '@/components/pdf/PDFCanvasEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PDFEditor = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(eventId ? `/events/${eventId}` : '/events')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">PDF Template Editor</h1>
              <p className="text-sm text-muted-foreground">
                Design your perfect quote and invoice templates
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <PDFCanvasEditor eventId={eventId} />
    </div>
  );
};