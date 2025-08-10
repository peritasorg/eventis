import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Split, Calendar, Clock } from 'lucide-react';
import type { SessionTemplate, EventTypeConfig } from '@/hooks/useEventTypeConfigs';

interface SessionSplittingOptionProps {
  eventTypeConfig: EventTypeConfig;
  onSelectionChange: (shouldSplit: boolean) => void;
  selectedValue: 'single' | 'split';
}

export const SessionSplittingOption: React.FC<SessionSplittingOptionProps> = ({
  eventTypeConfig,
  onSelectionChange,
  selectedValue
}) => {
  const handleValueChange = (value: string) => {
    onSelectionChange(value === 'split');
  };

  const previewNaming = (sessionName: string) => {
    return eventTypeConfig.split_naming_pattern
      .replace('{Parent}', 'Sample Event')
      .replace('{Session}', sessionName);
  };

  if (!eventTypeConfig.allow_splitting) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Split className="w-4 h-4" />
          Session Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedValue} onValueChange={handleValueChange} className="space-y-4">
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="single" id="single" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="single" className="font-medium cursor-pointer">
                Single Event
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Create one event with unified guest count and forms
              </p>
            </div>
            <Calendar className="w-5 h-5 text-muted-foreground mt-1" />
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="split" id="split" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="split" className="font-medium cursor-pointer">
                Split into Sessions
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Create separate sessions with independent guest counts and forms
              </p>
              
              {eventTypeConfig.default_sessions && eventTypeConfig.default_sessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Configured Sessions:
                  </p>
                  <div className="space-y-1">
                    {eventTypeConfig.default_sessions.map((session, index) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded">
                        <div>
                          <span className="font-medium">
                            {previewNaming(session.name)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {session.start_time} - {session.end_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Split className="w-5 h-5 text-muted-foreground mt-1" />
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};