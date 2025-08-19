import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { format } from 'date-fns';
import { LeadForm } from './LeadForm';

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

interface AppointmentsCalendarViewProps {
  leads: Lead[];
  eventTypeConfigs: EventTypeConfig[];
}

export const AppointmentsCalendarView: React.FC<AppointmentsCalendarViewProps> = ({
  leads,
  eventTypeConfigs
}) => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [monthsData, setMonthsData] = useState<Date[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with multiple months for infinite scroll
  useEffect(() => {
    generateMultipleMonths();
    setTimeout(() => {
      scrollToToday();
    }, 100);
  }, []);

  const generateMultipleMonths = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
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
        const monthElements = scrollContainerRef.current.querySelectorAll('[data-month]');
        const todayElement = monthElements[todayMonthIndex];
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  const getLeadsForDate = (date: Date): Lead[] => {
    const dateStr = date.toISOString().split('T')[0];
    return leads.filter(lead => 
      lead.appointment_date && 
      new Date(lead.appointment_date).toISOString().split('T')[0] === dateStr
    );
  };

  const getEventTypeColor = (eventType: string | undefined) => {
    if (!eventType) return { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
    
    const config = eventTypeConfigs?.find(c => c.event_type === eventType);
    if (config) {
      return {
        backgroundColor: config.color,
        textColor: config.text_color
      };
    }
    
    return { backgroundColor: 'hsl(var(--primary))', textColor: 'hsl(var(--primary-foreground))' };
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditOpen(true);
  };

  const handleLeadUpdate = () => {
    setIsEditOpen(false);
    setSelectedLead(null);
    // Refresh leads would be handled by parent component
  };

  const today = new Date().toDateString();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointments Calendar
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToToday}
                className="text-xs px-2 h-8"
              >
                Today
              </Button>
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
                                            handleLeadClick(lead);
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
                                          
                                          {/* Lead Details */}
                                          <div className="text-sm space-y-1">
                                            {lead.email && (
                                              <div><span className="font-medium text-muted-foreground">Email:</span> {lead.email}</div>
                                            )}
                                            {lead.phone && (
                                              <div><span className="font-medium text-muted-foreground">Phone:</span> {lead.phone}</div>
                                            )}
                                            {totalGuests > 0 && (
                                              <div><span className="font-medium text-muted-foreground">Guests:</span> {totalGuests} people ({lead.guest_mixture})</div>
                                            )}
                                            {lead.event_type && (
                                              <div><span className="font-medium text-muted-foreground">Type:</span> {eventConfig?.display_name || lead.event_type}</div>
                                            )}
                                            {lead.appointment_date && (
                                              <div><span className="font-medium text-muted-foreground">Appointment:</span> {format(new Date(lead.appointment_date), 'dd/MM/yyyy')}</div>
                                            )}
                                            {lead.estimated_budget && (
                                              <div><span className="font-medium text-muted-foreground">Budget:</span> £{lead.estimated_budget.toLocaleString()}</div>
                                            )}
                                          </div>
                                          
                                          {lead.notes && (
                                            <div className="pt-2 border-t">
                                              <h4 className="font-medium text-sm mb-1">Notes</h4>
                                              <p className="text-sm text-muted-foreground">{lead.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                
                                {dayLeads.length > 3 && (
                                  <div className="text-xs text-muted-foreground p-1">
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
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads
                .filter(lead => lead.appointment_date && new Date(lead.appointment_date) >= new Date())
                .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                .slice(0, 5)
                .map(lead => {
                  const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(lead.appointment_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {eventConfig && (
                            <Badge 
                              variant="outline" 
                              style={{ 
                                backgroundColor: eventConfig.color + '20',
                                borderColor: eventConfig.color,
                                color: eventConfig.text_color 
                              }}
                            >
                              {eventConfig.display_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleLeadClick(lead)}
                      >
                        Edit Lead
                      </Button>
                    </div>
                  );
                })}
              
              {leads.filter(lead => lead.appointment_date && new Date(lead.appointment_date) >= new Date()).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming appointments scheduled
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Edit Dialog */}
        {selectedLead && (
          <LeadForm
            eventTypeConfigs={eventTypeConfigs}
            leadData={selectedLead}
            isEdit={true}
            onSuccess={handleLeadUpdate}
          />
        )}
      </div>
    </TooltipProvider>
  );
};