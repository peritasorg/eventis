import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventFormTotal {
  id: string;
  form_label: string;
  form_total: number;
  form_responses: Record<string, any>;
}

export const useEventFormTotals = (eventId?: string) => {
  const { currentTenant } = useAuth();

  const { data: formTotals, ...query } = useSupabaseQuery(
    ['event-form-totals', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_forms')
        .select(`
          id,
          form_label,
          form_total,
          form_responses
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('tab_order');

      if (error) throw error;
      return data || [];
    }
  );

  // Calculate live total from all active forms - ensure proper math with proper precision
  const liveFormTotal = (formTotals || []).reduce((total, form) => {
    const formTotal = Number(form.form_total || 0);
    return total + (isNaN(formTotal) ? 0 : formTotal);
  }, 0);
  
  // Round to 2 decimal places to prevent floating point precision issues
  const roundedLiveFormTotal = Math.round(liveFormTotal * 100) / 100;

  return {
    formTotals: formTotals || [],
    liveFormTotal: roundedLiveFormTotal,
    isLoading: query.isLoading,
    error: query.error
  };
};