import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CalendarState {
  currentMonth: Date;
  scrollPosition: number;
  lastViewedEventDate?: string;
}

interface CalendarStateContextType {
  calendarState: CalendarState;
  setCurrentMonth: (date: Date) => void;
  setScrollPosition: (position: number) => void;
  setLastViewedEventDate: (date: string) => void;
  restoreCalendarState: () => void;
}

const CalendarStateContext = createContext<CalendarStateContextType | undefined>(undefined);

const STORAGE_KEY = 'calendar-state';

export const CalendarStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [calendarState, setCalendarState] = useState<CalendarState>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          currentMonth: new Date(parsed.currentMonth),
        };
      }
    } catch (error) {
      console.warn('Failed to restore calendar state:', error);
    }
    
    return {
      currentMonth: new Date(),
      scrollPosition: 0,
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calendarState));
    } catch (error) {
      console.warn('Failed to save calendar state:', error);
    }
  }, [calendarState]);

  const setCurrentMonth = (date: Date) => {
    setCalendarState(prev => ({ ...prev, currentMonth: date }));
  };

  const setScrollPosition = (position: number) => {
    setCalendarState(prev => ({ ...prev, scrollPosition: position }));
  };

  const setLastViewedEventDate = (date: string) => {
    setCalendarState(prev => ({ ...prev, lastViewedEventDate: date }));
  };

  const restoreCalendarState = () => {
    // If we have a last viewed event date, navigate to that month
    if (calendarState.lastViewedEventDate) {
      const eventDate = new Date(calendarState.lastViewedEventDate);
      setCurrentMonth(eventDate);
    }
  };

  return (
    <CalendarStateContext.Provider
      value={{
        calendarState,
        setCurrentMonth,
        setScrollPosition,
        setLastViewedEventDate,
        restoreCalendarState,
      }}
    >
      {children}
    </CalendarStateContext.Provider>
  );
};

export const useCalendarState = () => {
  const context = useContext(CalendarStateContext);
  if (context === undefined) {
    throw new Error('useCalendarState must be used within a CalendarStateProvider');
  }
  return context;
};