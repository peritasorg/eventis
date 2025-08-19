import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Edit3, Eye, FileText, Receipt, Upload } from 'lucide-react';
import { extractPopulatedFields } from '@/utils/smartFieldExtractor';
import { WordTemplateGenerator } from '@/utils/wordTemplateGenerator';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


interface QuoteInvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: any;
  tenantData: any;
  tenantId: string;
  eventForms: any[];
}

export const QuoteInvoicePreview: React.FC<QuoteInvoicePreviewProps> = ({
  isOpen,
  onClose,
  eventData,
  tenantData,
  tenantId,
  eventForms
}) => {
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>('quote');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editableData, setEditableData] = useState({
    business_name: tenantData?.business_name || '',
    event_name: eventData?.title || '',
    customer_name: eventData?.customers?.name || '',
    notes: ''
  });
  const [populatedFields, setPopulatedFields] = useState<any[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [hasSpecificationTemplate, setHasSpecificationTemplate] = useState(false);

  React.useEffect(() => {
    if (isOpen && eventForms) {
      loadPopulatedFields();
      checkTemplateExists();
      checkSpecificationTemplateExists();
    }
  }, [isOpen, eventForms, documentType]);

  // Sync customer name when eventData changes
  React.useEffect(() => {
    if (eventData?.customers?.name) {
      setEditableData(prev => ({
        ...prev,
        customer_name: eventData.customers.name
      }));
    }
  }, [eventData?.customers?.name]);

  const checkTemplateExists = async () => {
    if (!tenantId) return;
    
    try {
      const templateName = `${tenantId}-template.docx`;
      const { data } = await supabase.storage
        .from('word-templates')
        .list('', {
          search: templateName
        });
      
      const templateExists = data && data.length > 0;
      setHasTemplate(templateExists);
    } catch (error) {
      console.error('Error checking template:', error);
      setHasTemplate(false);
    }
  };

  const checkSpecificationTemplateExists = async () => {
    if (!tenantId) return;
    
    try {
      const templateName = `${tenantId}-specification-template.docx`;
      const { data } = await supabase.storage
        .from('word-templates')
        .list('', {
          search: templateName
        });
      
      const templateExists = data && data.length > 0;
      setHasSpecificationTemplate(templateExists);
    } catch (error) {
      console.error('Error checking specification template:', error);
      setHasSpecificationTemplate(false);
    }
  };

  const loadPopulatedFields = async () => {
    setIsLoadingFields(true);
    try {
      const fields = await extractPopulatedFields(eventForms, tenantId, documentType);
      setPopulatedFields(fields);
    } catch (error) {
      console.error('Error loading populated fields:', error);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const calculateTotals = () => {
    // Calculate subtotal from only populated fields prices and guest pricing
    let subtotal = 0;
    
    // Add populated field prices
    populatedFields.forEach(field => {
      subtotal += field.price || 0;
    });
    
    // Add guest pricing from event forms
    eventForms?.forEach(eventForm => {
      if (eventForm.guest_price_total > 0) {
        subtotal += Number(eventForm.guest_price_total);
      }
    });
    
    // No VAT calculation - set to 0
    const vatAmount = 0;
    const total = subtotal;

    return { subtotal, vatAmount, total, basePrice: 0, formTotal: subtotal };
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  // Format guest count for multiple forms  
  const formatGuestCount = () => {
    if (!eventForms || eventForms.length === 0) return '0';
    
    if (eventForms.length === 1) {
      const form = eventForms[0];
      return String((form.men_count || 0) + (form.ladies_count || 0));
    }
    
    // Multiple forms - show individual counts with " & " separator
    const counts = eventForms.map(form => 
      String((form.men_count || 0) + (form.ladies_count || 0))
    );
    return counts.join(' & ');
  };

  const handleGenerate = async (type: 'quote' | 'invoice') => {
    if (!hasTemplate) {
      toast.error('Please upload a Word template first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const enhancedEventData = {
        ...eventData,
        title: editableData.event_name,
        eventForms: eventForms,
        customers: eventData.customers ? {
          ...eventData.customers,
          name: editableData.customer_name
        } : null,
        primary_contact_name: editableData.customer_name,
        notes: editableData.notes
      };

      const enhancedTenantData = {
        ...tenantData,
        business_name: editableData.business_name
      };

      await WordTemplateGenerator.generateDocument(
        enhancedEventData, 
        enhancedTenantData, 
        eventForms || [], 
        type,
        `${tenantId}-template.docx`,
        tenantId
      );
      
      toast.success(`${type === 'quote' ? 'Quote' : 'Invoice'} document downloaded!`);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(`Failed to generate ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSpecification = async () => {
    if (!hasSpecificationTemplate) {
      toast.error('Please upload a specification template first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const enhancedEventData = {
        ...eventData,
        title: editableData.event_name,
        customers: eventData.customers ? {
          ...eventData.customers,
          name: editableData.customer_name
        } : null,
        primary_contact_name: editableData.customer_name
      };

      await WordTemplateGenerator.generateSpecificationDocument(
        enhancedEventData,
        tenantId,
        eventForms || []
      );
      
      toast.success('Specification document downloaded!');
    } catch (error) {
      console.error('Error generating specification:', error);
      toast.error(`Failed to generate specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };


  const renderClassicPreview = () => (
    <div className="space-y-6">
      {/* Document Type Selector */}
      <div className="flex space-x-2">
        <Button
          variant={documentType === 'quote' ? 'default' : 'outline'}
          onClick={() => setDocumentType('quote')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Quote
        </Button>
        <Button
          variant={documentType === 'invoice' ? 'default' : 'outline'}
          onClick={() => setDocumentType('invoice')}
          className="flex items-center gap-2"
        >
          <Receipt className="h-4 w-4" />
          Invoice
        </Button>
      </div>

      {/* Editable Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Editable Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={editableData.business_name}
                onChange={(e) => setEditableData(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event_name">Event Name</Label>
              <Input
                id="event_name"
                value={editableData.event_name}
                onChange={(e) => setEditableData(prev => ({ ...prev, event_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={editableData.customer_name}
                onChange={(e) => setEditableData(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={editableData.notes}
              onChange={(e) => setEditableData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes for this document..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-xl font-bold">{editableData.business_name}</h2>
              <p className="text-sm text-muted-foreground">
                {tenantData?.address_line1}<br />
                {tenantData?.city}, {tenantData?.postal_code}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-primary">
                {documentType === 'quote' ? 'QUOTE' : 'INVOICE'}
              </h2>
              <p className="text-sm">
                #{documentType === 'quote' ? 'QT' : 'INV'}-{eventData?.id?.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p>{editableData.customer_name || 'Customer to be confirmed'}</p>
          </div>

          {/* Event Details */}
          <div>
            <h3 className="font-semibold mb-2">Event Details:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Event:</strong> {editableData.event_name}</p>
              <p><strong>Type:</strong> {eventData?.event_type}</p>
              <p><strong>Date:</strong> {eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('en-GB') : 'TBD'}</p>
              <p><strong>Guests:</strong> {formatGuestCount()}</p>
              <p><strong>Time:</strong> {
                eventForms && eventForms.length > 1 
                  ? eventForms.map(form => `${form.start_time || 'TBD'} - ${form.end_time || 'TBD'}`).join(' & ')
                  : `${eventData?.start_time || 'TBD'} - ${eventData?.end_time || 'TBD'}`
              }</p>
            </div>
          </div>

          {/* Services Table */}
          <div>
            <h3 className="font-semibold mb-2">Services:</h3>
            {isLoadingFields ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-2 grid grid-cols-3 gap-2 text-sm font-semibold">
                  <div>QTY</div>
                  <div>DESCRIPTION</div>
                  <div className="text-right">PRICE</div>
                </div>
                
                {/* Guest totals from event forms */}
                {eventForms?.map((eventForm) => 
                  eventForm.guest_price_total > 0 && (
                    <div key={`event-form-${eventForm.id}`} className="p-2 grid grid-cols-3 gap-2 text-sm border-b">
                      <div>{(eventForm.men_count || 0) + (eventForm.ladies_count || 0)}</div>
                      <div>{eventForm.form_label} - Guest Pricing</div>
                      <div className="text-right">£{eventForm.guest_price_total.toFixed(2)}</div>
                    </div>
                  )
                )}
                
                {/* Populated fields */}
                {populatedFields.map((field) => (
                  <div key={`populated-field-${field.id}`} className="p-2 grid grid-cols-3 gap-2 text-sm border-b">
                    <div>{field.quantity}</div>
                    <div>{field.description}</div>
                    <div className="text-right">£{field.price.toFixed(2)}</div>
                  </div>
                ))}
                
                {populatedFields.length === 0 && !eventForms?.some(f => f.guest_price_total > 0) && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No services configured yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="space-y-2 text-sm max-w-sm ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>TOTAL:</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {editableData.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes:</h3>
              <p className="text-sm bg-muted p-3 rounded">{editableData.notes}</p>
            </div>
          )}
          
          {/* Template Status - Always Show */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Quote/Invoice Template</h3>
                  {hasTemplate ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Template Active
                    </Badge>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        No Template
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Upload a Word template to enable quote/invoice generation
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Specification Template</h3>
                  {hasSpecificationTemplate ? (
                    <div className="space-y-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Specification Template Active
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        No Specification Template
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Upload a specification template to enable kitchen document generation
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Link to="/settings/templates">
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Manage Templates
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Quote & Invoice Generator
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {renderClassicPreview()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleGenerate('quote')}
              disabled={isGenerating || !hasTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Quote
            </Button>
            <Button
              onClick={() => handleGenerate('invoice')}
              disabled={isGenerating || !hasTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Invoice
            </Button>
            <Button
              onClick={handleGenerateSpecification}
              disabled={isGenerating || !hasSpecificationTemplate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Specification
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};