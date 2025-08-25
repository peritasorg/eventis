import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface LineItem {
  quantity: number;
  description: string;
  price: number;
  total: number;
}

interface TemplateData {
  // Business/Tenant info
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  
  // Customer info
  customer_name: string;
  customer_address: string;
  customer_postcode: string;
  customer_phone: string;
  customer_email: string;
  
  // Event info
  event_name: string;
  event_date: string;
  event_time: string;
  guest_count: string | number;
  
  // Financial info
  subtotal: number;
  total: number;
  deductible_deposit_amount: number;
  refundable_deposit_amount: number;
  balance_due: number;
  
  // Document info
  document_number: string;
  document_date: string;
  due_date?: string;
  
  // Line items for table
  line_items: LineItem[];
  
  // Additional fields
  notes?: string;
  terms?: string;
}

interface SpecificationLineItem {
  field_name: string;
  field_value: string;
  notes?: string;
}

interface SpecificationTemplateData {
  business_name: string;
  customer_name: string;
  title: string; // Add title field
  event_name: string;
  event_date: string;
  event_time: string;
  today: string; // Add today field
  ethnicity: string; // Add ethnicity field
  guest_count: number;
  men_count: number; // Add men_count field
  ladies_count: number; // Add ladies_count field
  guest_mixture: string; // Add guest_mixture field
  specification_items: SpecificationLineItem[];
  line_items: Array<{
    field_name: string;
    field_value: string;
    notes: string;
    quantity: number;
    price: number;
  }>; // Add line_items for template compatibility
  notes: string;
  created_date: string;
}

export class WordTemplateGenerator {
  private static async downloadTemplate(templateName: string): Promise<ArrayBuffer> {
    const { data, error } = await supabase.storage
      .from('word-templates')
      .download(templateName);
    
    if (error) {
      throw new Error(`Failed to download template: ${error.message}`);
    }
    
    return await data.arrayBuffer();
  }

  private static async extractLineItems(eventForms: any[], tenantId: string, documentType: 'quote' | 'invoice', eventData?: any): Promise<LineItem[]> {
    const lineItems: LineItem[] = [];
    
    // Add guest pricing line items first
    eventForms.forEach(form => {
      if (form.guest_price_total > 0) {
        const guestCount = (form.men_count || 0) + (form.ladies_count || 0);
        // guest_price_total is already the total price, not per-person
        const totalPrice = parseFloat(form.guest_price_total);
        
        console.log(`Guest pricing for ${form.form_label}: ${guestCount} guests - Total: £${totalPrice}`);
        
        // Remove " Form" suffix and handle empty labels
        const cleanFormLabel = form.form_label?.replace(/ Form$/, '') || 
          (eventData?.event_type ? eventData.event_type.charAt(0).toUpperCase() + eventData.event_type.slice(1) : 'Event');
        
        lineItems.push({
          quantity: guestCount,
          description: `${cleanFormLabel} - Guest Pricing`,
          price: totalPrice, // Use the total price directly for Word document
          total: totalPrice // Use the actual total, not multiplied
        });
      }
    });

    // Use the working smart field extractor for populated fields
    try {
      const { extractPopulatedFields } = await import('@/utils/smartFieldExtractor');
      const populatedFields = await extractPopulatedFields(eventForms, tenantId, documentType);
      
      // Convert extracted fields to line items format
      populatedFields.forEach(field => {
        lineItems.push({
          quantity: field.quantity,
          description: field.description,
          price: field.price,
          total: field.quantity * field.price
        });
      });
    } catch (error) {
      console.error('Error extracting populated fields:', error);
    }
    
    return lineItems;
  }

  private static async mapEventDataToTemplate(
    eventData: any, 
    tenantData: any, 
    eventForms: any[],
    documentType: 'quote' | 'invoice',
    tenantId: string
  ): Promise<TemplateData> {
    const lineItems = await this.extractLineItems(eventForms, tenantId, documentType, eventData);
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    
    // Generate document number
    const documentNumber = documentType === 'quote' 
      ? `Q-${eventData.id.slice(0, 8).toUpperCase()}`
      : `INV-${eventData.id.slice(0, 8).toUpperCase()}`;
    
    return {
      // Business/Tenant info
      business_name: tenantData.business_name || 'Business Name',
      business_address: [
        tenantData.address_line1,
        tenantData.address_line2,
        tenantData.city,
        tenantData.postal_code,
        tenantData.country
      ].filter(Boolean).join(', ') || 'Business Address',
      business_phone: tenantData.contact_phone || '',
      business_email: tenantData.contact_email || '',
      
      // Customer info
      customer_name: eventData.customers?.name || eventData.primary_contact_name || 'Customer Name',
      customer_address: eventData.customers ? [
        eventData.customers.address_line1,
        eventData.customers.address_line2,
        eventData.customers.city
      ].filter(Boolean).join(', ') || 'Customer Address' : 'Customer Address',
      customer_postcode: eventData.customers?.postal_code || '',
      customer_phone: eventData.customers?.phone || eventData.primary_contact_number || '',
      customer_email: eventData.customers?.email || 'customer@email.com',
      
      // Event info
      event_name: eventData.title || 'Event',
      event_date: eventData.event_date ? new Date(eventData.event_date).toLocaleDateString('en-GB') : '',
      event_time: eventForms && eventForms.length > 1 
        ? eventForms.map(form => `${form.start_time || 'TBD'} - ${form.end_time || 'TBD'}`).join(' & ')
        : (eventForms && eventForms.length === 1 && (eventForms[0].start_time || eventForms[0].end_time))
          ? `${eventForms[0].start_time || 'TBD'} - ${eventForms[0].end_time || 'TBD'}`
          : `${eventData.start_time || 'TBD'} - ${eventData.end_time || 'TBD'}`,
      guest_count: eventForms && eventForms.length > 1
        ? eventForms.map(form => String((form.men_count || 0) + (form.ladies_count || 0))).join(' & ')
        : String((eventData.men_count || 0) + (eventData.ladies_count || 0)),
      
      // Financial info
      subtotal: subtotal,
      total: subtotal,
      deductible_deposit_amount: parseFloat(eventData.deductible_deposit_gbp) || 0,
      refundable_deposit_amount: parseFloat(eventData.refundable_deposit_gbp) || 0,
      balance_due: subtotal - (parseFloat(eventData.deductible_deposit_gbp) || 0), // Only deductible deposit reduces balance
      
      // Document info
      document_number: documentNumber,
      document_date: new Date().toLocaleDateString(),
      due_date: documentType === 'invoice' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        : undefined,
      
      // Line items
      line_items: lineItems,
      
      // Additional fields
      notes: eventData.notes || '',
      terms: documentType === 'invoice' 
        ? 'Payment is due within 30 days of invoice date.'
        : 'This quote is valid for 30 days from the date issued.'
    };
  }

