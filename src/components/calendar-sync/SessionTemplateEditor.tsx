import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { SessionTemplate } from '@/hooks/useEventTypeConfigs';

interface SessionTemplateEditorProps {
  sessions: SessionTemplate[];
  onChange: (sessions: SessionTemplate[]) => void;
}

export const SessionTemplateEditor: React.FC<SessionTemplateEditorProps> = ({
  sessions,
  onChange
}) => {
  const addSession = () => {
    const newSession: SessionTemplate = {
      name: '',
      start_time: '10:00',
      end_time: '17:00'
    };
    onChange([...sessions, newSession]);
  };

  const updateSession = (index: number, field: keyof SessionTemplate, value: string) => {
    const updatedSessions = sessions.map((session, i) => 
      i === index ? { ...session, [field]: value } : session
    );
    onChange(updatedSessions);
  };

  const removeSession = (index: number) => {
    onChange(sessions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Session Templates
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addSession}>
          <Plus className="w-4 h-4 mr-1" />
          Add Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No sessions configured</p>
          <p className="text-xs">Add sessions to enable event splitting</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <Card key={index} className="p-4">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label htmlFor={`session-name-${index}`} className="text-xs">
                      Session Name
                    </Label>
                    <Input
                      id={`session-name-${index}`}
                      value={session.name}
                      onChange={(e) => updateSession(index, 'name', e.target.value)}
                      placeholder="e.g., Day Session"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`session-start-${index}`} className="text-xs">
                      Start Time
                    </Label>
                    <Input
                      id={`session-start-${index}`}
                      type="time"
                      value={session.start_time}
                      onChange={(e) => updateSession(index, 'start_time', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`session-end-${index}`} className="text-xs">
                      End Time
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id={`session-end-${index}`}
                        type="time"
                        value={session.end_time}
                        onChange={(e) => updateSession(index, 'end_time', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSession(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border">
          <p className="font-medium mb-1">Preview:</p>
          <div className="space-y-1">
            {sessions.map((session, index) => (
              <div key={index} className="flex justify-between">
                <span>{session.name || `Session ${index + 1}`}</span>
                <span>{session.start_time} - {session.end_time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};