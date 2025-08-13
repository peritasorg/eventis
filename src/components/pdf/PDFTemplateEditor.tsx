import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Move, 
  Type, 
  Image, 
  Table, 
  FileText, 
  Settings, 
  Eye, 
  Download,
  Plus,
  Trash2,
  GripVertical,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';

interface PDFSection {
  id: string;
  type: 'header' | 'text' | 'table' | 'image' | 'business_info' | 'customer_info' | 'event_details' | 'services' | 'totals' | 'terms';
  title: string;
  enabled: boolean;
  order: number;
  config: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    alignment?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    padding?: number;
    margin?: number;
    customText?: string;
    showBorder?: boolean;
    columns?: string[];
    template?: string;
  };
}

interface PDFTemplate {
  id?: string;
  name: string;
  tenant_id: string;
  document_type: 'quote' | 'invoice' | 'both';
  sections: PDFSection[];
  page_settings: {
    size: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  styling: {
    primary_color: string;
    secondary_color: string;
    font_family: string;
    logo_position: 'top-left' | 'top-center' | 'top-right';
    compact_mode: boolean;
  };
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PDFTemplateEditorProps {
  template?: PDFTemplate;
  eventData: any;
  tenantData: any;
  eventForms: any[];
  onSave: (template: PDFTemplate) => void;
  onCancel: () => void;
}

const DEFAULT_SECTIONS: PDFSection[] = [
  {
    id: 'header',
    type: 'header',
    title: 'Header',
    enabled: true,
    order: 1,
    config: {
      fontSize: 20,
      fontWeight: 'bold',
      alignment: 'center',
      template: '{business_name} - {document_type}'
    }
  },
  {
    id: 'business_info',
    type: 'business_info',
    title: 'Business Information',
    enabled: true,
    order: 2,
    config: {
      fontSize: 10,
      alignment: 'left'
    }
  },
  {
    id: 'customer_info',
    type: 'customer_info',
    title: 'Customer Information',
    enabled: true,
    order: 3,
    config: {
      fontSize: 10,
      alignment: 'left'
    }
  },
  {
    id: 'event_details',
    type: 'event_details',
    title: 'Event Details',
    enabled: true,
    order: 4,
    config: {
      fontSize: 10,
      alignment: 'left'
    }
  },
  {
    id: 'services',
    type: 'services',
    title: 'Services Table',
    enabled: true,
    order: 5,
    config: {
      fontSize: 10,
      showBorder: true,
      columns: ['QTY', 'DESCRIPTION', 'PRICE']
    }
  },
  {
    id: 'totals',
    type: 'totals',
    title: 'Totals',
    enabled: true,
    order: 6,
    config: {
      fontSize: 12,
      fontWeight: 'bold',
      alignment: 'right'
    }
  },
  {
    id: 'terms',
    type: 'terms',
    title: 'Terms & Conditions',
    enabled: true,
    order: 7,
    config: {
      fontSize: 9,
      alignment: 'left',
      customText: '• This quote is valid for 30 days from the date of issue\n• A deposit may be required to confirm your booking\n• Final payment is due on completion of service'
    }
  }
];

export const PDFTemplateEditor: React.FC<PDFTemplateEditorProps> = ({
  template,
  eventData,
  tenantData,
  eventForms,
  onSave,
  onCancel
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<PDFTemplate>(
    template || {
      name: 'New Template',
      tenant_id: tenantData?.id || '',
      document_type: 'both',
      sections: DEFAULT_SECTIONS,
      page_settings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 }
      },
      styling: {
        primary_color: '#000000',
        secondary_color: '#666666',
        font_family: 'helvetica',
        logo_position: 'top-left',
        compact_mode: true
      },
      is_default: false
    }
  );

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Format guest count for multiple forms
  const formatGuestCount = () => {
    if (!eventForms || eventForms.length === 0) return '0';
    
    if (eventForms.length === 1) {
      const form = eventForms[0];
      return String((form.men_count || 0) + (form.ladies_count || 0));
    }
    
    // Multiple forms - show individual counts
    const counts = eventForms.map(form => 
      String((form.men_count || 0) + (form.ladies_count || 0))
    );
    return counts.join(' & ');
  };

  const updateSection = (sectionId: string, updates: Partial<PDFSection>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const toggleSection = (sectionId: string) => {
    updateSection(sectionId, { 
      enabled: !currentTemplate.sections.find(s => s.id === sectionId)?.enabled 
    });
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sections = [...currentTemplate.sections];
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    // Swap sections
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    
    // Update order values
    sections.forEach((section, idx) => {
      section.order = idx + 1;
    });

    setCurrentTemplate(prev => ({ ...prev, sections }));
  };

  const addCustomSection = () => {
    const newSection: PDFSection = {
      id: `custom_${Date.now()}`,
      type: 'text',
      title: 'Custom Section',
      enabled: true,
      order: currentTemplate.sections.length + 1,
      config: {
        fontSize: 10,
        alignment: 'left',
        customText: 'Add your custom text here...'
      }
    };

    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const deleteSection = (sectionId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const handleSave = () => {
    if (!currentTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    onSave(currentTemplate);
  };

  const renderSectionConfig = (section: PDFSection) => {
    return (
      <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{section.title} Settings</h4>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => moveSection(section.id, 'up')}
              disabled={section.order === 1}
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => moveSection(section.id, 'down')}
              disabled={section.order === currentTemplate.sections.length}
            >
              ↓
            </Button>
            {!['header', 'business_info', 'customer_info', 'event_details', 'services', 'totals'].includes(section.type) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteSection(section.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Font Size</Label>
            <Input
              type="number"
              value={section.config.fontSize || 10}
              onChange={(e) => updateSection(section.id, {
                config: { ...section.config, fontSize: Number(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label>Alignment</Label>
            <Select
              value={section.config.alignment || 'left'}
              onValueChange={(value) => updateSection(section.id, {
                config: { ...section.config, alignment: value as any }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={section.config.fontWeight === 'bold'}
            onCheckedChange={(checked) => updateSection(section.id, {
              config: { ...section.config, fontWeight: checked ? 'bold' : 'normal' }
            })}
          />
          <Label>Bold Text</Label>
        </div>

        {(section.type === 'text' || section.type === 'terms') && (
          <div>
            <Label>Custom Text</Label>
            <Textarea
              value={section.config.customText || ''}
              onChange={(e) => updateSection(section.id, {
                config: { ...section.config, customText: e.target.value }
              })}
              placeholder="Enter custom text here..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use variables: {'{business_name}'}, {'{customer_name}'}, {'{event_name}'}, {'{guest_count}'}, {'{event_date}'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    const enabledSections = currentTemplate.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);

    return (
      <div className="space-y-6 p-6 bg-white border rounded-lg">
        {enabledSections.map(section => (
          <div key={section.id} className="space-y-2">
            {section.type === 'header' && (
              <div className={`text-center`}>
                <h1 className="text-2xl font-bold">
                  {(section.config.template || '{business_name} - {document_type}')
                    .replace('{business_name}', tenantData?.business_name || 'Business Name')
                    .replace('{document_type}', 'QUOTE')}
                </h1>
              </div>
            )}

            {section.type === 'business_info' && (
              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <div className="text-sm">
                  <p>{tenantData?.business_name}</p>
                  <p>{tenantData?.address_line1}</p>
                  <p>{tenantData?.city}, {tenantData?.postal_code}</p>
                  <p>{tenantData?.contact_phone}</p>
                  <p>{tenantData?.contact_email}</p>
                </div>
              </div>
            )}

            {section.type === 'customer_info' && (
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <div className="text-sm">
                  <p>{eventData?.customers?.name || 'Customer Name'}</p>
                  <p>{eventData?.customers?.email || 'customer@email.com'}</p>
                  <p>{eventData?.customers?.phone || 'Phone Number'}</p>
                </div>
              </div>
            )}

            {section.type === 'event_details' && (
              <div>
                <h3 className="font-semibold mb-2">Event Details:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Event:</strong> {eventData?.event_name || 'Event Name'}</p>
                  <p><strong>Type:</strong> {eventData?.event_type || 'Event Type'}</p>
                  <p><strong>Date:</strong> {eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('en-GB') : 'TBD'}</p>
                  <p><strong>Guests:</strong> {formatGuestCount()}</p>
                  <p><strong>Time:</strong> {
                    eventForms && eventForms.length > 1 
                      ? eventForms.map(form => `${form.start_time || 'TBD'} - ${form.end_time || 'TBD'}`).join(' & ')
                      : `${eventData?.start_time || 'TBD'} - ${eventData?.end_time || 'TBD'}`
                  }</p>
                </div>
              </div>
            )}

            {section.type === 'services' && (
              <div>
                <h3 className="font-semibold mb-2">Services:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-2 grid grid-cols-3 gap-2 text-sm font-semibold">
                    <div>QTY</div>
                    <div>DESCRIPTION</div>
                    <div className="text-right">PRICE</div>
                  </div>
                  
                  {eventForms?.map((eventForm) => 
                    eventForm.guest_price_total > 0 && (
                      <div key={`guest-${eventForm.id}`} className="p-2 grid grid-cols-3 gap-2 text-sm border-b">
                        <div>{(eventForm.men_count || 0) + (eventForm.ladies_count || 0)}</div>
                        <div>{eventForm.form_label} - Guest Pricing</div>
                        <div className="text-right">£{eventForm.guest_price_total.toFixed(2)}</div>
                      </div>
                    )
                  )}
                  
                  {(!eventForms || !eventForms.some(f => f.guest_price_total > 0)) && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No services configured yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {section.type === 'totals' && (
              <div className="border-t pt-4">
                <div className="space-y-2 text-sm max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>£{(eventForms?.reduce((sum, form) => sum + (form.guest_price_total || 0), 0) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>TOTAL:</span>
                    <span>£{(eventForms?.reduce((sum, form) => sum + (form.guest_price_total || 0), 0) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {section.type === 'terms' && section.config.customText && (
              <div>
                <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
                <div className="text-sm whitespace-pre-line">
                  {section.config.customText}
                </div>
              </div>
            )}

            {section.type === 'text' && section.config.customText && (
              <div className="text-sm whitespace-pre-line">
                {section.config.customText
                  .replace('{business_name}', tenantData?.business_name || 'Business Name')
                  .replace('{customer_name}', eventData?.customers?.name || 'Customer Name')
                  .replace('{event_name}', eventData?.event_name || 'Event Name')
                  .replace('{guest_count}', formatGuestCount())
                  .replace('{event_date}', eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('en-GB') : 'TBD')}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Editor Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Template Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>

            <div>
              <Label>Document Type</Label>
              <Select
                value={currentTemplate.document_type}
                onValueChange={(value) => setCurrentTemplate(prev => ({ 
                  ...prev, 
                  document_type: value as 'quote' | 'invoice' | 'both' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Quote Only</SelectItem>
                  <SelectItem value="invoice">Invoice Only</SelectItem>
                  <SelectItem value="both">Both Quote & Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={currentTemplate.styling.primary_color}
                  onChange={(e) => setCurrentTemplate(prev => ({
                    ...prev,
                    styling: { ...prev.styling, primary_color: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Secondary Color</Label>
                <Input
                  type="color"
                  value={currentTemplate.styling.secondary_color}
                  onChange={(e) => setCurrentTemplate(prev => ({
                    ...prev,
                    styling: { ...prev.styling, secondary_color: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={currentTemplate.styling.compact_mode}
                onCheckedChange={(checked) => setCurrentTemplate(prev => ({
                  ...prev,
                  styling: { ...prev.styling, compact_mode: checked }
                }))}
              />
              <Label>Compact Mode</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Sections
              </span>
              <Button size="sm" onClick={addCustomSection}>
                <Plus className="h-4 w-4 mr-1" />
                Add Section
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTemplate.sections
              .sort((a, b) => a.order - b.order)
              .map(section => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                      <span className="font-medium">{section.title}</span>
                      <Badge variant="outline">{section.type}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSection(
                        selectedSection === section.id ? null : section.id
                      )}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedSection === section.id && renderSectionConfig(section)}
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button onClick={handleSave}>
              Save Template
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPreview()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};