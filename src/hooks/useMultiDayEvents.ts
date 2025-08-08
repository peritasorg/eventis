import { useMemo } from 'react';

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

interface DayEventInfo {
  event: Event;
  position: 'start' | 'middle' | 'end' | 'single';
  isFirstDay: boolean;
  isLastDay: boolean;
  totalDays: number;
  dayIndex: number;
}

export const useMultiDayEvents = (events: Event[]) => {
  const getEventsForDate = useMemo(() => {
    return (date: Date): DayEventInfo[] => {
      // Use local date formatting to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      return events?.filter(event => {
        if (!event.event_start_date) return false;
        
        const eventStartDate = event.event_start_date;
        const eventEndDate = event.event_end_date || eventStartDate;
        
        // Check if the date falls within the event's date range
        return dateString >= eventStartDate && dateString <= eventEndDate;
      }).map(event => {
        const startDate = new Date(event.event_start_date);
        const endDate = new Date(event.event_end_date || event.event_start_date);
        const currentDate = new Date(dateString);
        
        // Calculate position and metadata
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const dayIndex = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const isFirstDay = dateString === event.event_start_date;
        const isLastDay = dateString === (event.event_end_date || event.event_start_date);
        
        let position: 'start' | 'middle' | 'end' | 'single';
        
        if (totalDays === 1) {
          position = 'single';
        } else if (isFirstDay) {
          position = 'start';
        } else if (isLastDay) {
          position = 'end';
        } else {
          position = 'middle';
        }
        
        return {
          event,
          position,
          isFirstDay,
          isLastDay,
          totalDays,
          dayIndex,
        };
      }) || [];
    };
  }, [events]);

  const getEventDisplayInfo = (dayEventInfo: DayEventInfo) => {
    const { event, position, isFirstDay, isLastDay, totalDays } = dayEventInfo;
    
    const baseClasses = "text-xs p-2 rounded-sm border cursor-pointer transition-all hover:scale-105";
    
    // Different visual styles based on position
    const positionClasses = {
      single: "rounded-md",
      start: "rounded-l-md rounded-r-sm border-r-0",
      middle: "rounded-none border-r-0 border-l-0",
      end: "rounded-r-md rounded-l-sm border-l-0",
    };
    
    const displayName = position === 'middle' 
      ? `→ ${event.event_name}` 
      : event.event_name;
    
    const showTime = isFirstDay;
    const showMultiDayIndicator = totalDays > 1;
    
    return {
      displayName,
      showTime,
      showMultiDayIndicator,
      positionClasses: positionClasses[position],
      baseClasses,
    };
  };

  return {
    getEventsForDate,
    getEventDisplayInfo,
  };
};