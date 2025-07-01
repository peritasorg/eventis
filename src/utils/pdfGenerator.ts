
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

export const generateQuotePDF = (event: EventData, tenant: TenantData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTE', 20, yPosition);
  
  // Quote number and date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quote #: Q-${event.id.substring(0, 8).toUpperCase()}`, 140, yPosition);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, yPosition + 10);
  
  yPosition += 30;

  // Company details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 10;
  doc.text(tenant.business_name, 20, yPosition);
  yPosition += 8;
  doc.text(tenant.address_line1, 20, yPosition);
  if (tenant.address_line2) {
    yPosition += 8;
    doc.text(tenant.address_line2, 20, yPosition);
  }
  yPosition += 8;
  doc.text(`${tenant.city}, ${tenant.postal_code}`, 20, yPosition);
  yPosition += 8;
  doc.text(tenant.country, 20, yPosition);
  yPosition += 8;
  doc.text(`Email: ${tenant.contact_email}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Phone: ${tenant.contact_phone}`, 20, yPosition);

  // Customer details
  yPosition += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('To:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 10;
  doc.text(event.customers.name, 20, yPosition);
  if (event.customers.company) {
    yPosition += 8;
    doc.text(event.customers.company, 20, yPosition);
  }
  yPosition += 8;
  doc.text(`Email: ${event.customers.email}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Phone: ${event.customers.phone}`, 20, yPosition);

  // Event details
  yPosition += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 15;
  
  doc.text(`Event: ${event.event_name}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Type: ${event.event_type}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString()}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Time: ${event.start_time} - ${event.end_time}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Estimated Guests: ${event.estimated_guests}`, 20, yPosition);

  // Form responses (if any)
  if (event.form_responses && Object.keys(event.form_responses).length > 0) {
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Requirements:', 20, yPosition);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition += 10;
    
    Object.entries(event.form_responses).forEach(([key, value]) => {
      if (value && typeof value === 'object' && (value as any).enabled) {
        yPosition += 8;
        doc.text(`• ${key}: ${(value as any).notes || 'Yes'}`, 25, yPosition);
      }
    });
  }

  // Pricing
  yPosition += 30;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing:', 20, yPosition);
  
  // Draw line
  doc.line(20, yPosition + 5, 190, yPosition + 5);
  
  yPosition += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Amount:', 20, yPosition);
  doc.text(`£${event.total_amount?.toFixed(2) || '0.00'}`, 140, yPosition);
  
  yPosition += 15;
  doc.text('Deposit Required:', 20, yPosition);
  doc.text(`£${event.deposit_amount?.toFixed(2) || '0.00'}`, 140, yPosition);
  
  yPosition += 15;
  doc.text('Balance Due:', 20, yPosition);
  doc.text(`£${((event.total_amount || 0) - (event.deposit_amount || 0)).toFixed(2)}`, 140, yPosition);

  // Footer
  yPosition += 40;
  doc.setFontSize(10);
  doc.text('This quote is valid for 30 days from the date issued.', 20, yPosition);
  yPosition += 8;
  doc.text('Terms and conditions apply. Please contact us for any questions.', 20, yPosition);

  // Download
  doc.save(`Quote-${event.event_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateInvoicePDF = (event: EventData, tenant: TenantData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, yPosition);
  
  // Invoice number and date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: INV-${event.id.substring(0, 8).toUpperCase()}`, 140, yPosition);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, yPosition + 10);
  doc.text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 140, yPosition + 20);
  
  yPosition += 30;

  // Company details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 10;
  doc.text(tenant.business_name, 20, yPosition);
  yPosition += 8;
  doc.text(tenant.address_line1, 20, yPosition);
  if (tenant.address_line2) {
    yPosition += 8;
    doc.text(tenant.address_line2, 20, yPosition);
  }
  yPosition += 8;
  doc.text(`${tenant.city}, ${tenant.postal_code}`, 20, yPosition);
  yPosition += 8;
  doc.text(tenant.country, 20, yPosition);
  yPosition += 8;
  doc.text(`Email: ${tenant.contact_email}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Phone: ${tenant.contact_phone}`, 20, yPosition);

  // Customer details
  yPosition += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 10;
  doc.text(event.customers.name, 20, yPosition);
  if (event.customers.company) {
    yPosition += 8;
    doc.text(event.customers.company, 20, yPosition);
  }
  yPosition += 8;
  doc.text(`Email: ${event.customers.email}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Phone: ${event.customers.phone}`, 20, yPosition);

  // Event details
  yPosition += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Details:', 20, yPosition);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPosition += 15;
  
  doc.text(`Event: ${event.event_name}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Type: ${event.event_type}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Date: ${new Date(event.event_start_date).toLocaleDateString()}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Time: ${event.start_time} - ${event.end_time}`, 20, yPosition);
  yPosition += 8;
  doc.text(`Guests: ${event.estimated_guests}`, 20, yPosition);

  // Form responses as line items
  if (event.form_responses && Object.keys(event.form_responses).length > 0) {
    yPosition += 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Services:', 20, yPosition);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    yPosition += 10;
    
    Object.entries(event.form_responses).forEach(([key, value]) => {
      if (value && typeof value === 'object' && (value as any).enabled) {
        yPosition += 8;
        const price = (value as any).price ? `£${(value as any).price}` : '';
        doc.text(`• ${key}`, 25, yPosition);
        if (price) {
          doc.text(price, 150, yPosition);
        }
      }
    });
  }

  // Total section
  yPosition += 30;
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT DUE:', 20, yPosition);
  doc.text(`£${event.total_amount?.toFixed(2) || '0.00'}`, 140, yPosition);

  // Payment instructions
  yPosition += 30;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Instructions:', 20, yPosition);
  yPosition += 10;
  doc.text('• Payment is due within 30 days of invoice date', 25, yPosition);
  yPosition += 8;
  doc.text('• Please reference invoice number when making payment', 25, yPosition);
  yPosition += 8;
  doc.text(`• Contact us at ${tenant.contact_email} for payment queries`, 25, yPosition);

  // Footer
  yPosition += 30;
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 20, yPosition);

  // Download
  doc.save(`Invoice-${event.event_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
};
