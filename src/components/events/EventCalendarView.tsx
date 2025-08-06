
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, CalendarPlus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { calendarSyncService } from '@/services/calendarSync';
import { toast } from 'sonner';
import { useEventTypeConfigs, getEventColor, getEventColorClasses } from '@/hooks/useEventTypeConfigs';
import { CalendarSettings } from './CalendarSettings';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useMultiDayEvents } from '@/hooks/useMultiDayEvents';
import { useCalendarState } from '@/contexts/CalendarStateContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Event {
  id: string;
  event_name: string;
  event_type: string;
  event_start_date: string;
  event_end_date?: string;
  event_multiple_days?: boolean;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  total_guests?: number;
  status: string;
  customers?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface EventCalendarViewProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
  onDateClick: (date: string) => void;
}

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({
  events,
  onEventClick,
  onDateClick
}) => {
  const [showSyncButtons, setShowSyncButtons] = useState(false);
  const { syncEvent } = useManualEventSync();
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const { currentDate, scrollContainerRef, navigateToMonth, goToToday } = useCalendarNavigation();
  const { getEventsForDate, getEventDisplayInfo } = useMultiDayEvents(events);
  const { setLastViewedEventDate } = useCalendarState();

  // Check if manual sync buttons should be shown
  useEffect(() => {
    const checkSyncPreferences = async () => {
      try {
        const integrations = await calendarSyncService.getIntegrations();
        for (const integration of integrations) {
          const preferences = await calendarSyncService.getPreferences(integration.id);
          if (preferences && !preferences.auto_sync) {
            setShowSyncButtons(true);
            return;
          }
        }
        setShowSyncButtons(false);
      } catch (error) {
        console.error('Failed to check sync preferences:', error);
      }
    };
    
    checkSyncPreferences();
  }, []);

  const handleSyncToCalendar = async (eventId: string, eventName: string) => {
    try {
      toast.loading('Syncing event to calendar...', { id: eventId });
      const results = await syncEvent(eventId, 'create');
      
      // Check if any integration was successful
      const successful = results.some(result => result.success);
      
      if (successful) {
        toast.success(`"${eventName}" synced to calendar!`, { id: eventId });
      } else {
        toast.error('Failed to sync event to calendar', { id: eventId });
      }
    } catch (error) {
      console.error('Error syncing event:', error);
      toast.error('Failed to sync event to calendar', { id: eventId });
    }
  };

  const generateCalendar = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const handleEventClick = (eventId: string, eventDate: string) => {
    // Save the event date for state restoration
    setLastViewedEventDate(eventDate);
    onEventClick(eventId);
  };

  const getEventColorInfo = (event: Event) => {
    const colorInfo = getEventColor(event.event_type, event.event_start_date, eventTypeConfigs);
    const classNames = getEventColorClasses(event.event_type, event.event_start_date, eventTypeConfigs);
    
    return { ...colorInfo, classNames };
  };

  const calendarDays = generateCalendar();
  const today = new Date().toDateString();

  console.log('Events in calendar:', events); // Debug log
  console.log('Calendar days:', calendarDays.length); // Debug log

  return (
    <TooltipProvider>
      <Card 
        ref={scrollContainerRef}
        className="select-none touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="text-foreground">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarSettings />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToMonth('prev')}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Previous month (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="text-xs px-3 h-8 hover:bg-accent font-medium"
                title="Go to today (Home)"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToMonth('next')}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Next month (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Swipe left/right or use arrow keys to navigate • Scroll horizontally to change months
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-muted-foreground py-2 text-sm">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              const isToday = date.toDateString() === today;
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayEventInfos = getEventsForDate(date);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-md cursor-pointer transition-all duration-200 hover:shadow-md group
                    ${isToday 
                      ? 'bg-primary/5 border-primary/30 ring-2 ring-primary/20' 
                      : 'bg-card border-border hover:bg-accent/50'
                    }
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                  `}
                  onClick={() => onDateClick(date.toISOString().split('T')[0])}
                >
                  <div className={`text-sm font-medium mb-2 transition-colors ${
                    isToday ? 'text-primary' : 'text-foreground group-hover:text-foreground'
                  }`}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEventInfos.slice(0, 2).map((dayEventInfo) => {
                      const { event } = dayEventInfo;
                      const colorInfo = getEventColorInfo(event);
                      const displayInfo = getEventDisplayInfo(dayEventInfo);
                      
                      return (
                        <Tooltip key={`${event.id}-${dayEventInfo.dayIndex}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`${displayInfo.baseClasses} ${displayInfo.positionClasses} ${colorInfo.classNames}`}
                              style={{
                                backgroundColor: colorInfo.backgroundColor,
                                color: colorInfo.textColor,
                                borderColor: colorInfo.borderColor
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event.id, event.event_start_date);
                              }}
                            >
                              <div className="font-medium truncate">{displayInfo.displayName}</div>
                              <div className="flex items-center justify-between gap-1 mt-1">
                                {displayInfo.showTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{event.start_time}</span>
                                  </div>
                                )}
                                {showSyncButtons && dayEventInfo.isFirstDay && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSyncToCalendar(event.id, event.event_name);
                                    }}
                                    className="h-4 w-4 p-0 hover:bg-white/20"
                                    title="Sync to Calendar"
                                  >
                                    <CalendarPlus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {displayInfo.showMultiDayIndicator && dayEventInfo.position === 'start' && (
                                <div className="text-xs opacity-75 mt-1">
                                  {dayEventInfo.totalDays} days
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-2">
                              <div className="font-semibold">{event.event_name}</div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3 w-3" />
                                {event.start_time} - {event.end_time}
                              </div>
                              {event.event_multiple_days && event.event_end_date && (
                                <div className="text-sm">
                                  <span className="font-medium">Start:</span> {new Date(event.event_start_date).toLocaleDateString()}
                                  <br />
                                  <span className="font-medium">End:</span> {new Date(event.event_end_date).toLocaleDateString()}
                                  <br />
                                  <span className="font-medium">Day:</span> {dayEventInfo.dayIndex + 1} of {dayEventInfo.totalDays}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-3 w-3" />
                                {event.total_guests || event.estimated_guests} guests
                              </div>
                              {event.customers && (
                                <div className="text-sm">
                                  <div className="font-medium">{event.customers.name}</div>
                                  <div className="text-muted-foreground">{event.customers.phone}</div>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    
                    {dayEventInfos.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground h-6 hover:bg-accent/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could open a day view modal here
                        }}
                      >
                        +{dayEventInfos.length - 2} more
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
