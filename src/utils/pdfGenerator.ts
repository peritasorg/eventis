
import jsPDF from 'jspdf';

interface EventData {
  id: string;
  event_name: string;
  event_type: string;
  event_start_date: string;
  start_time: string;
  end_time: string;
  estimated_guests: number;
  total_amount: number;
  deposit_amount: number;
  form_responses: any;
  customers: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
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
}

const drawTable = (doc: jsPDF, headers: string[], rows: string[][], startY: number, columnWidths: number[]) => {
  const lineHeight = 8;
  const headerHeight = 10;
  let currentY = startY;

  // Draw header background
  doc.setFillColor(240, 240, 240);
  doc.rect(20, currentY, 170, headerHeight, 'F');

  // Draw header border
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, currentY, 170, headerHeight);

  // Draw header text
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

  // Draw rows
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, rowIndex) => {
    // Alternate row background
    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, currentY, 170, lineHeight, 'F');
    }

    // Draw row border
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, currentY, 170, lineHeight);

    // Draw row text
    currentX = 20;
    row.forEach((cell, cellIndex) => {
      const textAlign = cellIndex === 0 ? 'left' : cellIndex === row.length - 1 ? 'right' : 'center';
      const textX = textAlign === 'right' ? currentX + columnWidths[cellIndex] - 2 : 
                   textAlign === 'center' ? currentX + columnWidths[cellIndex] / 2 : currentX + 2;
      
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

export const generateQuotePDF = (event: EventData, tenant: TenantData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header - Company name and QUOTE
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(tenant.business_name, 20, yPosition);
  doc.text('QUOTE', 150, yPosition);

  yPosition += 15;

  // Company address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(tenant.address_line1, 20, yPosition);
  yPosition += 5;
  if (tenant.address_line2) {
    doc.text(tenant.address_line2, 20, yPosition);
    yPosition += 5;
  }
  doc.text(`${tenant.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`${tenant.postal_code}`, 20, yPosition);

  // Quote details (top right)
  const quoteNumber = `QB-${event.id.substring(0, 8).toUpperCase()}`;
  const quoteDate = new Date().toLocaleDateString('en-GB');
  doc.text(`Quote #`, 120, yPosition - 15);
  doc.text(quoteNumber, 150, yPosition - 15);
  doc.text(`Quote Date`, 120, yPosition - 10);
  doc.text(quoteDate, 150, yPosition - 10);

  yPosition += 20;

  // Bill To section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(event.customers.name, 20, yPosition);
  yPosition += 5;
  if (event.customers.company) {
    doc.text(event.customers.company, 20, yPosition);
    yPosition += 5;
  }
  doc.text(event.customers.email, 20, yPosition);
  yPosition += 5;
  doc.text(event.customers.phone, 20, yPosition);

  yPosition += 20;

  // Event Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Event: ${event.event_name}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Type: ${event.event_type}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString('en-GB')}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Time: ${event.start_time} - ${event.end_time}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Guests: ${event.estimated_guests}`, 20, yPosition);

  yPosition += 20;

  // Items/Services Table
  const tableHeaders = ['QTY', 'DESCRIPTION', 'UNIT PRICE', 'AMOUNT'];
  const columnWidths = [30, 80, 30, 30];
  const tableRows: string[][] = [];

  // Add base event as first row
  tableRows.push([
    '1',
    `${event.event_name} - ${event.event_type}`,
    `£${(event.total_amount - (event.form_total || 0)).toFixed(2)}`,
    `£${(event.total_amount - (event.form_total || 0)).toFixed(2)}`
  ]);

  // Add form responses as line items
  if (event.form_responses && Object.keys(event.form_responses).length > 0) {
    Object.entries(event.form_responses).forEach(([fieldId, response]: [string, any]) => {
      if (response?.enabled && response?.price > 0) {
        // Use the field label if available, otherwise use fieldId
        const description = response.label || fieldId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        tableRows.push([
          '1',
          description + (response.notes ? ` - ${response.notes}` : ''),
          `£${parseFloat(response.price).toFixed(2)}`,
          `£${parseFloat(response.price).toFixed(2)}`
        ]);
      }
    });
  }

  yPosition = drawTable(doc, tableHeaders, tableRows, yPosition, columnWidths);

  yPosition += 10;

  // Totals section
  const subtotal = event.total_amount || 0;
  const vatRate = 0; // Assuming no VAT for now
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  // Right-aligned totals
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 130, yPosition);
  doc.text(`£${subtotal.toFixed(2)}`, 170, yPosition, { align: 'right' });
  yPosition += 8;

  if (vatAmount > 0) {
    doc.text(`VAT ${(vatRate * 100).toFixed(1)}%`, 130, yPosition);
    doc.text(`£${vatAmount.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // Total line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.line(130, yPosition, 190, yPosition);
  yPosition += 8;
  doc.text('TOTAL', 130, yPosition);
  doc.text(`£${total.toFixed(2)}`, 170, yPosition, { align: 'right' });

  yPosition += 20;

  // Deposit information
  if (event.deposit_amount > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Deposit Required: £${event.deposit_amount.toFixed(2)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Balance Due: £${(total - event.deposit_amount).toFixed(2)}`, 20, yPosition);
    yPosition += 15;
  }

  // Terms & Conditions
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('This quote is valid for 30 days from the date issued.', 20, yPosition);
  yPosition += 5;
  doc.text('Payment is due within 15 days of acceptance.', 20, yPosition);
  yPosition += 5;
  doc.text(`For payment queries, contact: ${tenant.contact_email}`, 20, yPosition);

  // Download
  doc.save(`Quote-${event.event_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateInvoicePDF = (event: EventData, tenant: TenantData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header - Company name and INVOICE
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(tenant.business_name, 20, yPosition);
  doc.text('INVOICE', 150, yPosition);

  yPosition += 15;

  // Company address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(tenant.address_line1, 20, yPosition);
  yPosition += 5;
  if (tenant.address_line2) {
    doc.text(tenant.address_line2, 20, yPosition);
    yPosition += 5;
  }
  doc.text(`${tenant.city}`, 20, yPosition);
  yPosition += 5;
  doc.text(`${tenant.postal_code}`, 20, yPosition);

  // Invoice details (top right)
  const invoiceNumber = `INV-${event.id.substring(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-GB');
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
  
  doc.text(`Invoice #`, 120, yPosition - 15);
  doc.text(invoiceNumber, 150, yPosition - 15);
  doc.text(`Invoice Date`, 120, yPosition - 10);
  doc.text(invoiceDate, 150, yPosition - 10);
  doc.text(`Due Date`, 120, yPosition - 5);
  doc.text(dueDate, 150, yPosition - 5);

  yPosition += 20;

  // Bill To section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(event.customers.name, 20, yPosition);
  yPosition += 5;
  if (event.customers.company) {
    doc.text(event.customers.company, 20, yPosition);
    yPosition += 5;
  }
  doc.text(event.customers.email, 20, yPosition);
  yPosition += 5;
  doc.text(event.customers.phone, 20, yPosition);

  yPosition += 20;

  // Service Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Details', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Event: ${event.event_name}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Type: ${event.event_type}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString('en-GB')}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Time: ${event.start_time} - ${event.end_time}`, 20, yPosition);
  yPosition += 5;
  doc.text(`Guests: ${event.estimated_guests}`, 20, yPosition);

  yPosition += 20;

  // Items/Services Table
  const tableHeaders = ['QTY', 'DESCRIPTION', 'UNIT PRICE', 'AMOUNT'];
  const columnWidths = [30, 80, 30, 30];
  const tableRows: string[][] = [];

  // Add base event as first row
  tableRows.push([
    '1',
    `${event.event_name} - ${event.event_type}`,
    `£${(event.total_amount - (event.form_total || 0)).toFixed(2)}`,
    `£${(event.total_amount - (event.form_total || 0)).toFixed(2)}`
  ]);

  // Add form responses as line items
  if (event.form_responses && Object.keys(event.form_responses).length > 0) {
    Object.entries(event.form_responses).forEach(([fieldId, response]: [string, any]) => {
      if (response?.enabled && response?.price > 0) {
        // Use the field label if available, otherwise use fieldId
        const description = response.label || fieldId.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        tableRows.push([
          '1',
          description + (response.notes ? ` - ${response.notes}` : ''),
          `£${parseFloat(response.price).toFixed(2)}`,
          `£${parseFloat(response.price).toFixed(2)}`
        ]);
      }
    });
  }

  yPosition = drawTable(doc, tableHeaders, tableRows, yPosition, columnWidths);

  yPosition += 10;

  // Totals section
  const subtotal = event.total_amount || 0;
  const vatRate = 0; // Assuming no VAT for now
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  // Right-aligned totals
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 130, yPosition);
  doc.text(`£${subtotal.toFixed(2)}`, 170, yPosition, { align: 'right' });
  yPosition += 8;

  if (vatAmount > 0) {
    doc.text(`VAT ${(vatRate * 100).toFixed(1)}%`, 130, yPosition);
    doc.text(`£${vatAmount.toFixed(2)}`, 170, yPosition, { align: 'right' });
    yPosition += 8;
  }

  // Total line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.line(130, yPosition, 190, yPosition);
  yPosition += 10;
  doc.text('TOTAL AMOUNT DUE', 130, yPosition);
  doc.text(`£${total.toFixed(2)}`, 170, yPosition, { align: 'right' });

  yPosition += 20;

  // Payment Instructions
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Instructions', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('• Payment is due within 15 days of invoice date', 20, yPosition);
  yPosition += 5;
  doc.text('• Please reference invoice number when making payment', 20, yPosition);
  yPosition += 5;
  doc.text(`• Contact us at ${tenant.contact_email} for payment queries`, 20, yPosition);
  yPosition += 10;

  doc.text('Thank you for your business!', 20, yPosition);

  // Download
  doc.save(`Invoice-${event.event_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
};
