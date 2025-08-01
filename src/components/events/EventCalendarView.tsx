
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { calendarSyncService } from '@/services/calendarSync';
import { toast } from 'sonner';
import { useEventTypeConfigs, getEventColor, getEventColorClasses } from '@/hooks/useEventTypeConfigs';
import { CalendarSettings } from './CalendarSettings';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSyncButtons, setShowSyncButtons] = useState(false);
  const { syncEvent } = useManualEventSync();
  const { data: eventTypeConfigs } = useEventTypeConfigs();

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events?.filter(event => {
      if (!event.event_start_date) return false;
      
      const eventStartDate = event.event_start_date;
      const eventEndDate = event.event_end_date || eventStartDate;
      
      // Check if the date falls within the event's date range
      return dateString >= eventStartDate && dateString <= eventEndDate;
    }) || [];
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <CalendarSettings />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs px-2 h-8"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              const isToday = date.toDateString() === today;
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayEvents = getEventsForDate(date);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${isToday ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-gray-200 hover:bg-gray-50'}
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                  `}
                  onClick={() => onDateClick(date.toISOString().split('T')[0])}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                  
                   <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => {
                        const colorInfo = getEventColorInfo(event);
                        return (
                          <Tooltip key={event.id}>
                            <TooltipTrigger asChild>
                               <div
                                 className={`text-xs p-2 rounded border cursor-pointer transition-all hover:scale-105 ${colorInfo.classNames}`}
                                 style={{
                                   backgroundColor: colorInfo.backgroundColor,
                                   color: colorInfo.textColor,
                                   borderColor: colorInfo.borderColor
                                 }}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onEventClick(event.id);
                                 }}
                               >
                                <div className="font-medium truncate">{event.event_name}</div>
                                 <div className="flex items-center justify-between gap-1 mt-1">
                                   <div className="flex items-center gap-1">
                                     <Clock className="h-3 w-3" />
                                     <span>{event.start_time}</span>
                                   </div>
                                   {showSyncButtons && (
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
                                {event.event_multiple_days && (
                                  <div className="text-xs opacity-75 mt-1">Multi-day</div>
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
                                 </div>
                               )}
                               <div className="flex items-center gap-2 text-sm">
                                 <Users className="h-3 w-3" />
                                 {event.estimated_guests} guests
                               </div>
                               {event.customers && (
                                 <div className="text-sm">
                                   <div className="font-medium">{event.customers.name}</div>
                                   <div className="text-gray-600">{event.customers.phone}</div>
                                 </div>
                               )}
                               <div className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                                 {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                               </div>
                             </div>
                           </TooltipContent>
                         </Tooltip>
                       );
                     })}
                     
                    {dayEvents.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-gray-500 h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could open a day view modal here
                        }}
                      >
                        +{dayEvents.length - 2} more
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
