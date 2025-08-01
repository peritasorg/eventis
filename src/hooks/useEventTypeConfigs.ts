import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventTypeConfig {
  id: string;
  event_type: string;
  display_name: string;
  color: string;
  text_color: string;
  is_active: boolean;
  sort_order: number;
}

export const useEventTypeConfigs = () => {
  const { currentTenant } = useAuth();

  return useSupabaseQuery(
    ['event-type-configs'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('event_type_configs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
    }
  );
};

export const getEventColor = (
  eventType: string, 
  eventDate: string, 
  eventTypeConfigs: EventTypeConfig[] = []
) => {
  const eventDateTime = new Date(eventDate);
  const now = new Date();
  const daysDifference = Math.ceil((eventDateTime.getTime() - now.getTime()) / (1000 * 3600 * 24));

  // Priority 1: Urgent date-based coloring
  if (daysDifference <= 7 && daysDifference >= 0) {
    return {
      backgroundColor: '#EA580C', // orange-600
      textColor: '#FFFFFF',
      borderColor: '#FB923C' // orange-400
    };
  }
  
  if (daysDifference <= 28 && daysDifference > 7) {
    return {
      backgroundColor: '#DC2626', // red-600
      textColor: '#FFFFFF',
      borderColor: '#F87171' // red-400
    };
  }

  // Priority 2: Event type coloring
  const config = eventTypeConfigs.find(c => c.event_type === eventType);
  if (config) {
    return {
      backgroundColor: config.color,
      textColor: config.text_color,
      borderColor: config.color
    };
  }

  // Default coloring
  return {
    backgroundColor: '#3B82F6', // blue-500
    textColor: '#FFFFFF',
    borderColor: '#60A5FA' // blue-400
  };
};

export const getEventColorClasses = (
  eventType: string,
  eventDate: string,
  eventTypeConfigs: EventTypeConfig[] = []
) => {
  const eventDateTime = new Date(eventDate);
  const now = new Date();
  const daysDifference = Math.ceil((eventDateTime.getTime() - now.getTime()) / (1000 * 3600 * 24));

  // Priority 1: Urgent date-based coloring
  if (daysDifference <= 7 && daysDifference >= 0) {
    return 'bg-orange-600 text-white border-orange-400';
  }
  
  if (daysDifference <= 28 && daysDifference > 7) {
    return 'bg-red-600 text-white border-red-400';
  }

  // Priority 2: Event type coloring - we'll use inline styles for custom colors
  const config = eventTypeConfigs.find(c => c.event_type === eventType);
  if (config) {
    return 'text-white border-current'; // Will be overridden by inline styles
  }

  // Default coloring
  return 'bg-blue-500 text-white border-blue-400';
};