import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useEventTypeConfigs, getEventColor } from '@/hooks/useEventTypeConfigs';
import { useNavigate } from 'react-router-dom';

export const TopBar = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [isTrialVisible, setIsTrialVisible] = React.useState(true);
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();

  // Get upcoming events
  const { data: upcomingEvents } = useSupabaseQuery(
    ['upcoming-events-topbar'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('id, event_name, event_type, event_start_date')
        .eq('tenant_id', currentTenant.id)
        .gte('event_start_date', new Date().toISOString().split('T')[0])
        .order('event_start_date', { ascending: true })
        .limit(3);
      
      if (error) return [];
      return data || [];
    }
  );

  // Trial banner logic
  const showTrialBanner = currentTenant?.subscription_status === 'trial' && isTrialVisible;
  
  let daysRemaining = 0;
  if (showTrialBanner) {
    const trialEndDate = new Date(currentTenant.created_at);
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    const today = new Date();
    daysRemaining = Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Upcoming Events Widget */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Upcoming:</span>
          </div>
          <div className="flex items-center space-x-2">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => {
                const eventColors = getEventColor(event.event_type, event.event_start_date, eventTypeConfigs);
                const eventDate = new Date(event.event_start_date);
                const isToday = eventDate.toDateString() === new Date().toDateString();
                const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                
                let dateLabel = eventDate.toLocaleDateString('en-GB', { 
                  month: 'short', 
                  day: 'numeric' 
                });
                
                if (isToday) dateLabel = 'Today';
                else if (isTomorrow) dateLabel = 'Tomorrow';

                return (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: eventColors.backgroundColor,
                      color: eventColors.textColor,
                    }}
                  >
                    <span className="truncate max-w-24">{event.event_name}</span>
                    <span className="opacity-75">•</span>
                    <span>{dateLabel}</span>
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-gray-400">No upcoming events</span>
            )}
          </div>
        </div>

        {/* Trial Banner */}
        {showTrialBanner && (
          <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-800">
              Trial: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
            </span>
            <Button 
              variant="link" 
              size="sm"
              className="p-0 h-auto text-blue-600 hover:text-blue-800 text-sm"
            >
              Subscribe
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrialVisible(false)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};