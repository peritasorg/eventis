import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CalendarSettings = () => {
  const navigate = useNavigate();

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => navigate('/calendar-settings')}
      className="flex items-center gap-2"
    >
      <Settings className="h-4 w-4" />
      Calendar Settings
    </Button>
  );
};
