import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useEventTypeConfigs, getEventColor } from '@/hooks/useEventTypeConfigs';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export const TopBar = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isTrialVisible, setIsTrialVisible] = React.useState(true);
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();

  // Get warning settings
  const { data: warningSettings } = useSupabaseQuery(
    ['calendar_warning_settings_topbar', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('calendar_warning_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  );

  // Get unpaid events within warning threshold
  const { data: unpaidEvents } = useSupabaseQuery(
    ['unpaid-events-topbar', currentTenant?.id, warningSettings?.warning_days_threshold],
    async () => {
      if (!currentTenant?.id || !warningSettings?.is_active) return [];
      
      const warningThreshold = warningSettings.warning_days_threshold || 7;
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + warningThreshold);
      
      // First get events within the warning threshold
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          event_type, 
          event_date,
          total_guest_price_gbp,
          form_total_gbp,
          deposit_amount_gbp
        `)
        .eq('tenant_id', currentTenant.id)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .lte('event_date', warningDate.toISOString().split('T')[0])
        .order('event_date', { ascending: true });
      
      if (eventsError || !events) return [];
      
      // Get all event payments for these events
      const eventIds = events.map(e => e.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('event_payments')
        .select('event_id, amount_gbp')
        .in('event_id', eventIds);
      
      if (paymentsError) return [];
      
      // Group payments by event ID
      const paymentsByEvent = (payments || []).reduce((acc, payment) => {
        if (!acc[payment.event_id]) acc[payment.event_id] = 0;
        acc[payment.event_id] += payment.amount_gbp || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Filter for events with unpaid balances using same logic as calendar
      const eventsWithUnpaidBalances = events.filter(event => {
        const subtotal = (event.total_guest_price_gbp || 0) + (event.form_total_gbp || 0);
        const depositAmount = event.deposit_amount_gbp || 0;
        const eventPaymentsTotal = paymentsByEvent[event.id] || 0;
        const totalPayments = depositAmount + eventPaymentsTotal;
        const remainingBalance = subtotal - totalPayments;
        return remainingBalance > 0;
      });
      
      return eventsWithUnpaidBalances.slice(0, 3);
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
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Unpaid Events Widget - Hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-md bg-warning/10">
                <Calendar className="h-4 w-4 text-warning" />
              </div>
              <span className="text-sm font-medium text-foreground">Unpaid Events</span>
            </div>
            <div className="flex items-center space-x-2">
              {unpaidEvents && unpaidEvents.length > 0 ? (
                unpaidEvents.map((event) => {
                  const eventColors = getEventColor(event.event_type, event.event_date, eventTypeConfigs);
                  const eventDate = new Date(event.event_date);
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
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-all duration-200 bg-warning text-warning-foreground shadow-sm"
                    >
                      <span className="truncate max-w-24">{event.title}</span>
                      <span className="opacity-60">•</span>
                      <span>{dateLabel}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">No unpaid events</span>
              )}
            </div>
          </div>
        )}

        {/* Trial Banner - Simplified on mobile */}
        {showTrialBanner && (
          <div className={`flex items-center ${isMobile ? 'space-x-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20' : 'space-x-3 bg-primary/5 px-4 py-2.5 rounded-lg border border-primary/20'}`}>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-primary`}>
              Trial: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
            </span>
            {!isMobile && (
              <Button 
                variant="ghost" 
                size="sm"
                className="p-0 h-auto text-primary hover:text-primary/80 text-sm font-medium"
              >
                Subscribe
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrialVisible(false)}
              className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} p-0 text-primary/60 hover:text-primary rounded`}
            >
              <X className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};