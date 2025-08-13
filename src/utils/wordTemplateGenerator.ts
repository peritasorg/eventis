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
  guest_count: number;
  
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

  private static extractLineItems(eventForms: any[]): LineItem[] {
    const lineItems: LineItem[] = [];
    
    eventForms.forEach(form => {
      if (form.form_responses) {
        Object.entries(form.form_responses).forEach(([fieldId, fieldData]: [string, any]) => {
          if (fieldData?.enabled && fieldData?.price > 0) {
            lineItems.push({
              quantity: fieldData.quantity || 1,
              description: fieldData.label || fieldData.name || 'Service Item',
              price: parseFloat(fieldData.price),
              total: (fieldData.quantity || 1) * parseFloat(fieldData.price)
            });
          }
        });
      }
    });
    
    return lineItems;
  }

  private static mapEventDataToTemplate(
    eventData: any, 
    tenantData: any, 
    eventForms: any[],
    documentType: 'quote' | 'invoice'
  ): TemplateData {
    const lineItems = this.extractLineItems(eventForms);
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
      customer_name: eventData.primary_contact_name || 'Customer Name',
      customer_address: 'Customer Address', // You might want to get this from customer table
      customer_phone: eventData.primary_contact_number || '',
      customer_email: 'customer@email.com', // You might want to get this from customer table
      
      // Event info
      event_name: eventData.title || 'Event',
      event_date: eventData.event_date ? new Date(eventData.event_date).toLocaleDateString() : '',
      event_time: eventData.start_time && eventData.end_time 
        ? `${eventData.start_time} - ${eventData.end_time}`
        : '',
      guest_count: eventData.men_count + eventData.ladies_count || 0,
      
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
    templateName: string = 'Invoice Template.docx'
  ): Promise<void> {
    try {
      // Download the template
      const templateBuffer = await this.downloadTemplate(templateName);
      
      // Load template into PizZip
      const zip = new PizZip(templateBuffer);
      
      // Create Docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      
      // Map event data to template format
      const templateData = this.mapEventDataToTemplate(eventData, tenantData, eventForms, documentType);
      
      // Render the document
      doc.render(templateData);
      
      // Generate the document
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      // Download the file
      const fileName = `${documentType}-${templateData.document_number}.docx`;
      saveAs(output, fileName);
      
    } catch (error) {
      console.error('Error generating document:', error);
      throw new Error(`Failed to generate ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async analyzeTemplate(templateName: string): Promise<string[]> {
    try {
      const templateBuffer = await this.downloadTemplate(templateName);
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip);
      
      // Extract content controls/placeholders
      const content = zip.files['word/document.xml']?.asText() || '';
      const placeholderRegex = /\{([^}]+)\}/g;
      const placeholders: string[] = [];
      let match;
      
      while ((match = placeholderRegex.exec(content)) !== null) {
        const placeholder = match[1];
        if (!placeholders.includes(placeholder)) {
          placeholders.push(placeholder);
        }
      }
      
      return placeholders;
    } catch (error) {
      console.error('Error analyzing template:', error);
      return [];
    }
  }
}