-- Create event_time_slots table for custom time slot management
CREATE TABLE public.event_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  label TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on event_time_slots
ALTER TABLE public.event_time_slots ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for event_time_slots
CREATE POLICY "event_time_slots_tenant_isolation" 
ON public.event_time_slots 
FOR ALL 
USING (tenant_id = get_current_tenant_id());

-- Add guest_info JSONB field to event_forms table
ALTER TABLE public.event_forms 
ADD COLUMN guest_info JSONB DEFAULT '{}'::jsonb;

-- Insert default time slots for existing tenants
INSERT INTO public.event_time_slots (tenant_id, label, start_time, end_time, sort_order)
SELECT DISTINCT tenant_id, 'Morning', '09:00'::time, '12:00'::time, 1
FROM public.tenants
WHERE active = true
UNION ALL
SELECT DISTINCT tenant_id, 'Afternoon', '12:00'::time, '17:00'::time, 2
FROM public.tenants
WHERE active = true
UNION ALL
SELECT DISTINCT tenant_id, 'Evening', '17:00'::time, '22:00'::time, 3
FROM public.tenants
WHERE active = true
UNION ALL
SELECT DISTINCT tenant_id, 'Night', '22:00'::time, '02:00'::time, 4
FROM public.tenants
WHERE active = true;

-- Create trigger for updated_at on event_time_slots
CREATE TRIGGER update_event_time_slots_updated_at
    BEFORE UPDATE ON public.event_time_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();