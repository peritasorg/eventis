import { supabase } from '@/integrations/supabase/client';

export interface ExtractedFieldData {
  id: string;
  label: string;
  value: any;
  notes: string;
  price: number;
  quantity: number;
  description: string; // Formatted description with notes
}

export interface EventFormData {
  form_responses: Record<string, any>;
  form_id: string;
  form_label: string;
}

/**
 * Smart extraction of populated form fields for quote/invoice generation
 */
export const extractPopulatedFields = async (
  eventForms: EventFormData[],
  tenantId: string,
  documentType: 'quote' | 'invoice'
): Promise<ExtractedFieldData[]> => {
  try {
    const extractedFields: ExtractedFieldData[] = [];

    // Get all field library records for this tenant to map IDs to labels and settings
    const { data: fieldLibrary, error: fieldsError } = await supabase
      .from('field_library')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (fieldsError) {
      console.error('Error fetching field library:', fieldsError);
      return [];
    }

    // Create lookup map for field data
    const fieldLookup = new Map(fieldLibrary.map(field => [field.id, field]));

    // Process each event form
    for (const eventForm of eventForms) {
      const { form_responses } = eventForm;
      
      if (!form_responses || typeof form_responses !== 'object') continue;

      // Process each field response
      Object.entries(form_responses).forEach(([fieldId, response]) => {
        if (!response || typeof response !== 'object') return;

        const fieldConfig = fieldLookup.get(fieldId);
        if (!fieldConfig) return;

        // Check if field should appear on this document type
        const shouldAppear = documentType === 'quote' 
          ? fieldConfig.appears_on_quote 
          : fieldConfig.appears_on_invoice;

        if (!shouldAppear) return;

        // Check if field has any populated data
        const hasValue = isFieldPopulated(response, fieldConfig.field_type);
        if (!hasValue) return;

        // Extract field data
        const extractedField = extractFieldData(fieldId, response, fieldConfig);
        if (extractedField) {
          extractedFields.push(extractedField);
        }
      });
    }

    return extractedFields;
  } catch (error) {
    console.error('Error extracting populated fields:', error);
    return [];
  }
};

/**
 * Check if a field has any populated data based on its type
 */
const isFieldPopulated = (response: any, fieldType: string): boolean => {
  // Toggle-based fields
  if (fieldType.includes('toggle')) {
    return response.enabled === true;
  }

  // Text fields
  if (fieldType.includes('text') || fieldType.includes('notes')) {
    return !!(response.value || response.notes);
  }

  // Price fields
  if (fieldType.includes('price')) {
    return !!(response.price && parseFloat(response.price) > 0);
  }

  // Quantity fields
  if (fieldType.includes('quantity')) {
    return !!(response.quantity && parseInt(response.quantity) > 0);
  }

  // Dropdown fields
  if (fieldType.includes('dropdown')) {
    return !!(response.selectedOption || response.value);
  }

  // Counter fields
  if (fieldType.includes('counter')) {
    return !!(response.value && parseInt(response.value) > 0);
  }

  // Default: check if any primary fields are populated
  return !!(
    response.value ||
    response.notes ||
    (response.price && parseFloat(response.price) > 0) ||
    (response.quantity && parseInt(response.quantity) > 0) ||
    response.enabled ||
    response.selectedOption
  );
};

/**
 * Extract structured data from a populated field
 */
const extractFieldData = (
  fieldId: string,
  response: any,
  fieldConfig: any
): ExtractedFieldData | null => {
  try {
    const label = fieldConfig.label || fieldConfig.name || fieldId;
    const notes = response.notes || '';
    const price = parseFloat(response.price || '0');
    const quantity = parseInt(response.quantity || '1');
    
    // Build description: field label + notes if available
    let description = label;
    if (notes.trim()) {
      description += ` - ${notes.trim()}`;
    }

    // Handle different field types for value extraction
    let value = response.value;
    
    if (fieldConfig.field_type.includes('dropdown')) {
      value = response.selectedOption || response.value;
    } else if (fieldConfig.field_type.includes('toggle')) {
      value = response.enabled ? 'Yes' : 'No';
    } else if (fieldConfig.field_type.includes('counter')) {
      value = response.value || '0';
    }

    return {
      id: fieldId,
      label,
      value: value || '',
      notes,
      price: Math.max(0, price),
      quantity: Math.max(1, quantity),
      description
    };
  } catch (error) {
    console.error('Error extracting field data:', error);
    return null;
  }
};

/**
 * Format extracted fields for PDF table rows
 */
export const formatFieldsForPDF = (fields: ExtractedFieldData[]): string[][] => {
  return fields
    .filter(field => field.price > 0) // Only include fields with pricing
    .map(field => [
      field.quantity.toString(),
      field.description,
      `£${(field.price / field.quantity).toFixed(2)}`,
      `£${field.price.toFixed(2)}`
    ]);
};