  static async generateDocument(
    eventData: any,
    tenantData: any,
    eventForms: any[],
    documentType: 'quote' | 'invoice',
    templateName: string = 'Invoice Template.docx',
    tenantId?: string
  ): Promise<void> {
    try {
      // Always fetch current customer data if customer_id exists
      let enrichedEventData = { ...eventData };
      if (eventData.customer_id) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', eventData.customer_id)
            .single();
          
          if (customerData) {
            enrichedEventData.customers = customerData;
          } else {
            // Clear customer data if customer not found
            enrichedEventData.customers = null;
          }
        } catch (error) {
          console.warn('Could not fetch customer data:', error);
          enrichedEventData.customers = null;
        }
      } else {
        // Clear customer data if no customer_id
        enrichedEventData.customers = null;
      }

      // Download the template
      const templateBuffer = await this.downloadTemplate(templateName);
      
      // Load template into PizZip
      const zip = new PizZip(templateBuffer);
      
      // Map event data to template format
      const templateData = await this.mapEventDataToTemplate(enrichedEventData, tenantData, eventForms, documentType, tenantId || '');
      
      // Enhanced template data for debugging and additional fields
      const enhancedTemplateData = {
        ...templateData,
        today: new Date().toLocaleDateString('en-GB'),
        event_type: enrichedEventData.event_type || 'Event',
        remaining_balance: templateData.balance_due,
        // Add formatted currency values for compatibility
        subtotal_formatted: `£${templateData.subtotal.toFixed(2)}`,
        total_formatted: `£${templateData.total.toFixed(2)}`,
        deductible_deposit_formatted: `£${templateData.deductible_deposit_amount.toFixed(2)}`,
        refundable_deposit_formatted: `£${templateData.refundable_deposit_amount.toFixed(2)}`,
        balance_formatted: `£${templateData.balance_due.toFixed(2)}`,
        remaining_balance_formatted: `£${templateData.balance_due.toFixed(2)}`,
      };

      // Debug log the data being passed to template
      console.log('Template data being passed to Word document:', {
        line_items_count: enhancedTemplateData.line_items.length,
        subtotal: enhancedTemplateData.subtotal,
        customer_name: enhancedTemplateData.customer_name,
        event_type: enhancedTemplateData.event_type,
        line_items: enhancedTemplateData.line_items
      });
      
      // Use docxtemplater for simple {placeholder} format
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      doc.render(enhancedTemplateData);
      
