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
    console.log('Starting field extraction for', documentType, 'with', eventForms.length, 'forms');

    // Get all form fields for this tenant to map IDs to labels and settings
    const { data: formFields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (fieldsError) {
      console.error('Error fetching form fields:', fieldsError);
      return [];
    }

    console.log('Found', formFields?.length || 0, 'active form fields');

    // Create lookup map for field data using field ID as key (form responses use field IDs)
    const fieldLookup = new Map(formFields?.map(field => [field.id, field]) || []);
    console.log('Field lookup map keys:', Array.from(fieldLookup.keys()));

    // Process each event form
    for (const eventForm of eventForms) {
      const { form_responses } = eventForm;
      console.log('Processing form:', eventForm.form_label, 'with responses:', form_responses);
      
      if (!form_responses || typeof form_responses !== 'object') continue;

      // Process each field response - field IDs are used as keys in form_responses
      Object.entries(form_responses).forEach(([fieldId, response]) => {
        console.log('Processing field ID:', fieldId, 'with response:', response);
        
        if (!response || typeof response !== 'object') return;

        const fieldConfig = fieldLookup.get(fieldId);
        if (!fieldConfig) {
          console.log('No field config found for field ID:', fieldId);
          return;
        }

        console.log('Found field config:', fieldConfig.name, 'type:', fieldConfig.field_type);

        // Check if field should appear on this document type
        const shouldAppear = documentType === 'quote' 
          ? fieldConfig.appears_on_quote 
          : fieldConfig.appears_on_invoice;

        console.log('Should appear on', documentType, ':', shouldAppear);
        if (!shouldAppear) return;

        // Check if field has any populated data
        const hasValue = isFieldPopulated(response, fieldConfig.field_type);
        console.log('Field has value:', hasValue, 'for field:', fieldConfig.name);
        if (!hasValue) return;

        // Extract field data with form prefix for description
        const extractedField = extractFieldData(fieldId, response, fieldConfig, eventForm.form_label, eventForm.form_id);
        if (extractedField) {
          console.log('Extracted field data:', extractedField);
          extractedFields.push(extractedField);
        }
      });
    }

    console.log('Total extracted fields:', extractedFields.length);
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
  console.log('Checking if field is populated:', fieldType, response);

  // Toggle-based fields - check if enabled
  if (fieldType === 'toggle' || fieldType.includes('toggle')) {
    const isEnabled = response.enabled === true;
    console.log('Toggle field enabled:', isEnabled);
    return isEnabled;
  }

  // Text and textarea fields
  if (fieldType === 'text' || fieldType === 'textarea' || fieldType.includes('text')) {
    const hasText = !!(response.value && response.value.trim());
    console.log('Text field has value:', hasText);
    return hasText;
  }

  // Price fields  
  if (fieldType === 'price' || fieldType.includes('price')) {
    const hasPrice = !!(response.price && parseFloat(response.price) > 0);
    console.log('Price field has value:', hasPrice, response.price);
    return hasPrice;
  }

  // Quantity/number fields
  if (fieldType === 'quantity' || fieldType === 'number' || fieldType.includes('quantity')) {
    const hasQuantity = !!(response.quantity && parseInt(response.quantity) > 0);
    console.log('Quantity field has value:', hasQuantity, response.quantity);
    return hasQuantity;
  }

  // Dropdown/select fields
  if (fieldType === 'dropdown' || fieldType === 'select' || fieldType.includes('dropdown')) {
    const hasSelection = !!(response.selectedOption || response.value);
    console.log('Dropdown field has selection:', hasSelection);
    return hasSelection;
  }

  // Counter fields
  if (fieldType === 'counter' || fieldType.includes('counter')) {
    const hasCount = !!(response.value && parseInt(response.value) > 0);
    console.log('Counter field has value:', hasCount);
    return hasCount;
  }

  // Notes fields
  if (fieldType === 'notes' && response.notes && response.notes.trim()) {
    console.log('Notes field has content');
    return true;
  }

  // Default: check if any primary fields are populated
  const hasAnyValue = !!(
    (response.value && response.value.toString().trim()) ||
    (response.notes && response.notes.trim()) ||
    (response.price && parseFloat(response.price) > 0) ||
    (response.quantity && parseInt(response.quantity) > 0) ||
    response.enabled === true ||
    response.selectedOption
  );
  
  console.log('Default check - field has any value:', hasAnyValue);
  return hasAnyValue;
};

/**
 * Extract structured data from a populated field
 */
const extractFieldData = (
  fieldId: string,
  response: any,
  fieldConfig: any,
  formLabel?: string,
  formId?: string
): ExtractedFieldData | null => {
  try {
    console.log('Extracting field data for field ID:', fieldId, 'config:', fieldConfig);
    
    const label = fieldConfig.name || fieldId;
    const notes = response.notes || '';
    const price = parseFloat(response.price || fieldConfig.default_price_gbp || '0');
    const quantity = parseInt(response.quantity || '1');
    
    // Build description: form name + field name + notes if available (remove " Form" suffix)
    const cleanFormLabel = formLabel?.replace(/ Form$/, '') || '';
    let description = cleanFormLabel ? `${cleanFormLabel} - ${label}` : label;
    if (notes.trim()) {
      description += ` - ${notes.trim()}`;
    }

    // Handle different field types for value extraction
    let value = response.value;
    
    if (fieldConfig.field_type === 'dropdown' || fieldConfig.field_type.includes('dropdown')) {
      value = response.selectedOption || response.value;
    } else if (fieldConfig.field_type === 'toggle' || fieldConfig.field_type.includes('toggle')) {
      value = response.enabled ? 'Yes' : 'No';
    } else if (fieldConfig.field_type === 'counter' || fieldConfig.field_type.includes('counter')) {
      value = response.value || '0';
    } else if (fieldConfig.field_type === 'price') {
      value = `£${price.toFixed(2)}`;
    }

    const extractedData = {
      id: `${formId || 'unknown'}-${fieldId}`, // Make ID unique by combining form ID and field ID
      label,
      value: value || '',
      notes,
      price: Math.max(0, price),
      quantity: Math.max(1, quantity),
      description
    };
    
    console.log('Extracted field data result:', extractedData);
    return extractedData;
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
      `£${field.price.toFixed(2)}`
    ]);
};