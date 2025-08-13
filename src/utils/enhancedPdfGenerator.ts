import jsPDF from 'jspdf';
import { extractPopulatedFields, formatFieldsForPDF } from './smartFieldExtractor';

interface EventData {
  id: string;
  event_name: string;
  event_type: string;
  event_start_date: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  total_guests?: number;
  total_amount: number;
  deposit_amount: number;
  form_total: number;
  customers: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  } | null;
  eventForms?: any[];
}

interface TenantData {
  business_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  company_logo_url?: string;
}

const sanitizeForPDF = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined || value === 'null' || value === 'undefined') {
    return fallback;
  }
  return String(value).trim() || fallback;
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const drawLogo = async (doc: jsPDF, logoUrl: string, x: number, y: number, maxWidth: number, maxHeight: number) => {
  try {
    const img = await loadImage(logoUrl);
    const aspectRatio = img.width / img.height;
    
    let width = maxWidth;
    let height = maxHeight;
    
    if (aspectRatio > 1) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
    
    doc.addImage(img, 'JPEG', x, y, width, height);
    return height;
  } catch (error) {
    console.error('Error loading logo:', error);
    return 0;
  }
};

const drawTable = (doc: jsPDF, headers: string[], rows: string[][], startY: number, columnWidths: number[]) => {
  const lineHeight = 8;
  const headerHeight = 10;
  let currentY = startY;

  // Header
  doc.setFillColor(248, 249, 250);
  doc.rect(20, currentY, 170, headerHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(20, currentY, 170, headerHeight);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let currentX = 20;
  headers.forEach((header, index) => {
    doc.text(header, currentX + 2, currentY + 7);
    if (index < headers.length - 1) {
      doc.line(currentX + columnWidths[index], currentY, currentX + columnWidths[index], currentY + headerHeight);
    }
    currentX += columnWidths[index];
  });

  currentY += headerHeight;

  // Rows
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.setFillColor(252, 253, 254);
      doc.rect(20, currentY, 170, lineHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(20, currentY, 170, lineHeight);

    currentX = 20;
    row.forEach((cell, cellIndex) => {
      const textAlign = cellIndex === 0 ? 'left' : cellIndex === row.length - 1 ? 'right' : 'left';
      const textX = textAlign === 'right' ? currentX + columnWidths[cellIndex] - 2 : currentX + 2;
      
      doc.text(cell, textX, currentY + 6, { align: textAlign as any });
      
      if (cellIndex < row.length - 1) {
        doc.line(currentX + columnWidths[cellIndex], currentY, currentX + columnWidths[cellIndex], currentY + lineHeight);
      }
      currentX += columnWidths[cellIndex];
    });

    currentY += lineHeight;
  });

  return currentY;
};

