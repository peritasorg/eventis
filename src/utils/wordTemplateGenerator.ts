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
  line_items: Array<{
    description: string;
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

  private static async mapEventDataToSpecification(eventData: any, tenantId: string, specificationLineItems: SpecificationLineItem[], eventForms: any[]): Promise<SpecificationTemplateData> {
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

    // Use provided specification line items
    const specificationItems = specificationLineItems || [];

    // Map specification_items to line_items format for template compatibility
    const lineItems = specificationItems.length > 0 
      ? specificationItems.map(item => ({
          description: item.description,
          notes: item.notes || '',
          quantity: 1, // Default quantity for specifications
          price: 0     // No pricing in specifications
        }))
      : [{ description: 'No specification items available', notes: '', quantity: 1, price: 0 }];

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
      line_items: lineItems, // Add line_items for template compatibility
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
    tenantId: string, 
    eventForms: any[]
  ): Promise<void> {
    try {
      console.log('Starting specification document generation...', { eventData: eventData?.id, tenantId });
      
      const templateName = `${tenantId}-specification-template.docx`;
      
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
      
      // Extract and map specification data
      const specificationLineItems = await this.extractSpecificationLineItems(eventForms, tenantId);
      const mappedData = await this.mapEventDataToSpecification(eventData, tenantId, specificationLineItems, eventForms);
      
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
        doc.setData(await mappedData);
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