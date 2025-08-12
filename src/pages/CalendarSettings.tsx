import React, { useState } from 'react';
import { ArrowLeft, Plus, Settings, Clock, Palette, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { EventTypeConfigs } from '@/components/calendar-sync/EventTypeConfigs';

import { TimeSlotManager } from '@/components/events/TimeSlotManager';
import { DateWarningsSettings } from '@/components/calendar-sync/DateWarningsSettings';
import { CalendarSyncSettings } from '@/components/settings/CalendarSyncSettings';

export const CalendarSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Calendar Settings</h1>
              <p className="text-muted-foreground">Manage event types, forms, time slots, and calendar preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="event-types" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="event-types" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Event Types
              </TabsTrigger>
              <TabsTrigger value="time-slots" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Slots
              </TabsTrigger>
              <TabsTrigger value="date-warnings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Date Warnings
              </TabsTrigger>
              <TabsTrigger value="calendar-sync" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendar Sync
              </TabsTrigger>
            </TabsList>

            <TabsContent value="event-types" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Event Type Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EventTypeConfigs />
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="time-slots" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Time Slot Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeSlotManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="date-warnings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Date Warning Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DateWarningsSettings />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar-sync" className="space-y-6">
              <CalendarSyncSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};