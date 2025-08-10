import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  event_date?: string;
  ethnicity?: string;
  primary_contact_name?: string;
  total_guest_price_gbp?: number;
  customers?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

interface EventsCalendarViewProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
  onDateClick: (date: string) => void;
}

export const EventsCalendarView: React.FC<EventsCalendarViewProps> = ({
  events,
  onEventClick,
  onDateClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

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
    return events?.filter(event => 
      event.event_date === dateString
    ) || [];
  };

  const getEventColor = (event: Event) => {
    // Use consistent design system colors
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const calendarDays = generateCalendar();
  const today = new Date().toDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/events/settings')}
              className="h-8 px-2"
            >
              <Settings className="h-4 w-4 mr-1" />
              Calendar Settings
            </Button>
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
            <div key={day} className="text-center font-semibold text-muted-foreground py-2">
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
                  ${isToday ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/10' : 'bg-card border-border hover:bg-accent/50'}
                  ${!isCurrentMonth ? 'opacity-50' : ''}
                `}
                onClick={() => onDateClick(date.toISOString().split('T')[0])}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-2 rounded border cursor-pointer transition-all hover:scale-105 ${getEventColor(event)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event.id);
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="truncate opacity-75">
                        {event.customers?.first_name && event.customers?.last_name 
                          ? `${event.customers.first_name} ${event.customers.last_name}`
                          : event.primary_contact_name || 'No contact'
                        }
                      </div>
                    </div>
                  ))}
                  
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                  
                  {dayEvents.length === 0 && isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick(date.toISOString().split('T')[0]);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};