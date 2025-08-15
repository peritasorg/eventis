import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
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
  deposit_amount: number;
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
          price: totalPrice / guestCount, // Calculate per-person price for display
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
      deposit_amount: parseFloat(eventData.deposit_amount_gbp) || 0,
      balance_due: subtotal - (parseFloat(eventData.deposit_amount_gbp) || 0),
      
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
        deposit_formatted: `£${templateData.deposit_amount.toFixed(2)}`,
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
      'deposit_amount': `£${templateData.deposit_amount.toFixed(2)}`,
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
      'DepositAmount': `£${templateData.deposit_amount.toFixed(2)}`,
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