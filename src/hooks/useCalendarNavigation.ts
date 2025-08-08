import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface CalendarNavigationState {
  currentDate: Date;
  isScrolling: boolean;
  touchStartX: number | null;
  touchStartY: number | null;
}

export const useCalendarNavigation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize date from URL params or default to today
  const getInitialDate = () => {
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    
    if (monthParam && yearParam) {
      const month = parseInt(monthParam) - 1; // URL uses 1-based, Date uses 0-based
      const year = parseInt(yearParam);
      if (!isNaN(month) && !isNaN(year)) {
        return new Date(year, month, 1);
      }
    }
    return new Date();
  };

  const [state, setState] = useState<CalendarNavigationState>({
    currentDate: getInitialDate(),
    isScrolling: false,
    touchStartX: null,
    touchStartY: null,
  });

  // Update URL when date changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('month', (state.currentDate.getMonth() + 1).toString());
    newParams.set('year', state.currentDate.getFullYear().toString());
    setSearchParams(newParams, { replace: true });
  }, [state.currentDate, searchParams, setSearchParams]);

  const navigateToMonth = useCallback((direction: 'prev' | 'next' | 'today' | Date) => {
    setState(prev => {
      let newDate: Date;
      
      if (direction === 'today') {
        newDate = new Date();
      } else if (direction instanceof Date) {
        newDate = new Date(direction);
      } else {
        newDate = new Date(prev.currentDate);
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      }
      
      return { ...prev, currentDate: newDate };
    });
  }, []);

  const handleWheelScroll = useCallback((event: WheelEvent) => {
    // Prevent default scrolling if horizontal scroll detected
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
      
      if (!state.isScrolling) {
        setState(prev => ({ ...prev, isScrolling: true }));
        
        if (event.deltaX > 0) {
          navigateToMonth('next');
        } else {
          navigateToMonth('prev');
        }
        
        // Reset scrolling state after animation
        setTimeout(() => {
          setState(prev => ({ ...prev, isScrolling: false }));
        }, 300);
      }
    }
  }, [state.isScrolling, navigateToMonth]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    setState(prev => ({
      ...prev,
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
    }));
  }, []);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (state.touchStartX === null || state.touchStartY === null) return;
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - state.touchStartX;
    const deltaY = touch.clientY - state.touchStartY;
    
    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      event.preventDefault();
      
      if (deltaX > 0) {
        navigateToMonth('prev');
      } else {
        navigateToMonth('next');
      }
    }
    
    setState(prev => ({
      ...prev,
      touchStartX: null,
      touchStartY: null,
    }));
  }, [state.touchStartX, state.touchStartY, navigateToMonth]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== document.body) return; // Only if no input is focused
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        navigateToMonth('prev');
        break;
      case 'ArrowRight':
        event.preventDefault();
        navigateToMonth('next');
        break;
      case 'Home':
        event.preventDefault();
        navigateToMonth('today');
        break;
    }
  }, [navigateToMonth]);

  // Set up event listeners
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheelScroll, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheelScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheelScroll, handleTouchStart, handleTouchEnd, handleKeyDown]);

  return {
    currentDate: state.currentDate,
    isScrolling: state.isScrolling,
    scrollContainerRef,
    navigateToMonth,
    goToToday: () => navigateToMonth('today'),
    goToEventMonth: (eventDate: string) => {
      const date = new Date(eventDate);
      navigateToMonth(date);
    },
  };
};