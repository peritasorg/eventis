
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Lead {
  id: string;
  name: string;
  event_date?: string;
  event_type?: string;
  status: string;
  phone?: string;
  email?: string;
}

interface LeadsCalendarViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDateClick: (date: string) => void;
}

export const LeadsCalendarView: React.FC<LeadsCalendarViewProps> = ({
  leads,
  onLeadClick,
  onDateClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const getLeadsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return leads?.filter(lead => 
      lead.event_date === dateString
    ) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'qualified': return 'bg-green-100 text-green-800 border-green-200';
      case 'quoted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'converted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
            const dayLeads = getLeadsForDate(date);
            
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
                  {dayLeads.slice(0, 2).map((lead) => (
                    <div
                      key={lead.id}
                      className={`text-xs p-2 rounded border cursor-pointer transition-all hover:scale-105 ${getStatusColor(lead.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLeadClick(lead);
                      }}
                    >
                      <div className="font-medium truncate">{lead.name}</div>
                      <div className="truncate opacity-75">{lead.event_type}</div>
                    </div>
                  ))}
                  
                  {dayLeads.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayLeads.length - 2} more
                    </div>
                  )}
                  
                  {dayLeads.length === 0 && isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-xs text-gray-400 hover:text-gray-600"
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
