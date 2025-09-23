import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Location } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useFormFields, FormField, DropdownOption } from '@/hooks/useFormFields';
import { UnifiedFieldRenderer } from '@/components/form-builder/UnifiedFieldRenderer';
import { toast } from 'sonner';

export const FieldEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as Location & { state?: { from?: string } };
  const { formFields, createField, updateField, isCreating, isUpdating } = useFormFields();
  
  const isEditing = !!id;
  const existingField = isEditing ? formFields?.find(f => f.id === id) : null;
  
  const [formData, setFormData] = useState<Partial<FormField>>({
    name: '',
    field_type: 'text_notes_only',
    has_pricing: false,
    has_notes: true,
    default_price_gbp: undefined,
    pricing_type: 'fixed',
    placeholder_text: '',
    help_text: '',
    dropdown_options: [],
    appears_on_quote: false,
    appears_on_invoice: false,
    is_multiselect: false
  });

  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (existingField) {
      setFormData({
        ...existingField,
        dropdown_options: existingField.dropdown_options || []
      });
    }
  }, [existingField]);

  const fieldTypeOptions = [
    { value: 'text', label: 'Text Field' },
    { value: 'text_notes_only', label: 'Text with Notes Only' },
    { value: 'fixed_price_notes', label: 'Fixed Price with Notes' },
    { value: 'fixed_price_notes_toggle', label: 'Toggle + Fixed Price with Notes' },
    { value: 'fixed_price_quantity_notes', label: 'Fixed Price with Quantity and Notes' },
    { value: 'fixed_price_quantity_notes_toggle', label: 'Toggle + Fixed Price with Quantity and Notes' },
    { value: 'per_person_price_notes', label: 'Per Person Price with Notes' },
    { value: 'counter_notes', label: 'Counter with Notes' },
    { value: 'dropdown_options', label: 'Dropdown Options' },
    { value: 'dropdown_options_price_notes', label: 'Dropdown Options with Pricing' }
  ];

  const handleFieldTypeChange = (fieldType: string) => {
    setFormData(prev => ({
      ...prev,
      field_type: fieldType as FormField['field_type'],
      has_pricing: ['fixed_price_notes', 'fixed_price_notes_toggle', 'fixed_price_quantity_notes', 'fixed_price_quantity_notes_toggle', 'per_person_price_notes', 'dropdown_options_price_notes'].includes(fieldType),
      has_notes: !['counter_notes'].includes(fieldType),
      default_price_gbp: fieldType === 'per_person_price_notes' ? 0 : undefined,
    }));
  };

  const addDropdownOption = () => {
    const newIndex = formData.dropdown_options?.length || 0;
    setFormData(prev => ({
      ...prev,
      dropdown_options: [
        ...(prev.dropdown_options || []), 
        { 
          label: `Option ${newIndex + 1}`, 
          value: `option_${newIndex + 1}`, 
          price: 0 
        }
      ]
    }));
  };

  const updateDropdownOption = (index: number, field: keyof DropdownOption, value: string | number) => {
    const parsedValue = field === 'price' ? Number(value) : value;
    setFormData(prev => ({
      ...prev,
      dropdown_options: prev.dropdown_options?.map((option, i) => 
        i === index ? { ...option, [field]: parsedValue } : option
      ) || []
    }));
  };

  const removeDropdownOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dropdown_options: prev.dropdown_options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !formData.dropdown_options) return;

    const items = Array.from(formData.dropdown_options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      dropdown_options: items
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Field name is required');
      return;
    }

    if (['dropdown_options', 'dropdown_options_price_notes'].includes(formData.field_type!) && 
        (!formData.dropdown_options || formData.dropdown_options.length === 0)) {
      toast.error('At least one dropdown option is required');
      return;
    }

    try {
      if (isEditing) {
        await updateField({ id: id!, ...formData as FormField });
      } else {
        await createField(formData as Omit<FormField, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>);
      }
      // Check if we came from form builder and should return there
      const fromFormBuilder = location.state?.from?.includes('/form-builder');
      if (fromFormBuilder) {
        navigate(location.state.from);
      } else {
        navigate('/field-library');
      }
    } catch (error) {
      console.error('Error saving field:', error);
    }
  };

  const isDropdownField = ['dropdown_options', 'dropdown_options_price_notes'].includes(formData.field_type!);
  const isPricingField = formData.has_pricing;
  const isSaving = isCreating || isUpdating;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            const fromFormBuilder = location.state?.from?.includes('/form-builder');
            if (fromFormBuilder) {
              navigate(location.state.from);
            } else {
              navigate('/field-library');
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {location.state?.from?.includes('/form-builder') ? 'Back to Form Builder' : 'Back to Form Fields'}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Field' : 'Create New Field'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Modify field configuration' : 'Configure a new reusable form field'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Field Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Field Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter field name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="field_type">Field Type *</Label>
                  <Select value={formData.field_type} onValueChange={handleFieldTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="help_text">Help Text</Label>
                  <Textarea
                    id="help_text"
                    value={formData.help_text || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, help_text: e.target.value }))}
                    placeholder="Optional help text for users"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="placeholder_text">Placeholder Text</Label>
                  <Input
                    id="placeholder_text"
                    value={formData.placeholder_text || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeholder_text: e.target.value }))}
                    placeholder="Optional placeholder text"
                  />
                </div>
              </div>

              <Separator />

              {/* Quote/Invoice Appearance Settings */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Document Appearance</Label>
                  <p className="text-sm text-muted-foreground">Control when this field appears in generated quotes and invoices</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="appears_on_quote"
                      checked={formData.appears_on_quote || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, appears_on_quote: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="appears_on_quote" className="text-sm">
                      Appears on Quotes
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="appears_on_invoice"
                      checked={formData.appears_on_invoice || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, appears_on_invoice: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="appears_on_invoice" className="text-sm">
                      Appears on Invoices
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pricing Configuration */}
              {isPricingField && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Pricing</Label>
                      <p className="text-sm text-muted-foreground">Configure pricing for this field</p>
                    </div>
                    <Badge variant="secondary">Pricing Enabled</Badge>
                  </div>

                  {!isDropdownField && formData.field_type === 'per_person_price_notes' && (
                    <div>
                      <Label htmlFor="default_price_gbp">Default Price (£)</Label>
                      <PriceInput
                        id="default_price_gbp"
                        value={formData.default_price_gbp || 0}
                        onChange={(value) => setFormData(prev => ({ 
                          ...prev, 
                          default_price_gbp: value 
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown Options */}
              {isDropdownField && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Dropdown Options</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure the available options for this dropdown field
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDropdownOption}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>

                  {/* Multi-select toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_multiselect"
                      checked={formData.is_multiselect || false}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_multiselect: checked }))}
                    />
                    <Label htmlFor="is_multiselect" className="text-sm">
                      Allow multiple selections
                    </Label>
                  </div>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="dropdown-options">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {formData.dropdown_options?.map((option, index) => (
                            <Draggable key={index} draggableId={`option-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border rounded-lg p-4 bg-background ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div {...provided.dragHandleProps} className="mt-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div>
                                        <Label className="text-xs">Label</Label>
                                        <Input
                                          value={option.label}
                                          onChange={(e) => updateDropdownOption(index, 'label', e.target.value)}
                                          placeholder="Display label"
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs">Value</Label>
                                        <Input
                                          value={option.value}
                                          onChange={(e) => updateDropdownOption(index, 'value', e.target.value)}
                                          placeholder="Internal value"
                                        />
                                      </div>
                                      
                                      {isPricingField && (
                                        <div>
                                          <Label className="text-xs">Price (£)</Label>
                                          <PriceInput
                                            value={option.price || 0}
                                            onChange={(value) => updateDropdownOption(index, 'price', value)}
                                            placeholder="0.00"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeDropdownOption(index)}
                                      className="text-destructive hover:text-destructive mt-6"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {(!formData.dropdown_options || formData.dropdown_options.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      No options configured. Click "Add Option" to get started.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : (isEditing ? 'Update Field' : 'Create Field')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Live Preview
              <Switch
                checked={showPreview}
                onCheckedChange={setShowPreview}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showPreview && formData.name && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  This preview shows exactly how this field will appear in event forms.
                </div>
                
                <UnifiedFieldRenderer
                  field={formData as FormField}
                  response={{
                    value: formData.field_type === 'counter_notes' ? 0 : '',
                    quantity: formData.field_type === 'per_person_price_notes' ? 0 : 1,
                    price: formData.default_price_gbp || 0,
                    notes: '',
                    enabled: formData.field_type?.includes('toggle') ? false : true,
                    selectedOption: ''
                  }}
                  onChange={() => {}} // Read-only preview
                  readOnly={false} // Allow interaction in preview
                  showInCard={true}
                />
                
                <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                  <div><strong>Type:</strong> {fieldTypeOptions.find(opt => opt.value === formData.field_type)?.label}</div>
                  {isDropdownField && (
                    <div><strong>Options:</strong> {formData.dropdown_options?.length || 0} configured</div>
                  )}
                  <div><strong>Appears on Quotes:</strong> {formData.appears_on_quote ? 'Yes' : 'No'}</div>
                  <div><strong>Appears on Invoices:</strong> {formData.appears_on_invoice ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
            
            {!formData.name && (
              <div className="text-center py-8 text-muted-foreground">
                Enter a field name to see the preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};