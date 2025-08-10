import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMultiDayEvents } from '@/hooks/useMultiDayEvents';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  event_date?: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
  ethnicity?: string[] | string;
  men_count?: number;
  ladies_count?: number;
  total_guest_price_gbp?: number;
  form_total_gbp?: number;
  deposit_amount_gbp?: number;
  event_payments?: Array<{ amount_gbp: number }>;
  customers?: {
    name?: string;
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
  const { getEventsForDate, getEventDisplayInfo } = useMultiDayEvents(events);

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

  const calculateEventFinancials = (event: Event) => {
    const subtotal = (event.total_guest_price_gbp || 0) + (event.form_total_gbp || 0);
    const depositAmount = event.deposit_amount_gbp || 0;
    const totalPayments = event.event_payments?.reduce((sum, payment) => sum + (payment.amount_gbp || 0), 0) || 0;
    const remainingBalance = subtotal - totalPayments;
    return { subtotal, remainingBalance, totalPayments, depositAmount };
  };

  const getEventWarningLevel = (event: Event) => {
    if (!event.event_date) return null;
    
    const eventDate = new Date(event.event_date);
    const today = new Date();
    const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Default warning thresholds - these would come from settings in a real implementation
    if (daysUntilEvent <= 3 && daysUntilEvent >= 0) return 'urgent';
    if (daysUntilEvent <= 7 && daysUntilEvent >= 0) return 'warning';
    return null;
  };

  const getEventTypeColor = (eventType: string | undefined) => {
    // Default color if no event type or configuration
    if (!eventType) return { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
    
    // In a real implementation, this would fetch from event_type_configs
    // For now, use some default colors based on event type
    const colorMap: Record<string, { backgroundColor: string; textColor: string }> = {
      'wedding': { backgroundColor: 'hsl(340 82% 52%)', textColor: 'white' },
      'birthday': { backgroundColor: 'hsl(280 82% 52%)', textColor: 'white' },
      'corporate': { backgroundColor: 'hsl(220 82% 52%)', textColor: 'white' },
      'anniversary': { backgroundColor: 'hsl(350 82% 52%)', textColor: 'white' },
      'graduation': { backgroundColor: 'hsl(45 82% 52%)', textColor: 'white' },
      'baby_shower': { backgroundColor: 'hsl(200 82% 52%)', textColor: 'white' },
    };
    
    return colorMap[eventType] || { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
  };

  const calendarDays = generateCalendar();
  const today = new Date().toDateString();

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
              const dayEventsInfo = getEventsForDate(date);
              
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
                    {dayEventsInfo.slice(0, 3).map((dayEventInfo) => {
                      const { event } = dayEventInfo;
                      const displayInfo = getEventDisplayInfo(dayEventInfo);
                      const financials = calculateEventFinancials(event);
                      const totalGuests = (event.men_count || 0) + (event.ladies_count || 0);
                      const warningLevel = getEventWarningLevel(event);
                      const eventColors = getEventTypeColor(event.event_type);
                      
                      // Apply warning colors if needed
                      let eventStyle = eventColors;
                      if (warningLevel === 'urgent') {
                        eventStyle = { backgroundColor: 'hsl(0 84% 60%)', textColor: 'white' };
                      } else if (warningLevel === 'warning') {
                        eventStyle = { backgroundColor: 'hsl(45 93% 47%)', textColor: 'white' };
                      }
                      
                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-xs p-1 rounded-sm cursor-pointer hover:opacity-80 transition-all relative ${displayInfo.positionClasses}`}
                              style={{
                                backgroundColor: eventStyle.backgroundColor,
                                color: eventStyle.textColor
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event.id);
                              }}
                            >
                              <div className="font-medium truncate">{displayInfo.displayName}</div>
                              {displayInfo.showTime && event.start_time && (
                                <div className="text-[10px] opacity-90">
                                  {event.start_time.slice(0, 5)}
                                </div>
                              )}
                              {warningLevel && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm p-4 bg-card text-card-foreground border shadow-lg">
                            <div className="space-y-3">
                              <div className="font-semibold text-base">{event.title}</div>
                              
                              {/* Customer Information */}
                              {event.customers?.name && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Customer:</span> {event.customers.name}
                                </div>
                              )}
                              
                              {/* Event Details */}
                              <div className="text-sm space-y-1">
                                {event.start_time && event.end_time && (
                                  <div><span className="font-medium text-muted-foreground">Time:</span> {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}</div>
                                )}
                                {totalGuests > 0 && (
                                  <div><span className="font-medium text-muted-foreground">Guests:</span> {totalGuests} people</div>
                                )}
                                {event.event_type && (
                                  <div><span className="font-medium text-muted-foreground">Type:</span> {event.event_type}</div>
                                )}
                              </div>
                              
                              {/* Financial Information */}
                              {financials.subtotal > 0 && (
                                <div className="text-sm space-y-1 border-t pt-2">
                                  <div><span className="font-medium text-muted-foreground">Subtotal:</span> £{financials.subtotal.toFixed(2)}</div>
                                  {financials.depositAmount > 0 && (
                                    <div><span className="font-medium text-muted-foreground">Deposit:</span> £{financials.depositAmount.toFixed(2)}</div>
                                  )}
                                  <div><span className="font-medium text-muted-foreground">Paid:</span> £{financials.totalPayments.toFixed(2)}</div>
                                  <div className={`font-medium ${financials.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    <span className="text-muted-foreground">Balance:</span> £{financials.remainingBalance.toFixed(2)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Warning Message */}
                              {warningLevel && (
                                <div className="text-xs bg-orange-100 dark:bg-orange-900/20 p-2 rounded border-l-4 border-orange-500">
                                  {warningLevel === 'urgent' ? '⚠️ Event is within 3 days!' : '⚡ Event approaching soon'}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    
                    {dayEventsInfo.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEventsInfo.length - 3} more
                      </div>
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