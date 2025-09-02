import React, { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    
    // Get first day of week (start from Sunday)
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
    
    // Get last day of week
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    
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
    const balance = totalPrice - totalPaid;
    
    return { totalPaid, totalPrice, balance };
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 top-[120px] bg-background overflow-hidden">
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
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setIsEventSheetOpen(true);
                        }}
                        className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20 transition-colors"
                      >
                        {event.start_time && (
                          <span className="font-medium">
                            {formatTime(event.start_time)}{' '}
                          </span>
                        )}
                        {event.title}
                      </div>
                    ))}
                    
                    {dayEvents.length > 2 && (
                      <div 
                        className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show first remaining event for simplicity
                          setSelectedEvent(dayEvents[2]);
                          setIsEventSheetOpen(true);
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
                        const { totalPaid, totalPrice, balance } = calculateEventFinancials(selectedEvent);
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Price:</span>
                              <span>£{totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paid:</span>
                              <span>£{totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Balance:</span>
                              <span className={balance > 0 ? 'text-destructive' : 'text-success'}>
                                £{balance.toFixed(2)}
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