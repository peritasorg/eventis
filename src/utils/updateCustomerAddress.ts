import { supabase } from '@/integrations/supabase/client';

export const updateCustomerAddress = async (customerId: string, addressData: {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
}) => {
  const { data, error } = await supabase
    .from('customers')
    .update(addressData)
    .eq('id', customerId)
    .select();

  if (error) {
    throw error;
  }

  return data;
};

// Update Fatima Khalif's address
export const updateFatimaKhalifAddress = async () => {
  try {
    const result = await updateCustomerAddress('6345982e-f569-4dec-9832-f9612cb7ff2a', {
      address_line1: '123 High Street',
      city: 'Birmingham'
    });
    console.log('Updated Fatima Khalif address:', result);
    return result;
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
};