export const generateEnhancedQuotePDF = async (
  event: EventData, 
  tenant: TenantData,
  tenantId: string
) => {
  try {
    const doc = new jsPDF();
    let yPosition = 20;

    // Header with logo and company name
    if (tenant.company_logo_url) {
      const logoHeight = await drawLogo(doc, tenant.company_logo_url, 20, yPosition, 40, 30);
      yPosition = Math.max(yPosition + logoHeight + 5, yPosition + 25);
    }

    // Company name and QUOTE title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPDF(tenant.business_name, 'Business Name'), tenant.company_logo_url ? 70 : 20, yPosition);
    doc.text('QUOTE', 150, yPosition);

    yPosition += 20;

    // Company address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressY = yPosition;
    doc.text(sanitizeForPDF(tenant.address_line1), 20, addressY);
    if (tenant.address_line2) {
      doc.text(sanitizeForPDF(tenant.address_line2), 20, addressY + 5);
    }
    doc.text(`${sanitizeForPDF(tenant.city)}, ${sanitizeForPDF(tenant.postal_code)}`, 20, addressY + (tenant.address_line2 ? 10 : 5));
    doc.text(sanitizeForPDF(tenant.contact_phone), 20, addressY + (tenant.address_line2 ? 15 : 10));
    doc.text(sanitizeForPDF(tenant.contact_email), 20, addressY + (tenant.address_line2 ? 20 : 15));

    // Quote details (right side)
    const quoteNumber = `QT-${event.id.substring(0, 8).toUpperCase()}`;
    const quoteDate = new Date().toLocaleDateString('en-GB');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Quote Number:', 120, addressY);
    doc.text('Quote Date:', 120, addressY + 5);
    doc.text('Valid Until:', 120, addressY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.text(quoteNumber, 150, addressY);
    doc.text(quoteDate, 150, addressY + 5);
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
    doc.text(validUntil, 150, addressY + 10);

    yPosition = addressY + 35;

    // Bill To section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (event.customers) {
      doc.text(sanitizeForPDF(event.customers.name), 20, yPosition);
      yPosition += 5;
      if (event.customers.company) {
        doc.text(sanitizeForPDF(event.customers.company), 20, yPosition);
        yPosition += 5;
      }
      doc.text(sanitizeForPDF(event.customers.email), 20, yPosition);
      yPosition += 5;
      doc.text(sanitizeForPDF(event.customers.phone), 20, yPosition);
    } else {
      doc.text('Customer details to be confirmed', 20, yPosition);
      yPosition += 5;
    }

    yPosition += 20;

    // Event Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Event Details:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Event: ${sanitizeForPDF(event.event_name)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Type: ${sanitizeForPDF(event.event_type)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString('en-GB')}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Time: ${sanitizeForPDF(event.start_time)} - ${sanitizeForPDF(event.end_time)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Guests: ${event.total_guests || event.estimated_guests || 0}`, 20, yPosition);

    yPosition += 20;

    // Services Table
    const tableHeaders = ['QTY', 'DESCRIPTION', 'PRICE'];
    const columnWidths = [25, 105, 40];
    
    // Extract smart field data
    const populatedFields = await extractPopulatedFields(
      event.eventForms || [], 
      tenantId, 
      'quote'
    );
    
    let tableRows = formatFieldsForPDF(populatedFields);

    // Add base guest pricing if applicable
    const basePrice = event.total_amount - event.form_total;
    const guestCount = event.total_guests || event.estimated_guests || 0;
    
    if (basePrice > 0 && guestCount > 0) {
      tableRows.unshift([
        guestCount.toString(),
        `${sanitizeForPDF(event.event_name)} - Base Service`,
        `£${basePrice.toFixed(2)}`
      ]);
    }

    // Add guest price totals from event forms
    if (event.eventForms) {
      event.eventForms.forEach((eventForm: any) => {
        if (eventForm.guest_price_total && eventForm.guest_price_total > 0) {
          tableRows.push([
            (eventForm.guest_count || 0).toString(),
            `${eventForm.form_label} - Guest Pricing`,
            `£${eventForm.guest_price_total.toFixed(2)}`
          ]);
        }
      });
    }

    if (tableRows.length === 0) {
      tableRows.push(['1', 'Service to be confirmed', '£0.00']);
    }

    yPosition = drawTable(doc, tableHeaders, tableRows, yPosition, columnWidths);
    yPosition += 15;

    // Totals
    const subtotal = event.total_amount;
    const vatRate = 0.20;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', 130, yPosition);
    doc.text(`£${subtotal.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;

    doc.text(`VAT (${(vatRate * 100).toFixed(0)}%):`, 130, yPosition);
    doc.text(`£${vatAmount.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.line(130, yPosition, 190, yPosition);
    yPosition += 8;
    doc.text('TOTAL:', 130, yPosition);
    doc.text(`£${total.toFixed(2)}`, 170, yPosition, { align: 'right' });

    if (event.deposit_amount > 0) {
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Deposit Required: £${event.deposit_amount.toFixed(2)}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Balance on Completion: £${(total - event.deposit_amount).toFixed(2)}`, 20, yPosition);
    }

    // Terms
    yPosition += 20;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('• This quote is valid for 30 days from the date of issue', 20, yPosition);
    yPosition += 5;
    doc.text('• A deposit may be required to confirm your booking', 20, yPosition);
    yPosition += 5;
    doc.text('• Final payment is due on completion of service', 20, yPosition);

    const filename = `Quote-${sanitizeForPDF(event.event_name).replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
  } catch (error) {
    console.error('Error generating enhanced quote PDF:', error);
    throw new Error(`Failed to generate quote: ${error.message}`);
  }
};

export const generateEnhancedInvoicePDF = async (
  event: EventData, 
  tenant: TenantData,
  tenantId: string
) => {
  try {
    const doc = new jsPDF();
    let yPosition = 20;

    // Header with logo and company name
    if (tenant.company_logo_url) {
      const logoHeight = await drawLogo(doc, tenant.company_logo_url, 20, yPosition, 40, 30);
      yPosition = Math.max(yPosition + logoHeight + 5, yPosition + 25);
    }

    // Company name and INVOICE title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeForPDF(tenant.business_name, 'Business Name'), tenant.company_logo_url ? 70 : 20, yPosition);
    doc.text('INVOICE', 150, yPosition);

    yPosition += 20;

    // Company address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressY = yPosition;
    doc.text(sanitizeForPDF(tenant.address_line1), 20, addressY);
    if (tenant.address_line2) {
      doc.text(sanitizeForPDF(tenant.address_line2), 20, addressY + 5);
    }
    doc.text(`${sanitizeForPDF(tenant.city)}, ${sanitizeForPDF(tenant.postal_code)}`, 20, addressY + (tenant.address_line2 ? 10 : 5));
    doc.text(sanitizeForPDF(tenant.contact_phone), 20, addressY + (tenant.address_line2 ? 15 : 10));
    doc.text(sanitizeForPDF(tenant.contact_email), 20, addressY + (tenant.address_line2 ? 20 : 15));

    // Invoice details (right side)
    const invoiceNumber = `INV-${event.id.substring(0, 8).toUpperCase()}`;
    const invoiceDate = new Date().toLocaleDateString('en-GB');
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number:', 120, addressY);
    doc.text('Invoice Date:', 120, addressY + 5);
    doc.text('Due Date:', 120, addressY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceNumber, 155, addressY);
    doc.text(invoiceDate, 155, addressY + 5);
    doc.text(dueDate, 155, addressY + 10);

    yPosition = addressY + 35;

    // Bill To section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (event.customers) {
      doc.text(sanitizeForPDF(event.customers.name), 20, yPosition);
      yPosition += 5;
      if (event.customers.company) {
        doc.text(sanitizeForPDF(event.customers.company), 20, yPosition);
        yPosition += 5;
      }
      doc.text(sanitizeForPDF(event.customers.email), 20, yPosition);
      yPosition += 5;
      doc.text(sanitizeForPDF(event.customers.phone), 20, yPosition);
    } else {
      doc.text('Customer details to be confirmed', 20, yPosition);
      yPosition += 5;
    }

    yPosition += 20;

    // Service Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Service Details:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Event: ${sanitizeForPDF(event.event_name)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Type: ${sanitizeForPDF(event.event_type)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString('en-GB')}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Time: ${sanitizeForPDF(event.start_time)} - ${sanitizeForPDF(event.end_time)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Guests: ${event.total_guests || event.estimated_guests || 0}`, 20, yPosition);

    yPosition += 20;

    // Services Table
    const tableHeaders = ['QTY', 'DESCRIPTION', 'PRICE'];
    const columnWidths = [25, 105, 40];
    
    // Extract smart field data for invoices
    const populatedFields = await extractPopulatedFields(
      event.eventForms || [], 
      tenantId, 
      'invoice'
    );
    
    let tableRows = formatFieldsForPDF(populatedFields);

    // Add base guest pricing if applicable
    const basePrice = event.total_amount - event.form_total;
    const guestCount = event.total_guests || event.estimated_guests || 0;
    
    if (basePrice > 0 && guestCount > 0) {
      tableRows.unshift([
        guestCount.toString(),
        `${sanitizeForPDF(event.event_name)} - Base Service`,
        `£${basePrice.toFixed(2)}`
      ]);
    }

    // Add guest price totals from event forms
    if (event.eventForms) {
      event.eventForms.forEach((eventForm: any) => {
        if (eventForm.guest_price_total && eventForm.guest_price_total > 0) {
          tableRows.push([
            (eventForm.guest_count || 0).toString(),
            `${eventForm.form_label} - Guest Pricing`,
            `£${eventForm.guest_price_total.toFixed(2)}`
          ]);
        }
      });
    }

    if (tableRows.length === 0) {
      tableRows.push(['1', 'Service provided', '£0.00']);
    }

    yPosition = drawTable(doc, tableHeaders, tableRows, yPosition, columnWidths);
    yPosition += 15;

    // Totals
    const subtotal = event.total_amount;
    const vatRate = 0.20;
    const vatAmount = subtotal * vatRate;
    const total = subtotal + vatAmount;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', 130, yPosition);
    doc.text(`£${subtotal.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;

    doc.text(`VAT (${(vatRate * 100).toFixed(0)}%):`, 130, yPosition);
    doc.text(`£${vatAmount.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.line(130, yPosition, 190, yPosition);
    yPosition += 10;
    doc.text('AMOUNT DUE:', 130, yPosition);
    doc.text(`£${total.toFixed(2)}`, 170, yPosition, { align: 'right' });

    // Payment Instructions
    yPosition += 20;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Instructions:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('• Payment is due within 15 days of invoice date', 20, yPosition);
    yPosition += 5;
    doc.text('• Please reference the invoice number when making payment', 20, yPosition);
    yPosition += 5;
    doc.text(`• Contact us at ${sanitizeForPDF(tenant.contact_email)} for payment queries`, 20, yPosition);
    yPosition += 10;

    doc.text('Thank you for your business!', 20, yPosition);

    const filename = `Invoice-${sanitizeForPDF(event.event_name).replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
  } catch (error) {
    console.error('Error generating enhanced invoice PDF:', error);
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};