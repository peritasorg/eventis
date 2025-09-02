import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMultiDayEvents } from '@/hooks/useMultiDayEvents';
import { useNavigate } from 'react-router-dom';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { useCalendarState } from '@/contexts/CalendarStateContext';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [monthsData, setMonthsData] = useState<Date[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentTenant } = useAuth();
  const { getEventsForDate, getEventDisplayInfo } = useMultiDayEvents(events);
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const { calendarState, setCurrentMonth, restoreCalendarState } = useCalendarState();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch calendar warning settings
  const { data: calendarWarningSettings } = useSupabaseQuery(
    ['calendar_warning_settings', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('calendar_warning_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching calendar warning settings:', error);
        return null;
      }
      
      return data;
    }
  );

  // Initialize with multiple months for infinite scroll
  useEffect(() => {
    restoreCalendarState();
    generateMultipleMonths();
    
    // Auto-scroll to today after a short delay to ensure months are rendered
    setTimeout(() => {
      scrollToToday();
    }, 100);
  }, []);

  const generateMultipleMonths = () => {
    const months = [];
    const today = new Date();
    
    // Start from 24 months ago (2 years) and generate 36 months total (2 years back + 1 current + 1 forward)
    for (let i = -24; i < 12; i++) {
      const monthDate = new Date(today);
      monthDate.setMonth(today.getMonth() + i);
      months.push(monthDate);
    }
    
    setMonthsData(months);
  };

  const generateCalendarForMonth = (monthDate: Date) => {
    const currentMonth = monthDate.getMonth();
    const currentYear = monthDate.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    // Start week on Monday (1 = Monday, 0 = Sunday)
    const firstDayOfWeek = firstDay.getDay();
    const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - mondayOffset);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Load more future months when near bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        const lastMonth = monthsData[monthsData.length - 1];
        const newMonths = [];
        for (let i = 1; i <= 6; i++) {
          const newMonth = new Date(lastMonth);
          newMonth.setMonth(lastMonth.getMonth() + i);
          newMonths.push(newMonth);
        }
        setMonthsData(prev => [...prev, ...newMonths]);
        setIsLoading(false);
      }, 100);
    }
    
    // Load more historical months when near top
    if (scrollTop <= clientHeight * 0.5 && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        const firstMonth = monthsData[0];
        const newMonths = [];
        for (let i = 6; i >= 1; i--) {
          const newMonth = new Date(firstMonth);
          newMonth.setMonth(firstMonth.getMonth() - i);
          newMonths.push(newMonth);
        }
        setMonthsData(prev => [...newMonths, ...prev]);
        setIsLoading(false);
      }, 100);
    }
  };

  const scrollToToday = () => {
    const today = new Date();
    const todayMonthIndex = monthsData.findIndex(month => 
      month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()
    );
    
    if (scrollContainerRef.current) {
      if (todayMonthIndex !== -1) {
        // If today's month is found, scroll to it
        const monthElements = scrollContainerRef.current.querySelectorAll('[data-month]');
        const todayElement = monthElements[todayMonthIndex];
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        // If today's month is not in the list, scroll to top (current month should be first)
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const calculateEventFinancials = (event: Event) => {
    const subtotal = (event.total_guest_price_gbp || 0) + (event.form_total_gbp || 0);
    const depositAmount = event.deposit_amount_gbp || 0;
    const eventPaymentsTotal = event.event_payments?.reduce((sum, payment) => sum + (payment.amount_gbp || 0), 0) || 0;
    const totalPayments = depositAmount + eventPaymentsTotal;
    const remainingBalance = subtotal - totalPayments;
    return { subtotal, remainingBalance, totalPayments, depositAmount };
  };

  const getEventWarningLevel = (event: Event, warningSettings?: any) => {
    if (!event.event_date) return null;
    
    const eventDate = new Date(event.event_date);
    const today = new Date();
    const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate remaining balance
    const financials = calculateEventFinancials(event);
    const hasUnpaidBalance = financials.remainingBalance > 0;
    
    // Only show warnings if there's an unpaid balance AND event is approaching
    if (!hasUnpaidBalance) return null;
    
    const warningThreshold = warningSettings?.warning_days_threshold || 7;
    
    if (daysUntilEvent <= warningThreshold && daysUntilEvent >= 0) {
      return daysUntilEvent <= 3 ? 'urgent' : 'warning';
    }
    
    return null;
  };

  const getEventTypeColor = (eventType: string | undefined) => {
    // Default color if no event type or configuration
    if (!eventType) return { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
    
    // Look up event type configuration from database
    const config = eventTypeConfigs?.find(c => c.event_type === eventType);
    if (config) {
      return {
        backgroundColor: config.color,
        textColor: config.text_color
      };
    }
    
    // Fallback to default primary color
    return { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
  };

  const today = new Date().toDateString();

  return (
    <TooltipProvider>
      <Card>
        {!isMobile && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events Calendar
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
                  onClick={scrollToToday}
                  className="text-xs px-2 h-8"
                >
                  Today
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <div 
            ref={scrollContainerRef}
            className="max-h-[80vh] overflow-y-auto"
            onScroll={handleScroll}
          >
            {monthsData.map((monthDate, monthIndex) => {
              const calendarDays = generateCalendarForMonth(monthDate);
              
              return (
                <div 
                  key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} 
                  className="border-b"
                  data-month={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                >
                  {/* Combined Sticky Header */}
                  <div className="sticky top-0 z-20 bg-card border-b px-6 py-3">
                    {/* Month Title */}
                    <h3 className="text-base font-semibold text-center mb-2">
                      {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="p-6 pt-4">
                  
                    <div className="grid grid-cols-7 gap-2">
                      {calendarDays.map((date, index) => {
                      const isToday = date.toDateString() === today;
                      const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                      const dayEventsInfo = getEventsForDate(date);
                      
                      return (
                        <div
                          key={index}
                          className={`
                            ${isMobile ? 'min-h-[100px]' : 'min-h-[120px]'} p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md
                            ${isToday ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/10' : 'bg-card border-border hover:bg-accent/50'}
                            ${!isCurrentMonth ? 'opacity-50' : ''}
                          `}
                          onClick={() => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            onDateClick(`${year}-${month}-${day}`);
                          }}
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
                              const warningLevel = getEventWarningLevel(event, calendarWarningSettings);
                              const eventColors = getEventTypeColor(event.event_type);
                              
                              // Apply warning colors if needed
                              let eventStyle = eventColors;
                              if (warningLevel === 'urgent') {
                                eventStyle = { 
                                  backgroundColor: calendarWarningSettings?.warning_color || 'hsl(0 84% 60%)', 
                                  textColor: 'white' 
                                };
                              } else if (warningLevel === 'warning') {
                                eventStyle = { 
                                  backgroundColor: calendarWarningSettings?.warning_color || 'hsl(45 93% 47%)', 
                                  textColor: 'white' 
                                };
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
                                      {warningLevel && financials.remainingBalance > 0 && (
                                        <div className="text-xs bg-orange-100 dark:bg-orange-900/20 p-2 rounded border-l-4 border-orange-500">
                                          ⚠️ {calendarWarningSettings?.warning_message || 'Event approaching with unpaid balance'}
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
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="text-center py-4 text-muted-foreground">
                Loading more months...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};