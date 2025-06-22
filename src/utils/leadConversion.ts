
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConvertLeadData {
  leadId: string;
  tenantId: string;
  leadData: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    event_type?: string;
    event_date?: string;
    estimated_guests?: number;
    estimated_budget?: number;
    notes?: string;
  };
}

export const convertLeadToCustomer = async ({ leadId, tenantId, leadData }: ConvertLeadData) => {
  try {
    // Create customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([{
        name: leadData.name,
        email: leadData.email || null,
        phone: leadData.phone || null,
        company: leadData.company || null,
        customer_type: leadData.company ? 'corporate' : 'individual',
        notes: leadData.notes || null,
        tenant_id: tenantId,
        active: true,
        marketing_consent: false,
        vip_status: false
      }])
      .select()
      .single();

    if (customerError) throw customerError;

    // Create event record if event details exist
    let eventData = null;
    if (leadData.event_date && leadData.event_type) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert([{
          event_name: `${leadData.event_type} for ${leadData.name}`,
          event_type: leadData.event_type,
          event_start_date: leadData.event_date,
          start_time: '18:00:00',
          end_time: '23:00:00',
          estimated_guests: leadData.estimated_guests || 50,
          total_amount: leadData.estimated_budget || null,
          status: 'inquiry',
          customer_id: customer.id,
          lead_id: leadId,
          tenant_id: tenantId
        }])
        .select()
        .single();

      if (eventError) throw eventError;
      eventData = event;
    }

    // Update lead status to converted
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({ 
        status: 'converted',
        conversion_date: new Date().toISOString()
      })
      .eq('id', leadId);

    if (leadUpdateError) throw leadUpdateError;

    return { customer, event: eventData };
  } catch (error) {
    console.error('Error converting lead to customer:', error);
    throw error;
  }
};
