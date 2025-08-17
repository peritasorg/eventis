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
  description: string;
  notes?: string;
}

interface SpecificationTemplateData {
  business_name: string;
  customer_name: string;
  event_name: string;
  event_date: string;
  event_time: string;
  guest_count: number;
  specification_items: SpecificationLineItem[];
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

  private static async extractLineItems(eventForms: any[], tenantId: string, documentType: 'quote' | 'invoice'): Promise<LineItem[]> {
    const lineItems: LineItem[] = [];
    
    // Add guest pricing line items first
    eventForms.forEach(form => {
      if (form.guest_price_total > 0) {
        const guestCount = (form.men_count || 0) + (form.ladies_count || 0);
        // guest_price_total is already the total price, not per-person
        const totalPrice = parseFloat(form.guest_price_total);
        
        console.log(`Guest pricing for ${form.form_label}: ${guestCount} guests - Total: £${totalPrice}`);
        
        lineItems.push({
          quantity: guestCount,
          description: `${form.form_label} - Guest Pricing`,
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
        if (field.price > 0) {
          lineItems.push({
            quantity: field.quantity,
            description: field.description,
            price: field.price,
            total: field.quantity * field.price
          });
        }
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
    const lineItems = await this.extractLineItems(eventForms, tenantId, documentType);
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
        eventData.customers.city,
        eventData.customers.postal_code
      ].filter(Boolean).join(', ') || 'Customer Address' : 'Customer Address',
      customer_phone: eventData.customers?.phone || eventData.primary_contact_number || '',
      customer_email: eventData.customers?.email || 'customer@email.com',
      
      // Event info
      event_name: eventData.title || 'Event',
      event_date: eventData.event_date ? new Date(eventData.event_date).toLocaleDateString('en-GB') : '',
      event_time: eventForms && eventForms.length > 1 
        ? eventForms.map(form => `${form.start_time || 'TBD'} - ${form.end_time || 'TBD'}`).join(' & ')
        : `${eventData.start_time || 'TBD'} - ${eventData.end_time || 'TBD'}`,
      guest_count: eventForms && eventForms.length > 1
        ? eventForms.map(form => String((form.men_count || 0) + (form.ladies_count || 0))).join(' & ')
        : String((eventData.men_count || 0) + (eventData.ladies_count || 0)),
      
      // Financial info
      subtotal: subtotal,
      total: subtotal,
      deductible_deposit_amount: parseFloat(eventData.deposit_amount_gbp) || 0,
      refundable_deposit_amount: parseFloat(eventData.refundable_deposit_gbp) || 0,
      balance_due: subtotal - (parseFloat(eventData.deposit_amount_gbp) || 0), // Only deductible deposit reduces balance
      
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
      // Fetch customer data if customer_id exists
      let enrichedEventData = { ...eventData };
      if (eventData.customer_id && !eventData.customers) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', eventData.customer_id)
            .single();
          
          if (customerData) {
            enrichedEventData.customers = customerData;
          }
        } catch (error) {
          console.warn('Could not fetch customer data:', error);
        }
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

  private static async extractSpecificationLineItems(eventForms: any[], tenantId: string): Promise<SpecificationLineItem[]> {
    const items: SpecificationLineItem[] = [];
    
    console.log('Extracting specification items:', { eventForms, tenantId });

    if (!Array.isArray(eventForms) || eventForms.length === 0) {
      console.log('No event forms provided');
      return items;
    }

    if (!tenantId) {
      console.error('Tenant ID is required for extracting specification items');
      return items;
    }

    try {
      // Get all form fields for this tenant
      const { data: formFields, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching form fields:', error);
        return items;
      }

      if (!formFields || formFields.length === 0) {
        console.log('No form fields found for tenant');
        return items;
      }

      console.log('Found form fields:', formFields.length);

      // Create a lookup map for field configurations
      const fieldLookup = new Map(formFields.map(field => [field.id, field]));

      // Process each event form
      for (const eventForm of eventForms) {
        if (!eventForm || !eventForm.form_responses || typeof eventForm.form_responses !== 'object') {
          console.log('Skipping invalid event form:', eventForm?.id);
          continue;
        }

        console.log('Processing event form:', eventForm.id, 'with responses:', Object.keys(eventForm.form_responses).length);

        // Process each field response
        for (const [fieldId, response] of Object.entries(eventForm.form_responses)) {
          try {
            const fieldConfig = fieldLookup.get(fieldId);
            
            if (!fieldConfig) {
              console.log('Field config not found for:', fieldId);
              continue;
            }

            // Check if this field should be included in specification
            if (this.isSpecificationFieldPopulated(response, fieldConfig.field_type)) {
              const content = this.extractSpecificationFieldContent(response, fieldConfig);
              
              if (content) {
                const item: SpecificationLineItem = {
                  description: String(content).trim(),
                  notes: String((response as any)?.notes || '').trim(),
                };
                
                items.push(item);
                console.log('Added specification item:', item);
              }
            }
          } catch (fieldError) {
            console.error('Error processing field:', fieldId, fieldError);
            // Continue processing other fields instead of failing completely
          }
        }
      }

      console.log('Total specification items extracted:', items.length);
      return items;

    } catch (error) {
      console.error('Error in extractSpecificationLineItems:', error);
      return items; // Return empty array instead of throwing
    }
  }

  private static async mapEventDataToSpecification(eventData: any, eventForms: any[], tenantId: string): Promise<SpecificationTemplateData> {
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

    console.log('Mapping specification data:', { eventData, eventForms, tenantId });

    // Validate required data
    if (!eventData) {
      throw new Error('Event data is required for specification generation');
    }

    if (!Array.isArray(eventForms)) {
      throw new Error('Event forms must be an array');
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

    // Extract and validate data with null-safe handling
    const businessName = safeString(eventData.tenant?.business_name, 'Business Name');
    const eventName = safeString(eventData.event_name || eventData.title, 'Event Name');
    const eventDate = safeDate(eventData.event_start_date || eventData.event_date, 'TBD');
    const eventTime = safeString(eventData.start_time, 'TBD');
    const guestCount = safeNumber(eventData.estimated_guests || eventData.guest_count);
    const notes = safeString(eventData.notes, 'No additional notes');
    const createdDate = format(new Date(), 'dd/MM/yyyy');

    // Extract specification line items with error handling
    let specificationItems: SpecificationLineItem[] = [];
    try {
      specificationItems = await this.extractSpecificationLineItems(eventForms, tenantId);
    } catch (error) {
      console.error('Error extracting specification items:', error);
      specificationItems = [];
    }

    const templateData: SpecificationTemplateData = {
      business_name: businessName,
      customer_name: customerName,
      event_name: eventName,
      event_date: eventDate,
      event_time: eventTime,
      guest_count: guestCount,
      specification_items: specificationItems.length > 0 ? specificationItems : [
        { description: 'No specification items available', notes: '' }
      ],
      notes: notes,
      created_date: createdDate,
    };

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
    eventForms: any[],
    tenantId: string
  ): Promise<void> {
    try {
      const templateName = `${tenantId}-specification-template.docx`;
      
      // Download the specification template
      const templateBuffer = await this.downloadTemplate(templateName);
      
      // Load template into PizZip
      const zip = new PizZip(templateBuffer);
      
      // Map event data to specification template format
      const templateData = await this.mapEventDataToSpecification(eventData, eventForms, tenantId);
      
      console.log('Specification template data:', templateData);
      
      // Use docxtemplater for simple {placeholder} format
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true,
      });
      
      console.log('About to set template data:', JSON.stringify(templateData, null, 2));
      
      // Set the template data
      doc.setData(templateData);
      
      try {
        // Render the document (no parameters needed)
        doc.render();
        console.log('Template rendered successfully');
      } catch (renderError: any) {
        console.error('Docxtemplater render error:', renderError);
        console.error('Error details:', {
          name: renderError.name,
          message: renderError.message,
          properties: renderError.properties,
          stack: renderError.stack
        });
        
        // Handle multi error specifically
        if (renderError.name === 'TemplateError' || renderError.name === 'RenderingError') {
          if (renderError.properties && Array.isArray(renderError.properties)) {
            const errorMessages = renderError.properties.map((prop: any) => {
              const location = prop.id || prop.tag || prop.scope || 'unknown location';
              const explanation = prop.explanation || prop.message || 'Unknown error';
              return `${explanation} at ${location}`;
            }).join('; ');
            throw new Error(`Template processing failed: ${errorMessages}`);
          }
        }
        
        // Handle array of errors
        if (renderError.properties && renderError.properties.errors && Array.isArray(renderError.properties.errors)) {
          const errors = renderError.properties.errors.map((err: any) => 
            `${err.message || err.explanation || 'Unknown error'} (${err.name || 'UnknownError'})`
          ).join('; ');
          throw new Error(`Template errors: ${errors}`);
        }
        
        // Handle single error with properties
        if (renderError.properties && renderError.properties.explanation) {
          throw new Error(`Template error: ${renderError.properties.explanation}`);
        }
        
        // Fallback for any other error structure
        throw new Error(`Template rendering failed: ${renderError.message || 'Unknown error'}`);
      }
      
      // Generate the document
      const output = zip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      // Download the file
      const customerName = eventData.customers?.name || eventData.primary_contact_name || 'Customer';
      const fileName = `SPEC - ${customerName}.docx`;
      saveAs(output, fileName);
      
    } catch (error) {
      console.error('Error generating specification document:', error);
      console.error('Error context:', {
        eventData: eventData?.id,
        eventFormsCount: eventForms?.length,
        tenantId
      });
      throw new Error(`Failed to generate specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static validateTemplateStructure(doc: any, templateData: any): void {
    try {
      // Get template tags/placeholders
      const templateTags = doc.getFullText().match(/\{[^}]+\}/g) || [];
      console.log('Template placeholders found:', templateTags);
      
      // Check if all required data is present
      const dataKeys = this.getAllNestedKeys(templateData);
      console.log('Available data keys:', dataKeys);
      
      // Log any potential mismatches (but don't fail)
      const missingData = templateTags.filter((tag: string) => {
        const cleanTag = tag.replace(/[{}]/g, '');
        return !dataKeys.includes(cleanTag) && !cleanTag.includes('#') && !cleanTag.includes('/');
      });
      
      if (missingData.length > 0) {
        console.warn('Template placeholders without matching data:', missingData);
      }
      
    } catch (error) {
      console.warn('Template validation warning:', error);
      // Don't throw, just log the warning
    }
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
      return false;
    }

    console.log('Checking field population:', { response, fieldType });

    // Check if field is enabled for toggle-based fields
    if (fieldType === 'toggle' || fieldType.includes('toggle')) {
      const isEnabled = response.enabled === true;
      console.log('Toggle field enabled:', isEnabled);
      return isEnabled;
    }

    // For text fields, check if value exists and is not empty
    if (fieldType === 'text' || fieldType === 'textarea' || fieldType.includes('text')) {
      const hasValue = !!(response.value && String(response.value).trim());
      console.log('Text field has value:', hasValue);
      return hasValue;
    }

    // For price fields, check if price is set and greater than 0
    if (fieldType === 'price' || fieldType.includes('price')) {
      const hasPrice = !!(response.price && parseFloat(response.price) > 0);
      console.log('Price field has price:', hasPrice);
      return hasPrice;
    }

    // For quantity fields, check if quantity is set and greater than 0
    if (fieldType === 'quantity' || fieldType === 'number' || fieldType.includes('quantity')) {
      const hasQuantity = !!(response.quantity && parseInt(response.quantity) > 0);
      console.log('Quantity field has quantity:', hasQuantity);
      return hasQuantity;
    }

    // For dropdown fields, check if option is selected
    if (fieldType === 'dropdown' || fieldType === 'select' || fieldType.includes('dropdown')) {
      const hasSelection = !!(response.selectedOption || response.value);
      console.log('Dropdown field has selection:', hasSelection);
      return hasSelection;
    }

    // For counter fields, check if value is set and greater than 0
    if (fieldType === 'counter' || fieldType.includes('counter')) {
      const hasCount = !!(response.value && parseInt(response.value) > 0);
      console.log('Counter field has count:', hasCount);
      return hasCount;
    }

    // For notes fields, check if notes exist
    if (fieldType === 'notes' && response.notes && String(response.notes).trim()) {
      console.log('Notes field has content');
      return true;
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

  private static extractSpecificationFieldContent(response: any, fieldConfig: any): string | null {
    if (!response || typeof response !== 'object' || !fieldConfig) {
      return null;
    }

    const fieldName = String(fieldConfig.name || 'Unknown Field');
    const fieldType = String(fieldConfig.field_type || 'text');

    console.log('Extracting content for field:', { fieldName, fieldType, response });

    // Handle different field types and extract appropriate content
    switch (fieldType) {
      case 'toggle':
        return response.enabled ? fieldName : null;

      case 'text':
      case 'textarea':
        if (response.value && String(response.value).trim()) {
          return `${fieldName}: ${String(response.value).trim()}`;
        }
        return null;

      case 'price':
        if (response.price && parseFloat(response.price) > 0) {
          return `${fieldName}: £${parseFloat(response.price).toFixed(2)}`;
        }
        return null;

      case 'quantity':
      case 'number':
        if (response.quantity && parseInt(response.quantity) > 0) {
          return `${fieldName}: ${response.quantity}`;
        }
        return null;

      case 'dropdown':
      case 'select':
        const selectedValue = response.selectedOption || response.value;
        if (selectedValue && String(selectedValue).trim()) {
          return `${fieldName}: ${String(selectedValue).trim()}`;
        }
        return null;

      case 'counter':
        if (response.value && parseInt(response.value) > 0) {
          return `${fieldName}: ${response.value}`;
        }
        return null;

      case 'notes':
        if (response.notes && String(response.notes).trim()) {
          return `${fieldName}: ${String(response.notes).trim()}`;
        }
        return null;

      default:
        // Default handling for unknown field types
        if (response.value && String(response.value).trim()) {
          return `${fieldName}: ${String(response.value).trim()}`;
        } else if (response.enabled === true) {
          return fieldName;
        }
        return null;
    }
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