      // Generate the document
      const output = zip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      // Download the file with customer name
      const customerName = enrichedEventData.customers?.name || enrichedEventData.primary_contact_name || 'Customer';
      const prefix = documentType === 'quote' ? 'QT' : 'INV';
      const fileName = `${prefix} - ${customerName}.docx`;
      saveAs(output, fileName);
      
    } catch (error) {
      console.error('Error generating document:', error);
      throw new Error(`Failed to generate ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async processContentControls(zip: PizZip, templateData: TemplateData): Promise<void> {
    try {
      let documentXml = zip.files['word/document.xml']?.asText() || '';
      
      // Create a mapping from Content Control names to values
      const dataMapping = this.createContentControlMapping(templateData);
      
      // Replace Content Controls with actual values
      const sdtRegex = /<w:sdt[^>]*>.*?<\/w:sdt>/gs;
      
      documentXml = documentXml.replace(sdtRegex, (match) => {
        // Extract the Content Control identifier (alias, tag, or ID)
        let controlName = '';
        
        // Try alias first
        const aliasMatch = match.match(/<w:alias\s+w:val="([^"]+)"/);
        if (aliasMatch) {
          controlName = aliasMatch[1];
        } else {
          // Try tag as fallback
          const tagMatch = match.match(/<w:tag\s+w:val="([^"]+)"/);
          if (tagMatch) {
            controlName = tagMatch[1];
          }
        }
        
        // Get the value for this control
        const value = dataMapping[controlName] || '';
        
        // Extract the existing text content to preserve formatting
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        if (textMatch) {
          // Replace the text content while preserving the structure
          return match.replace(/<w:t[^>]*>[^<]*<\/w:t>/, `<w:t>${this.escapeXml(String(value))}</w:t>`);
        }
        
        // If no text element found, create one
        const runMatch = match.match(/<w:r[^>]*>.*?<\/w:r>/s);
        if (runMatch) {
          return match.replace(runMatch[0], `<w:r><w:t>${this.escapeXml(String(value))}</w:t></w:r>`);
        }
        
        return match; // Return unchanged if we can't process it
      });
      
      // Update the document XML in the zip
      zip.files['word/document.xml'] = {
        ...zip.files['word/document.xml'],
        asText: () => documentXml
      } as any;
      
    } catch (error) {
      console.error('Error processing Content Controls:', error);
      throw error;
    }
  }

  private static createContentControlMapping(templateData: TemplateData): Record<string, string | number> {
    // Create a comprehensive mapping of all possible Content Control names to template data
    return {
      // Business/Tenant info
      'business_name': templateData.business_name,
      'business_address': templateData.business_address,
      'business_phone': templateData.business_phone,
      'business_email': templateData.business_email,
      
      // Customer info
      'customer_name': templateData.customer_name,
      'customer_address': templateData.customer_address,
      'customer_phone': templateData.customer_phone,
      'customer_email': templateData.customer_email,
      
      // Event info
      'event_name': templateData.event_name,
      'event_date': templateData.event_date,
      'event_time': templateData.event_time,
      'guest_count': templateData.guest_count,
      
      // Financial info
      'subtotal': `£${templateData.subtotal.toFixed(2)}`,
      'total': `£${templateData.total.toFixed(2)}`,
      'deductible_deposit_amount': `£${templateData.deductible_deposit_amount.toFixed(2)}`,
      'refundable_deposit_amount': `£${templateData.refundable_deposit_amount.toFixed(2)}`,
      'balance_due': `£${templateData.balance_due.toFixed(2)}`,
      'remaining_balance': `£${templateData.balance_due.toFixed(2)}`,
      
      // Document info
      'document_number': templateData.document_number,
      'document_date': templateData.document_date,
      'due_date': templateData.due_date || '',
      
      // Additional fields
      'notes': templateData.notes || '',
      'terms': templateData.terms || '',
      
      // Common alternative naming patterns
      'BusinessName': templateData.business_name,
      'CustomerName': templateData.customer_name,
      'EventName': templateData.event_name,
      'EventDate': templateData.event_date,
      'Total': `£${templateData.total.toFixed(2)}`,
      'Subtotal': `£${templateData.subtotal.toFixed(2)}`,
      'DeductibleDepositAmount': `£${templateData.deductible_deposit_amount.toFixed(2)}`,
      'RefundableDepositAmount': `£${templateData.refundable_deposit_amount.toFixed(2)}`,
      'BalanceDue': `£${templateData.balance_due.toFixed(2)}`,
      'RemainingBalance': `£${templateData.balance_due.toFixed(2)}`,
      'DocumentNumber': templateData.document_number,
      'DocumentDate': templateData.document_date,
    };
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static async extractSpecificationLineItems(
    eventForms: any[], 
    tenantId: string, 
    selectedFormId?: string, 
    selectedFieldIds?: string[]
  ): Promise<SpecificationLineItem[]> {
    const items: SpecificationLineItem[] = [];
    
    console.log('🚀 Starting specification extraction:', { 
      eventForms: eventForms.length, 
      tenantId, 
      selectedFormId, 
      selectedFieldIds 
    });

    if (!Array.isArray(eventForms) || eventForms.length === 0) {
      console.log('❌ No event forms provided');
      return items;
    }

    if (!tenantId) {
      console.error('❌ Tenant ID is required for extracting specification items');
      return items;
    }

    // Must have selected fields for specification generation
    if (!selectedFieldIds || selectedFieldIds.length === 0) {
      console.log('❌ No selected fields provided - cannot generate specification');
      return items;
    }

    // Filter to only process the selected form if specified
    const formsToProcess = selectedFormId 
      ? eventForms.filter(form => form.form_id === selectedFormId)
      : eventForms;

    if (formsToProcess.length === 0) {
      console.log('❌ No forms match the selected form ID or no forms to process');
      return items;
    }

    console.log(`✅ Processing ${formsToProcess.length} forms for specification`);

    try {
      // STEP 1: Get the form's field ordering structure
      let orderedFieldIds: string[] = [];
      
      if (selectedFormId) {
        console.log('🔍 Getting field order from form structure:', selectedFormId);
        
        const { data: formStructure, error: formError } = await supabase
          .from('forms')
          .select('sections')
          .eq('id', selectedFormId)
          .eq('tenant_id', tenantId)
          .single();

        if (!formError && formStructure?.sections) {
          const sections = Array.isArray(formStructure.sections) ? formStructure.sections : [];
          console.log('📋 Form sections found:', sections.length);
          
          // Sort sections by their order field to maintain proper sequence
          const sortedSections = sections.sort((a, b) => {
            const orderA = (a && typeof a === 'object' && 'order' in a) ? (a as any).order || 0 : 0;
            const orderB = (b && typeof b === 'object' && 'order' in b) ? (b as any).order || 0 : 0;
            return orderA - orderB;
          });
          console.log('🔄 Sorted sections by order field');
          
          // Extract field IDs from all sections in correct order
          for (const section of sortedSections) {
            if (section && typeof section === 'object' && 'field_ids' in section) {
              const fieldIds = (section as any).field_ids;
              if (Array.isArray(fieldIds)) {
                orderedFieldIds.push(...fieldIds);
                console.log('📄 Section fields added:', fieldIds.length, 'from order:', (section as any).order || 0);
              }
            }
          }
          console.log('✅ Complete field order from form:', orderedFieldIds.length, 'fields');
        } else {
          console.log('❌ Could not get form structure:', formError?.message);
        }
      }

      // STEP 2: Get field definitions
      const { data: formFields, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching form fields:', error);
        return items;
      }

      if (!formFields || formFields.length === 0) {
        console.log('❌ No form fields found for tenant');
        return items;
      }

      // Create field lookup map
      const fieldLookup = new Map(formFields.map(field => [field.id, field]));

      // STEP 3: Collect responses from forms - only for populated fields
      const populatedFieldResponses = new Map<string, any>();
      
      for (const eventForm of formsToProcess) {
        if (eventForm?.form_responses && typeof eventForm.form_responses === 'object') {
          for (const [fieldId, response] of Object.entries(eventForm.form_responses)) {
            // Only include responses that are populated based on field type
            if (response && typeof response === 'object') {
              const fieldConfig = fieldLookup.get(fieldId);
              if (this.isSpecificationFieldPopulated(response, fieldConfig?.field_type || 'text')) {
                populatedFieldResponses.set(fieldId, response);
              }
            }
          }
        }
      }

      console.log('📊 Populated field responses:', populatedFieldResponses.size);

      // STEP 4: Create final ordered list of fields to process
      // Start with form order, then filter to only selected + populated fields
      let fieldsToProcess: string[] = [];
      
      if (orderedFieldIds.length > 0) {
        // Convert selectedFieldIds to Set for efficient lookup
        const selectedFieldSet = new Set(selectedFieldIds);
        
        // Use form ordering as primary sequence, only include selected and populated fields
        fieldsToProcess = orderedFieldIds.filter(fieldId => 
          selectedFieldSet.has(fieldId) && populatedFieldResponses.has(fieldId)
        );
        console.log('✅ Using form order - orderedFieldIds length:', orderedFieldIds.length);
        console.log('✅ Selected fields:', selectedFieldIds.length, selectedFieldIds);
        console.log('✅ Final ordered fields to process:', fieldsToProcess.length, fieldsToProcess);
      } else {
        // Fallback to selected field order if no form structure available
        fieldsToProcess = selectedFieldIds.filter(fieldId => populatedFieldResponses.has(fieldId));
        console.log('⚠️ Using config order - selected + populated fields:', fieldsToProcess);
      }

      // CRITICAL VALIDATION: Final check that we only process exactly what was selected
      console.log('🎯 FINAL VALIDATION:', {
        fieldsFound: fieldsToProcess.length,
        selectedCount: selectedFieldIds.length,
        finalFields: fieldsToProcess
      });

      // Track processed field names to avoid duplicates
      const processedFieldNames = new Set<string>();

      // STEP 5: Process each field response in the correct order
      for (const fieldId of fieldsToProcess) {
        try {
          const response = populatedFieldResponses.get(fieldId);
          const fieldConfig = fieldLookup.get(fieldId);
          
          if (!fieldConfig) {
            console.log('❌ Field config not found for:', fieldId);
            continue;
          }

          // Skip if we've already processed a field with this name (avoid duplicates)
          if (processedFieldNames.has(fieldConfig.name)) {
            console.log('⚠️ Skipping duplicate field:', fieldConfig.name);
            continue;
          }

          // Check if this field should be included in specification
          console.log('🔍 Checking field for specification:', {
            fieldName: fieldConfig.name,
            fieldType: fieldConfig.field_type,
            response: response
          });
          
          if (this.isSpecificationFieldPopulated(response, fieldConfig.field_type)) {
            console.log('✅ Field is populated, extracting content...');
            const content = this.extractSpecificationFieldContent(response, fieldConfig);
            
            if (content) {
              const item: SpecificationLineItem = {
                field_name: content.field_name,
                field_value: content.field_value,
                notes: String((response as any)?.notes || '').trim(),
              };
              
              items.push(item);
              processedFieldNames.add(fieldConfig.name);
              console.log('✅ Added specification item:', item);
            } else {
              console.log('❌ No content extracted for field:', fieldConfig.name);
            }
          } else {
            console.log('❌ Field not populated:', fieldConfig.name);
          }
        } catch (fieldError) {
          console.error('❌ Error processing field:', fieldId, fieldError);
          // Continue processing other fields instead of failing completely
        }
      }

      console.log('Total specification items extracted:', items.length);
      return items;

    } catch (error) {
      console.error('Error in extractSpecificationLineItems:', error);
      return items; // Return empty array instead of throwing
    }
  }

  private static async mapEventDataToSpecification(
    eventData: any, 
    tenantId: string, 
    specificationLineItems: SpecificationLineItem[], 
    targetEventForm?: any
  ): Promise<SpecificationTemplateData> {
    const { format } = await import('date-fns');
    
    // Comprehensive data validation and sanitization
    const safeString = (value: any, fallback: string = ''): string => {
      if (value === null || value === undefined) return fallback;
      return String(value).trim();
    };

    const safeNumber = (value: any, fallback: number = 0): number => {
      if (value === null || value === undefined) return fallback;
      const num = Number(value);
      return isNaN(num) ? fallback : num;
    };

    const safeDate = (value: any, fallback: string = ''): string => {
      if (!value) return fallback;
      try {
        return format(new Date(value), 'dd/MM/yyyy');
      } catch {
        return fallback;
      }
    };

    console.log('Mapping specification data:', { 
      eventData: eventData?.id, 
      targetEventForm: targetEventForm?.form_label, 
      tenantId 
    });

    // Validate required data
    if (!eventData) {
      throw new Error('Event data is required for specification generation');
    }

    // Fetch customer data properly
    let customerName = 'Customer Name';
    if (eventData.customer_id) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', eventData.customer_id)
          .single();
        
        if (customer?.name) {
          customerName = customer.name;
        }
      } catch (error) {
        console.warn('Could not fetch customer name:', error);
      }
    }

    // Use event record data for main details
    const businessName = safeString(eventData.tenant?.business_name, 'Business Name');
    const eventTitle = safeString(eventData.title, 'Event Name'); // Use title from event record
    const eventDate = safeDate(eventData.event_date, 'TBD');
    const notes = safeString(eventData.notes, 'No additional notes');
    const createdDate = format(new Date(), 'dd/MM/yyyy');
    const todayDate = format(new Date(), 'dd/MM/yyyy');
    
    console.log('🔍 DATE FORMATTING:', {
      createdDate,
      todayDate,
      rawDate: new Date()
    });

    // Extract guest mixture and ethnicity from event record
    const guestMixture = safeString(eventData.guest_mixture, 'Mixed');
    
    // Format ethnicity from event record - handle JSON array format
    let ethnicityDisplay = 'Not specified';
    if (eventData.ethnicity) {
      if (typeof eventData.ethnicity === 'string') {
        ethnicityDisplay = eventData.ethnicity;
      } else if (Array.isArray(eventData.ethnicity)) {
        ethnicityDisplay = eventData.ethnicity.join(', ');
      } else if (typeof eventData.ethnicity === 'object') {
        // If it's an object with ethnicity names, extract them
        ethnicityDisplay = Object.keys(eventData.ethnicity).join(', ');
      }
    }

    // Use target event form data for guest counts and timing (prioritize form data)
    let guestCount = 0;
    let menCount = 0;
    let ladiesCount = 0;
    let eventTime = 'TBD';

    if (targetEventForm) {
      console.log('Using target event form data:', {
        formLabel: targetEventForm.form_label,
        guestCount: targetEventForm.guest_count,
        menCount: targetEventForm.men_count,
        ladiesCount: targetEventForm.ladies_count,
        startTime: targetEventForm.start_time,
        endTime: targetEventForm.end_time
      });

      // Use form data for guest counts
      guestCount = safeNumber(targetEventForm.guest_count);
      menCount = safeNumber(targetEventForm.men_count);
      ladiesCount = safeNumber(targetEventForm.ladies_count);

      // Format event time from form data
      if (targetEventForm.start_time && targetEventForm.end_time) {
        eventTime = `${targetEventForm.start_time} - ${targetEventForm.end_time}`;
      } else if (targetEventForm.start_time) {
        eventTime = targetEventForm.start_time;
      }
    } else {
      // Fallback to event record data if no target form
      console.log('No target form found, using event record data');
      guestCount = safeNumber(eventData.estimated_guests || eventData.guest_count);
      menCount = safeNumber(eventData.men_count);
      ladiesCount = safeNumber(eventData.ladies_count);
      eventTime = safeString(eventData.start_time, 'TBD');
    }

    // Use provided specification line items
    const specificationItems = specificationLineItems || [];

    // Map specification_items to line_items format for template compatibility
    const lineItems = specificationItems.length > 0 
      ? specificationItems.map(item => ({
          field_name: String(item.field_name || ''),
          field_value: String(item.field_value || ''),
          notes: String(item.notes || ''),
          quantity: 1,
          price: 0
        }))
      : [];

    console.log('🔍 SPECIFICATION ITEMS:', specificationItems);
    console.log('🔍 MAPPED LINE ITEMS:', lineItems);

    const templateData: SpecificationTemplateData = {
      business_name: businessName,
      customer_name: customerName,
      title: eventTitle,
      event_name: eventTitle,
      event_date: eventDate,
      event_time: eventTime,
      today: todayDate,
      ethnicity: ethnicityDisplay,
      guest_count: guestCount,
      men_count: menCount,
      ladies_count: ladiesCount,
      guest_mixture: guestMixture,
      specification_items: specificationItems.length > 0 ? specificationItems : [],
      line_items: lineItems,
      notes: notes,
      created_date: createdDate,
    };

    console.log('🔍 TEMPLATE DATA CREATED:', {
      title: templateData.title,
      today: templateData.today,
      line_items_count: templateData.line_items.length,
      line_items: templateData.line_items
    });

    console.log('Generated specification template data:', templateData);

    // Validate the final template data
    this.validateTemplateData(templateData);

    return templateData;
  }

  private static validateTemplateData(data: SpecificationTemplateData): void {
    const requiredFields = ['business_name', 'customer_name', 'event_name', 'event_date', 'created_date'];
    
    for (const field of requiredFields) {
      if (!data[field as keyof SpecificationTemplateData]) {
        console.warn(`Template field '${field}' is empty, using fallback`);
      }
    }

    if (!Array.isArray(data.specification_items)) {
      throw new Error('Specification items must be an array');
    }

    console.log('Template data validation passed');
  }

  static async generateSpecificationDocument(
    eventData: any, 
    tenantId: string, 
    eventForms: any[],
    selectedFormId?: string
  ): Promise<void> {
    try {
      console.log('Starting specification document generation...', { eventData: eventData?.id, tenantId });
      
      const templateName = `${tenantId}-specification-template.docx`;
      
      // Fetch specification configuration to get selected fields
      const { data: specConfig, error: configError } = await supabase
        .from('specification_template_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching specification config:', configError);
        throw new Error('Failed to load specification configuration. Please configure your specification settings first.');
      }

      const selectedFieldIds = Array.isArray(specConfig?.selected_fields) 
        ? specConfig.selected_fields as string[]
        : [];
      const configuredFormId = specConfig?.form_id || selectedFormId;
      
      console.log('Using specification config:', { 
        formId: configuredFormId, 
        selectedFields: selectedFieldIds.length 
      });

      // Get the specific event form data for the configured form ID
      const targetEventForm = configuredFormId 
        ? eventForms.find(form => form.form_id === configuredFormId)
        : null;

      if (!targetEventForm && configuredFormId) {
        console.warn('Configured form not found in event forms:', configuredFormId);
      }
      
      console.log('Target event form for specification:', targetEventForm?.form_label);
      
      // Download the template
      const templateData = await this.downloadTemplate(templateName);
      console.log('Template downloaded successfully');
      
      // Pre-validate template syntax before processing
      try {
        await this.validateTemplateSyntaxAdvanced(templateData);
        console.log('Template syntax validation passed');
      } catch (syntaxError: any) {
        console.error('Template syntax validation failed:', syntaxError);
        
        // Provide specific guidance for common template issues
        if (syntaxError.message.includes('line_items')) {
          throw new Error(`Word Template Fix Required: Your template has {#line_items} loop tags but is missing {/line_items} closing tags.

To fix this:
1. Open your Word template: ${templateName}
2. Find all {#line_items} tags in the document
3. Add a {/line_items} closing tag after each table/section that should repeat
4. Save the template and try again

Current issue: ${syntaxError.message}`);
        } else {
          throw new Error(`Template syntax error: ${syntaxError.message}. Please check your Word template for unclosed loops.`);
        }
      }
      
      // Extract and map specification data with selected fields filter
      const specificationLineItems = await this.extractSpecificationLineItems(
        eventForms, 
        tenantId, 
        configuredFormId, 
        selectedFieldIds as string[]
      );
      const mappedData = await this.mapEventDataToSpecification(eventData, tenantId, specificationLineItems, targetEventForm);
      
      console.log('Mapped specification data:', mappedData);
      
      // Create ZIP from template with enhanced error handling
      let zip: PizZip;
      try {
        zip = new PizZip(templateData);
      } catch (zipError: any) {
        console.error('Failed to parse template file:', zipError);
        throw new Error('Template file is corrupted or invalid. Please re-upload your Word template.');
      }
      
      // Create docxtemplater instance with comprehensive error handling
      let doc: any;
      try {
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter() {
            return '';
          },
          errorLogging: true
        });
        
        // Advanced template structure validation
        await this.validateTemplateStructureAdvanced(doc, await mappedData);
        console.log('Advanced template validation passed');
        
      } catch (templateError: any) {
        console.error('Template initialization error:', templateError);
        const analysisResult = this.analyzeTemplateError(templateError);
        throw new Error(`Template Error: ${analysisResult.userMessage}\n\nTechnical Details: ${analysisResult.technicalDetails}`);
      }
      
      // Set template data with validation
      try {
        const finalTemplateData = await mappedData;
        console.log('🔍 FINAL TEMPLATE DATA BEING SENT TO DOCXTEMPLATER:', JSON.stringify(finalTemplateData, null, 2));
        console.log('🔍 Title field:', finalTemplateData.title);
        console.log('🔍 Today field:', finalTemplateData.today);
        console.log('🔍 Line items array:', finalTemplateData.line_items);
        console.log('🔍 Line items length:', finalTemplateData.line_items?.length);
        
        doc.setData(finalTemplateData);
      } catch (dataError: any) {
        console.error('Data mapping error:', dataError);
        throw new Error('Failed to map data to template. Please check your template placeholders match the expected data structure.');
      }
      
      // Render the document with comprehensive error handling
      try {
        doc.render();
      } catch (renderError: any) {
        console.error('Template rendering error:', renderError);
        const analysisResult = this.analyzeTemplateError(renderError);
        
        // If it's an unclosed loop error, provide specific guidance
        if (renderError.message?.includes('Unclosed loop') || renderError.name === 'TemplateError') {
          throw new Error(`Template Syntax Error: Your Word template has unclosed loop tags. Please open your template in Microsoft Word and ensure every {#line_items} tag has a matching {/line_items} closing tag.\n\nDetailed Error: ${analysisResult.userMessage}`);
        }
        
        throw new Error(`Template Rendering Error: ${analysisResult.userMessage}\n\nTechnical Details: ${analysisResult.technicalDetails}`);
      }
      
      // Generate output
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      // Download the file
      const customerName = eventData.customers?.name || eventData.primary_contact_name || 'Customer';
      const fileName = `SPEC - ${customerName}.docx`;
      saveAs(output, fileName);
      
      console.log('Specification document generated and downloaded successfully');
      
    } catch (error) {
      console.error('Error generating specification document:', error);
      console.error('Error context:', {
        eventData: eventData?.id,
        eventFormsCount: eventForms?.length,
        tenantId,
        templateName: `${tenantId}-specification-template.docx`
      });
      
      // Re-throw with enhanced error message
      if (error instanceof Error) {
        throw error; // Preserve our detailed error messages
      } else {
        throw new Error(`Unexpected error during specification generation: ${String(error)}`);
      }
    }
  }

  private static async validateTemplateStructureAdvanced(doc: any, templateData: any): Promise<void> {
    try {
      // Get template tags/placeholders
      const templateTags = doc.getFullText().match(/\{[^}]+\}/g) || [];
      console.log('Template placeholders found:', templateTags);
      
      // Check for unclosed loops
      const loopTags = templateTags.filter((tag: string) => tag.includes('#') || tag.includes('/'));
      const openLoops = loopTags.filter((tag: string) => tag.includes('#')).map(tag => tag.replace('{#', '').replace('}', ''));
      const closeLoops = loopTags.filter((tag: string) => tag.includes('/')).map(tag => tag.replace('{/', '').replace('}', ''));
      
      console.log('Open loops found:', openLoops);
      console.log('Close loops found:', closeLoops);
      
      // Check for unmatched loops
      const unmatchedLoops = openLoops.filter(loop => !closeLoops.includes(loop));
      if (unmatchedLoops.length > 0) {
        throw new Error(`Unclosed loops detected: ${unmatchedLoops.join(', ')}. Each {#${unmatchedLoops[0]}} tag must have a matching {/${unmatchedLoops[0]}} tag.`);
      }
      
      // Check if all required data is present
      const dataKeys = this.getAllNestedKeys(templateData);
      console.log('Available data keys:', dataKeys);
      
      // Check for critical missing data
      const criticalTags = templateTags.filter((tag: string) => {
        const cleanTag = tag.replace(/[{}#/]/g, '');
        return ['line_items', 'specification_items'].includes(cleanTag);
      });
      
      console.log('Critical template tags:', criticalTags);
      
      // Ensure required array data exists
      if (!templateData.line_items) {
        templateData.line_items = [];
        console.log('Added empty line_items array to template data');
      }
      
      if (!templateData.specification_items) {
        templateData.specification_items = [];
        console.log('Added empty specification_items array to template data');
      }
      
    } catch (error) {
      console.error('Advanced template validation error:', error);
      throw error; // Re-throw validation errors
    }
  }

  private static async validateTemplateSyntaxAdvanced(templateBuffer: ArrayBuffer): Promise<void> {
    try {
      // Create a test zip to parse the template
      const zip = new PizZip(templateBuffer);
      
      // Extract document.xml content for analysis
      const docXml = zip.files['word/document.xml'];
      if (!docXml) {
        throw new Error('Invalid Word template: missing document.xml');
      }
      
      let xmlContent = docXml.asText();
      
      // Check for basic XML structure issues
      if (!xmlContent.includes('<w:document')) {
        throw new Error('Invalid Word template: corrupted document structure');
      }
      
      console.log('Template validation: Starting advanced XML analysis...');
      
      // Clean up Word's XML fragmentation - merge split text runs that contain template tags
      // This handles cases where Word splits {#line_items} across multiple <w:t> elements
      xmlContent = this.reconstructFragmentedTags(xmlContent);
      
      // Extract and validate loop tags using comprehensive approach
      const loopAnalysis = this.analyzeLoopTags(xmlContent);
      
      console.log('Template validation results:', loopAnalysis);
      
      if (loopAnalysis.unmatchedOpens.length > 0) {
        // Provide more specific guidance based on the detected issues
        const uniqueUnmatched = [...new Set(loopAnalysis.unmatchedOpens)]; // Remove duplicates
        const duplicateCount = loopAnalysis.unmatchedOpens.length - uniqueUnmatched.length;
        
        let errorMessage = `Unclosed loop tags found: {#${uniqueUnmatched.join('}, {#')}}. Please add matching closing tags: {/${uniqueUnmatched.join('}, {/')}}`;
        
        if (duplicateCount > 0) {
          errorMessage += `\n\nNote: Found ${duplicateCount + uniqueUnmatched.length} total {#${uniqueUnmatched[0]}} tags but ${loopAnalysis.closeLoops.filter(c => uniqueUnmatched.includes(c)).length} closing tags. Each opening tag needs a closing tag.`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (loopAnalysis.unmatchedCloses.length > 0) {
        throw new Error(`Orphaned closing tags found: {/${loopAnalysis.unmatchedCloses.join('}, {/')}}. These have no matching opening tags.`);
      }
      
      // Test basic docxtemplater instantiation with minimal validation
      try {
        const testDoc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter() { return ''; },
          errorLogging: false  // Disable verbose error logging for test
        });
        
        // Test with minimal data structure
        testDoc.setData({
          line_items: [],
          specification_items: [],
          business_name: 'Test',
          customer_name: 'Test',
          event_name: 'Test'
        });
        
        console.log('Template validation: basic instantiation successful');
        
      } catch (instantiationError: any) {
        console.error('Template instantiation test failed:', instantiationError);
        
        // Provide specific guidance based on error type
        if (instantiationError.message?.includes('Unclosed loop')) {
          throw new Error(`Template contains loop syntax errors. Please open your Word template and verify that every {#tag} has a proper {/tag} closing. Common issue: formatting changes can split tags across text runs.`);
        } else if (instantiationError.name === 'TemplateError') {
          throw new Error(`Template syntax validation failed: ${instantiationError.message}. Please check your template for malformed placeholders or loops.`);
        } else {
          throw new Error(`Template validation error: ${instantiationError.message}`);
        }
      }
      
    } catch (error: any) {
      console.error('Advanced template syntax validation failed:', error);
      throw error;
    }
  }

  /**
   * Reconstructs template tags that may be fragmented across Word XML text runs
   */
  private static reconstructFragmentedTags(xmlContent: string): string {
    // Word often splits template tags across multiple <w:t> elements due to formatting
    // We need to reconstruct them for proper validation
    
    // Step 1: Extract all text content from <w:t> elements while preserving order
    const textElements = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    let reconstructedText = '';
    
    textElements.forEach(element => {
      const textMatch = element.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
      if (textMatch) {
        reconstructedText += textMatch[1];
      }
    });
    
    console.log('Reconstructed template text for validation:', reconstructedText.substring(0, 500) + '...');
    
    return reconstructedText;
  }

  /**
   * Analyzes loop tags in the template content
   */
  private static analyzeLoopTags(content: string): {
    openLoops: string[];
    closeLoops: string[];
    unmatchedOpens: string[];
    unmatchedCloses: string[];
  } {
    // Use more flexible regex patterns to catch template tags
    const loopOpenPattern = /\{#([^}]+)\}/g;
    const loopClosePattern = /\{\/([^}]+)\}/g;
    
    const openLoops: string[] = [];
    const closeLoops: string[] = [];
    
    let match;
    while ((match = loopOpenPattern.exec(content)) !== null) {
      const loopName = match[1].trim();
      if (loopName) {
        openLoops.push(loopName);
      }
    }
    
    // Reset regex lastIndex
    loopClosePattern.lastIndex = 0;
    while ((match = loopClosePattern.exec(content)) !== null) {
      const loopName = match[1].trim();
      if (loopName) {
        closeLoops.push(loopName);
      }
    }
    
    console.log('Loop analysis:', {
      openLoops,
      closeLoops,
      openCount: openLoops.length,
      closeCount: closeLoops.length
    });
    
    // Count occurrences for proper matching
    const openCounts: { [key: string]: number } = {};
    const closeCounts: { [key: string]: number } = {};
    
    openLoops.forEach(loop => {
      openCounts[loop] = (openCounts[loop] || 0) + 1;
    });
    
    closeLoops.forEach(loop => {
      closeCounts[loop] = (closeCounts[loop] || 0) + 1;
    });
    
    // Find unmatched loops based on counts
    const unmatchedOpens: string[] = [];
    const unmatchedCloses: string[] = [];
    
    Object.entries(openCounts).forEach(([loop, openCount]) => {
      const closeCount = closeCounts[loop] || 0;
      if (openCount > closeCount) {
        // Add the unmatched opens
        for (let i = 0; i < openCount - closeCount; i++) {
          unmatchedOpens.push(loop);
        }
      }
    });
    
    Object.entries(closeCounts).forEach(([loop, closeCount]) => {
      const openCount = openCounts[loop] || 0;
      if (closeCount > openCount) {
        // Add the unmatched closes
        for (let i = 0; i < closeCount - openCount; i++) {
          unmatchedCloses.push(loop);
        }
      }
    });
    
    return {
      openLoops,
      closeLoops,
      unmatchedOpens,
      unmatchedCloses
    };
  }

  private static getAllNestedKeys(obj: any, prefix: string = ''): string[] {
    let keys: string[] = [];
    
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          keys = keys.concat(this.getAllNestedKeys(obj[key], fullKey));
        }
      });
    }
    
    return keys;
  }

  private static isSpecificationFieldPopulated(response: any, fieldType: string): boolean {
    if (!response || typeof response !== 'object') {
      console.log('Invalid response object');
      return false;
    }

    console.log('Checking if field is populated:', { fieldType, response });

    // Handle different field types
    switch (fieldType) {
      case 'toggle':
        // For toggle fields, must be enabled AND might have notes
        const isTogglePopulated = response.enabled === true;
        console.log('Toggle field populated:', isTogglePopulated);
        return isTogglePopulated;

      case 'text':
      case 'textarea':
        // For text fields, check both value and notes
        const hasTextValue = !!(
          (response.value && String(response.value).trim()) ||
          (response.notes && String(response.notes).trim())
        );
        console.log('Text field populated:', hasTextValue);
        return hasTextValue;

      case 'text_notes_only':
        // For text_notes_only fields, ONLY check notes (this is the key fix!)
        const hasNotesOnlyValue = !!(response.notes && String(response.notes).trim());
        console.log('Text notes only field populated:', hasNotesOnlyValue);
        return hasNotesOnlyValue;

      case 'price':
        // For price fields, must have a positive price value
        const hasPriceValue = !!(response.price && parseFloat(response.price) > 0);
        console.log('Price field populated:', hasPriceValue);
        return hasPriceValue;

      case 'quantity':
      case 'number':
      case 'counter':
        // For quantity/number fields, must have a positive value
        const hasQuantityValue = !!(
          (response.quantity && parseInt(response.quantity) > 0) ||
          (response.value && parseInt(response.value) > 0)
        );
        console.log('Quantity field populated:', hasQuantityValue);
        return hasQuantityValue;

      case 'dropdown':
      case 'dropdown_options':
      case 'dropdown_options_price_notes':
      case 'select':
        // For dropdown fields, must have a selected value OR notes
        const hasDropdownValue = !!(
          response.selectedOption ||
          (response.value && String(response.value).trim()) ||
          (response.notes && String(response.notes).trim())
        );
        console.log('Dropdown field populated:', hasDropdownValue);
        return hasDropdownValue;

      case 'notes':
        // For notes-only fields, must have notes content
        const hasNotesValue = !!(response.notes && String(response.notes).trim());
        console.log('Notes field populated:', hasNotesValue);
        return hasNotesValue;

      case 'fixed_price_notes':
      case 'fixed_price_notes_toggle':
      case 'fixed_price_quantity_notes':
      case 'per_person_price_notes':
      case 'counter_notes':
        // For fields with pricing and notes, check if enabled or has notes
        const hasPricingFieldValue = !!(
          response.enabled === true ||
          (response.notes && String(response.notes).trim()) ||
          (response.price && parseFloat(response.price) > 0) ||
          (response.quantity && parseInt(response.quantity) > 0)
        );
        console.log('Pricing field populated:', hasPricingFieldValue);
        return hasPricingFieldValue;
    }

    // Default: check if any value exists
    const hasAnyValue = !!(
      (response.value && String(response.value).trim()) ||
      (response.notes && String(response.notes).trim()) ||
      (response.price && parseFloat(response.price) > 0) ||
      (response.quantity && parseInt(response.quantity) > 0) ||
      response.enabled === true ||
      response.selectedOption
    );
    
    console.log('Default check - field has any value:', hasAnyValue);
    return hasAnyValue;
  }

  private static extractSpecificationFieldContent(response: any, fieldConfig: any): { field_name: string; field_value: string } | null {
    if (!response || typeof response !== 'object' || !fieldConfig) {
      return null;
    }

    const fieldName = String(fieldConfig.name || 'Unknown Field');
    const fieldType = String(fieldConfig.field_type || 'text');

    console.log('Extracting content for field:', { fieldName, fieldType, response });

    // Handle specific field types based on their primary value
    switch (fieldType) {
      case 'text_notes_only':
        // For text_notes_only fields, ONLY use notes (this is the key fix!)
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        }
        return null;

      case 'toggle':
        // For toggle fields, prioritize notes over enabled status
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        } else if (response.enabled) {
          return { field_name: fieldName, field_value: 'Yes' };
        }
        return null;

      case 'text':
      case 'textarea':
        // For regular text fields, check notes first, then value
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        } else if (response.value && String(response.value).trim()) {
          return { field_name: fieldName, field_value: String(response.value).trim() };
        }
        return null;

      case 'dropdown':
      case 'dropdown_options':
      case 'dropdown_options_price_notes':
      case 'select':
        // For dropdown fields, prioritize notes, then selected value
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        } else {
          const selectedValue = response.selectedOption || response.value;
          if (Array.isArray(selectedValue)) {
            // Handle multiple selections
            const formattedValue = selectedValue.join('; ');
            return { field_name: fieldName, field_value: formattedValue };
          } else if (selectedValue && String(selectedValue).trim()) {
            return { field_name: fieldName, field_value: String(selectedValue).trim() };
          }
        }
        return null;

      case 'fixed_price_notes':
      case 'fixed_price_notes_toggle':
      case 'fixed_price_quantity_notes':
      case 'per_person_price_notes':
      case 'counter_notes':
        // For pricing fields with notes, always prioritize notes
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        } else if (response.enabled) {
          return { field_name: fieldName, field_value: 'Yes' };
        }
        return null;

      case 'price':
        if (response.price && parseFloat(response.price) > 0) {
          return { field_name: fieldName, field_value: `£${parseFloat(response.price).toFixed(2)}` };
        }
        return null;

      case 'quantity':
      case 'number':
        if (response.quantity && parseInt(response.quantity) > 0) {
          return { field_name: fieldName, field_value: String(response.quantity) };
        }
        return null;

      case 'counter':
        if (response.value && parseInt(response.value) > 0) {
          return { field_name: fieldName, field_value: String(response.value) };
        }
        return null;

      case 'notes':
        // For notes-only fields, must have notes content
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        }
        return null;

      default:
        // Default handling - prioritize notes, then values, then enabled status
        if (response.notes && String(response.notes).trim()) {
          return { field_name: fieldName, field_value: String(response.notes).trim() };
        } else if (response.value && String(response.value).trim()) {
          return { field_name: fieldName, field_value: String(response.value).trim() };
        } else if (response.enabled === true) {
          return { field_name: fieldName, field_value: 'Yes' };
        }
        return null;
    }
  }


  private static analyzeTemplateError(error: any): { userMessage: string; technicalDetails: string } {
    console.log('Analyzing template error:', error);
    
    if (!error) {
      return {
        userMessage: 'Unknown template error occurred.',
        technicalDetails: 'No error object provided'
      };
    }
    
    let userMessage = '';
    let technicalDetails = '';
    
    // Handle TemplateError objects
    if (error.name === 'TemplateError' || error.constructor?.name === 'TemplateError') {
      technicalDetails = `TemplateError: ${error.message}`;
      
      if (error.message?.includes('Unclosed loop')) {
        userMessage = 'Your Word template has unclosed loop tags. Please open your template in Microsoft Word and ensure every {#line_items} tag has a matching {/line_items} closing tag. Check all loop sections in your template.';
      } else if (error.message?.includes('Multi error')) {
        userMessage = 'Multiple template syntax errors detected. This typically means you have unclosed loops or invalid placeholders in your Word template. Please review all {#} and {/} tags to ensure they are properly paired.';
        
        // Try to extract specific error details
        if (error.properties && Array.isArray(error.properties.errors)) {
          const errorDetails = error.properties.errors.map((err: any) => {
            if (err.properties?.explanation) {
              return err.properties.explanation;
            }
            if (err.message?.includes('Unclosed loop')) {
              return 'Unclosed loop detected';
            }
            return err.message || 'Unknown error';
          }).join('; ');
          
          technicalDetails += ` | Specific errors: ${errorDetails}`;
          
          if (errorDetails.includes('Unclosed loop')) {
            userMessage = 'Your template contains unclosed loop tags. Please check that every {#line_items} has a corresponding {/line_items} tag. Also verify {#specification_items} has {/specification_items}.';
          }
        }
      } else {
        userMessage = 'Template processing failed due to formatting issues. Please ensure your Word template follows the correct syntax for placeholders and loops.';
      }
    }
    
    // Handle specific error messages
    else if (typeof error.message === 'string') {
      technicalDetails = error.message;
      
      if (error.message.includes('Unclosed loop')) {
        userMessage = 'Template contains unclosed loop tags. Please check that every {#tag} has a corresponding {/tag}. Common issue: {#line_items} without {/line_items}.';
      } else if (error.message.includes('Invalid XML')) {
        userMessage = 'Template file appears to be corrupted or contains invalid formatting. Please re-save your Word template and try again.';
      } else if (error.message.includes('Multi error')) {
        userMessage = 'Multiple template syntax errors detected. This usually indicates unclosed loops like {#line_items} without {/line_items}. Please review your Word template syntax.';
      } else {
        userMessage = 'Template processing error. Please check your Word template for formatting issues or invalid placeholders.';
      }
    }
    
    // Fallback
    else {
      technicalDetails = String(error);
      userMessage = 'Template error occurred during processing. Please verify your Word template syntax and try again.';
    }
    
    return { userMessage, technicalDetails };
  }

  static async analyzeTemplate(templateName: string): Promise<string[]> {
    try {
      const templateBuffer = await this.downloadTemplate(templateName);
      const zip = new PizZip(templateBuffer);
      
      // Extract Word document content from all relevant parts
      const documentXml = zip.files['word/document.xml']?.asText() || '';
      const headerXml = zip.files['word/header1.xml']?.asText() || '';
      const footerXml = zip.files['word/footer1.xml']?.asText() || '';
      
      // Combine all content to search for placeholders
      const allContent = documentXml + headerXml + footerXml;
      const placeholders: string[] = [];
      
      // Search for {placeholder} format
      const placeholderRegex = /\{([^}]+)\}/g;
      let match;
      
      while ((match = placeholderRegex.exec(allContent)) !== null) {
        const placeholder = match[1];
        // Filter out docxtemplater control structures
        if (!placeholder.startsWith('#') && 
            !placeholder.startsWith('/') && 
            !placeholder.startsWith('^') &&
            !placeholders.includes(placeholder)) {
          placeholders.push(placeholder);
        }
      }
      
      console.log('Found placeholders in template:', placeholders);
      return placeholders;
    } catch (error) {
      console.error('Error analyzing template:', error);
      return [];
    }
  }

  private static extractContentControls(xmlContent: string): string[] {
    const contentControls: string[] = [];
    
    try {
      // Extract Content Controls using regex patterns
      // Look for <w:sdt> elements which represent Content Controls
      const sdtRegex = /<w:sdt[^>]*>.*?<\/w:sdt>/gs;
      const sdtMatches = xmlContent.match(sdtRegex) || [];
      
      for (const sdtMatch of sdtMatches) {
        // Extract alias (user-friendly name)
        const aliasMatch = sdtMatch.match(/<w:alias\s+w:val="([^"]+)"/);
        if (aliasMatch) {
          const alias = aliasMatch[1];
          if (!contentControls.includes(alias)) {
            contentControls.push(alias);
          }
          continue;
        }
        
        // Extract tag (developer name) as fallback
        const tagMatch = sdtMatch.match(/<w:tag\s+w:val="([^"]+)"/);
        if (tagMatch) {
          const tag = tagMatch[1];
          if (!contentControls.includes(tag)) {
            contentControls.push(tag);
          }
          continue;
        }
        
        // Extract ID as last resort
        const idMatch = sdtMatch.match(/<w:id\s+w:val="([^"]+)"/);
        if (idMatch) {
          const id = `ContentControl_${idMatch[1]}`;
          if (!contentControls.includes(id)) {
            contentControls.push(id);
          }
        }
      }
      
      console.log('Found Content Controls:', contentControls);
      return contentControls;
    } catch (error) {
      console.error('Error extracting Content Controls:', error);
      return [];
    }
  }
}