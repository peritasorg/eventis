import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCalendarState } from '@/contexts/CalendarStateContext';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  created_at: string;
  appointment_date: string;
  date_of_contact: string;
  men_count: number;
  ladies_count: number;
  guest_mixture: string;
  date_of_interest: string;
  estimated_budget: number;
  notes: string;
  lead_score: number;
  conversion_date?: string;
  event_date?: string;
}

interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
}

interface LeadsCalendarViewProps {
  leads: Lead[];
  eventTypeConfigs: EventTypeConfig[];
  onLeadClick: (lead: Lead) => void;
}

export const LeadsCalendarView: React.FC<LeadsCalendarViewProps> = ({
  leads,
  eventTypeConfigs,
  onLeadClick
}) => {
  const [monthsData, setMonthsData] = useState<Date[]>([]);
  const { calendarState, setCurrentMonth, restoreCalendarState } = useCalendarState();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    
    // Start from current month (not 3 months ago)
    for (let i = 0; i < 12; i++) { // Generate 12 months starting from current month
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
    
    // Load more months when near bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading) {
      setIsLoading(true);
      setTimeout(() => {
        const lastMonth = monthsData[monthsData.length - 1];
        const newMonths = [];
        for (let i = 1; i <= 3; i++) {
          const newMonth = new Date(lastMonth);
          newMonth.setMonth(lastMonth.getMonth() + i);
          newMonths.push(newMonth);
        }
        setMonthsData(prev => [...prev, ...newMonths]);
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

  const getLeadsForDate = (date: Date): Lead[] => {
    const dateString = date.toISOString().split('T')[0];
    return leads.filter(lead => {
      const appointmentDate = lead.appointment_date ? lead.appointment_date.split('T')[0] : null;
      const eventDate = lead.event_date ? lead.event_date.split('T')[0] : null;
      return appointmentDate === dateString || eventDate === dateString;
    });
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
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointments Calendar
            </div>
            <div className="flex items-center gap-2">
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
                        const dayLeads = getLeadsForDate(date);
                        
                        return (
                          <div
                            key={index}
                            className={`
                              min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md
                              ${isToday ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/10' : 'bg-card border-border hover:bg-accent/50'}
                              ${!isCurrentMonth ? 'opacity-50' : ''}
                            `}
                          >
                            <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                              {date.getDate()}
                            </div>
                            
                            <div className="space-y-1">
                              {dayLeads.slice(0, 3).map((lead) => {
                                const totalGuests = (lead.men_count || 0) + (lead.ladies_count || 0);
                                const eventColors = getEventTypeColor(lead.event_type);
                                const eventConfig = eventTypeConfigs?.find(c => c.event_type === lead.event_type);
                                
                                return (
                                  <Tooltip key={lead.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="text-xs p-1 rounded-sm cursor-pointer hover:opacity-80 transition-all"
                                        style={{
                                          backgroundColor: eventColors.backgroundColor,
                                          color: eventColors.textColor
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onLeadClick(lead);
                                        }}
                                      >
                                        <div className="font-medium truncate">{lead.name}</div>
                                        {eventConfig && (
                                          <div className="text-[10px] opacity-90 truncate">
                                            {eventConfig.display_name}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm p-4 bg-card text-card-foreground border shadow-lg">
                                      <div className="space-y-3">
                                        <div className="font-semibold text-base">{lead.name}</div>
                                        
                                        {/* Contact Information */}
                                        <div className="text-sm space-y-1">
                                          {lead.email && (
                                            <div><span className="font-medium text-muted-foreground">Email:</span> {lead.email}</div>
                                          )}
                                          {lead.phone && (
                                            <div><span className="font-medium text-muted-foreground">Phone:</span> {lead.phone}</div>
                                          )}
                                        </div>
                                        
                                        {/* Lead Details */}
                                        <div className="text-sm space-y-1">
                                          {totalGuests > 0 && (
                                            <div><span className="font-medium text-muted-foreground">Guests:</span> {totalGuests} people ({lead.guest_mixture})</div>
                                          )}
                                          {lead.event_type && eventConfig && (
                                            <div><span className="font-medium text-muted-foreground">Type:</span> {eventConfig.display_name}</div>
                                          )}
                                          {lead.estimated_budget && (
                                            <div><span className="font-medium text-muted-foreground">Budget:</span> £{lead.estimated_budget.toLocaleString()}</div>
                                          )}
                                          <div><span className="font-medium text-muted-foreground">Score:</span> {lead.lead_score || 0}</div>
                                        </div>
                                        
                                        {/* Appointment Information */}
                                        <div className="text-sm space-y-1 border-t pt-2">
                                          {lead.appointment_date && (
                                            <div><span className="font-medium text-muted-foreground">Appointment:</span> {format(new Date(lead.appointment_date), 'dd/MM/yyyy')}</div>
                                          )}
                                          {lead.date_of_interest && (
                                            <div><span className="font-medium text-muted-foreground">Date of Interest:</span> {format(new Date(lead.date_of_interest), 'dd/MM/yyyy')}</div>
                                          )}
                                          <div><span className="font-medium text-muted-foreground">Created:</span> {format(new Date(lead.created_at), 'dd/MM/yyyy')}</div>
                                        </div>
                                        
                                        {/* Notes */}
                                        {lead.notes && (
                                          <div className="text-sm border-t pt-2">
                                            <div className="font-medium text-muted-foreground mb-1">Notes:</div>
                                            <div className="text-xs text-muted-foreground">{lead.notes}</div>
                                          </div>
                                        )}
                                        
                                        {/* Conversion Status */}
                                        {lead.conversion_date && (
                                          <div className="text-xs bg-green-100 dark:bg-green-900/20 p-2 rounded border-l-4 border-green-500">
                                            <span className="font-medium text-green-800 dark:text-green-200">Converted:</span> {format(new Date(lead.conversion_date), 'dd/MM/yyyy')}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {dayLeads.length > 3 && (
                                <div className="text-xs text-muted-foreground px-1">
                                  +{dayLeads.length - 3} more
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
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Appointments Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads
              .filter(lead => {
                const appointmentDate = lead.appointment_date ? new Date(lead.appointment_date) : null;
                const eventDate = lead.event_date ? new Date(lead.event_date) : null;
                const relevantDate = appointmentDate || eventDate;
                return relevantDate && relevantDate >= new Date();
              })
              .sort((a, b) => {
                const dateA = new Date(a.appointment_date || a.event_date || '');
                const dateB = new Date(b.appointment_date || b.event_date || '');
                return dateA.getTime() - dateB.getTime();
              })
              .slice(0, 5)
              .map(lead => {
                const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
                const relevantDate = new Date(lead.appointment_date || lead.event_date || '');
                const totalGuests = (lead.men_count || 0) + (lead.ladies_count || 0);
                
                return (
                  <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(relevantDate, 'dd/MM/yyyy')}
                          {totalGuests > 0 && (
                            <>
                              <span>•</span>
                              <span>{totalGuests} guests</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {eventConfig && (
                          <div
                            className="px-2 py-1 rounded-sm text-xs font-medium"
                            style={{ 
                              backgroundColor: eventConfig.color + '20',
                              color: eventConfig.color,
                              border: `1px solid ${eventConfig.color}40`
                            }}
                          >
                            {eventConfig.display_name}
                          </div>
                         )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onLeadClick(lead)}
                    >
                      Edit Lead
                    </Button>
                  </div>
                );
              })}
            
            {leads.filter(lead => {
              const appointmentDate = lead.appointment_date ? new Date(lead.appointment_date) : null;
              const eventDate = lead.event_date ? new Date(lead.event_date) : null;
              const relevantDate = appointmentDate || eventDate;
              return relevantDate && relevantDate >= new Date();
            }).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming appointments scheduled
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};