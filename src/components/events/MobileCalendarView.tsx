import React, { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_type?: string | null;
  status?: string;
  men_count?: number;
  ladies_count?: number;
  ethnicity?: string;
  primary_contact_name?: string;
  primary_contact_number?: string;
  secondary_contact_name?: string;
  secondary_contact_number?: string;
  total_guest_price_gbp?: number;
  deposit_amount_gbp?: number;
  form_total_gbp?: number;
  customer_id?: string;
  customers?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  event_payments?: Array<{
    amount_gbp?: number;
  }>;
}

interface MobileCalendarViewProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
  onDateClick: (date: string) => void;
}

export const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  events,
  onEventClick,
  onDateClick
}) => {
  const { currentTenant } = useAuth();
  const { data: eventTypeConfigs } = useEventTypeConfigs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Get first day of week (start from Monday = 1, Sunday = 0)
    const calendarStart = new Date(monthStart);
    const dayOfWeek = monthStart.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday becomes 6, Monday becomes 0
    calendarStart.setDate(monthStart.getDate() - daysFromMonday);
    
    // Get last day of week
    const calendarEnd = new Date(monthEnd);
    const endDayOfWeek = monthEnd.getDay();
    const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek; // Days until Sunday
    calendarEnd.setDate(monthEnd.getDate() + daysToSunday);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.event_date === dateStr);
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const calculateEventFinancials = (event: Event) => {
    const totalPaid = event.event_payments?.reduce((sum, payment) => 
      sum + (payment.amount_gbp || 0), 0) || 0;
    const totalPrice = event.total_guest_price_gbp || 0;
    const depositAmount = event.deposit_amount_gbp || 0;
    const formTotal = event.form_total_gbp || 0;
    const subtotal = Math.max(totalPrice, formTotal);
    const remainingBalance = subtotal - totalPaid;
    
    return { 
      totalPayments: totalPaid, 
      subtotal,
      depositAmount,
      remainingBalance
    };
  };

  const getEventWarningLevel = (event: Event, warningSettings: any) => {
    if (!event.event_date || !warningSettings) return null;
    
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

  const calendarDays = generateCalendarDays();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 top-[120px] bottom-0 bg-background overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold text-foreground min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-8"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="p-2">
          {/* Week Headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {weekDays.map((day) => (
              <div 
                key={day} 
                className="text-center py-2 text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px bg-border">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    bg-card min-h-[80px] p-1 relative
                    ${isCurrentMonth ? 'opacity-100' : 'opacity-40'}
                    ${isTodayDate ? 'bg-primary/5 border-2 border-primary/20' : ''}
                  `}
                  onClick={() => onDateClick(format(day, 'yyyy-MM-dd'))}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isTodayDate ? 'text-primary font-bold' : 
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => {
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
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event.id);
                          }}
                          className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-all relative"
                          style={{
                            backgroundColor: eventStyle.backgroundColor,
                            color: eventStyle.textColor
                          }}
                        >
                          {event.start_time && (
                            <span className="font-medium">
                              {formatTime(event.start_time)}{' '}
                            </span>
                          )}
                          {event.title}
                          {warningLevel && (
                            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></div>
                          )}
                        </div>
                      );
                    })}
                    
                    {dayEvents.length > 2 && (
                      <div 
                        className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show first remaining event for simplicity
                          onEventClick(dayEvents[2].id);
                        }}
                      >
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Details Bottom Sheet */}
      <Sheet open={isEventSheetOpen} onOpenChange={setIsEventSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh]">
          {selectedEvent && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-semibold">
                    {selectedEvent.title}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEventSheetOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>
              
              <div className="space-y-4 mt-4">
                {/* Event Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(selectedEvent.event_date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  
                  {(selectedEvent.start_time || selectedEvent.end_time) && (
                    <div className="text-sm text-muted-foreground ml-6">
                      {selectedEvent.start_time && formatTime(selectedEvent.start_time)}
                      {selectedEvent.start_time && selectedEvent.end_time && ' - '}
                      {selectedEvent.end_time && formatTime(selectedEvent.end_time)}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Customer Info */}
                {selectedEvent.customers && (
                  <div>
                    <h4 className="font-medium mb-2">Customer</h4>
                    <div className="space-y-1 text-sm">
                      {selectedEvent.customers.name && (
                        <div>{selectedEvent.customers.name}</div>
                      )}
                      {selectedEvent.customers.phone && (
                        <div className="text-muted-foreground">{selectedEvent.customers.phone}</div>
                      )}
                      {selectedEvent.customers.email && (
                        <div className="text-muted-foreground">{selectedEvent.customers.email}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Event Info */}
                <div>
                  <h4 className="font-medium mb-2">Event Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedEvent.men_count !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Men:</span> {selectedEvent.men_count}
                      </div>
                    )}
                    {selectedEvent.ladies_count !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Ladies:</span> {selectedEvent.ladies_count}
                      </div>
                    )}
                    {selectedEvent.event_type && (
                      <div className="col-span-2">
                        <Badge variant="secondary">{selectedEvent.event_type}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financials */}
                {selectedEvent.total_guest_price_gbp && (
                  <div>
                    <h4 className="font-medium mb-2">Financial Summary</h4>
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const { totalPayments, subtotal, depositAmount, remainingBalance } = calculateEventFinancials(selectedEvent);
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span>£{subtotal.toFixed(2)}</span>
                            </div>
                            {depositAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Deposit:</span>
                                <span>£{depositAmount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paid:</span>
                              <span>£{totalPayments.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Balance:</span>
                              <span className={remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}>
                                £{remainingBalance.toFixed(2)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      onEventClick(selectedEvent.id);
                      setIsEventSheetOpen(false);
                    }}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEventSheetOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};