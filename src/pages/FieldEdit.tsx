import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Location } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useFormFields, FormField, DropdownOption } from '@/hooks/useFormFields';
import { useFieldTypes } from '@/hooks/useFieldTypes';
import { UnifiedFieldRenderer } from '@/components/form-builder/UnifiedFieldRenderer';
import { toast } from 'sonner';

export const FieldEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as Location & { state?: { from?: string } };
  const { formFields, createField, updateField, isCreating, isUpdating } = useFormFields();
  const { fieldTypes } = useFieldTypes();
  
  const fieldTypeOptions = fieldTypes.map(type => ({
    value: type.name,
    label: type.display_name
  }));
  
  const isEditing = !!id;
  const existingField = isEditing ? formFields?.find(f => f.id === id) : null;
  
  const [formData, setFormData] = useState<Partial<FormField>>({
    name: '',
    label: '',
    field_type: 'text',
    category: 'general',
    required: false,
    has_pricing: false,
    pricing_behavior: 'none',
    unit_price: undefined,
    affects_pricing: false,
    has_quantity: false,
    has_notes: true,
    placeholder_text: '',
    help_text: '',
    dropdown_options: [],
    field_config: {},
    sort_order: 0,
    active: true
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


  const handleFieldTypeChange = (fieldType: string) => {
    const fieldTypeInfo = fieldTypes.find(type => type.name === fieldType);
    setFormData(prev => ({
      ...prev,
      field_type: fieldType,
      has_pricing: fieldTypeInfo?.supports_pricing || false,
      has_quantity: fieldTypeInfo?.supports_quantity || false,
      has_notes: fieldTypeInfo?.supports_notes !== false, // Default to true unless explicitly false
      field_config: fieldTypeInfo?.default_config || {}
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

    if (['select', 'radio', 'checkbox'].includes(formData.field_type!) && 
        (!formData.dropdown_options || formData.dropdown_options.length === 0)) {
      toast.error('At least one option is required for this field type');
      return;
    }

    try {
      if (isEditing) {
        await updateField({ id: id!, ...formData as FormField });
      } else {
        await createField(formData as Omit<FormField, 'id'>);
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

  const isDropdownField = ['select', 'radio', 'checkbox'].includes(formData.field_type!);
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
          {location.state?.from?.includes('/form-builder') ? 'Back to Form Builder' : 'Back to Field Library'}
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
                   <Label htmlFor="name">Internal Name *</Label>
                   <Input
                     id="name"
                     value={formData.name || ''}
                     onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                     placeholder="internal_field_name"
                     required
                   />
                 </div>

                 <div>
                   <Label htmlFor="label">Display Label *</Label>
                   <Input
                     id="label"
                     value={formData.label || ''}
                     onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                     placeholder="Field Label"
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

                   {!isDropdownField && (
                     <div>
                       <Label htmlFor="unit_price">Unit Price (£)</Label>
                       <Input
                         id="unit_price"
                         type="number"
                         step="0.01"
                         min="0"
                         value={formData.unit_price || ''}
                         onChange={(e) => setFormData(prev => ({ 
                           ...prev, 
                           unit_price: parseFloat(e.target.value) || undefined 
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
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={option.price || 0}
                                            onChange={(e) => updateDropdownOption(index, 'price', e.target.value)}
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
                <div className="p-4 border rounded-lg bg-muted/50">
                  <UnifiedFieldRenderer
                    field={{
                      ...formData,
                      id: 'preview-field',
                      tenant_id: 'preview-tenant',
                      name: formData.name || 'preview-field',
                      label: formData.label || 'Preview Field',
                      field_type: formData.field_type || 'text',
                      category: formData.category || 'general',
                      required: formData.required || false,
                      has_pricing: formData.has_pricing || false,
                      pricing_behavior: formData.pricing_behavior || 'none',
                      affects_pricing: formData.affects_pricing || false,
                      has_quantity: formData.has_quantity || false,
                      has_notes: formData.has_notes || true,
                      dropdown_options: formData.dropdown_options || [],
                      field_config: formData.field_config || {},
                      sort_order: formData.sort_order || 0,
                      active: formData.active !== false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    } as FormField}
                    response={{
                      value: '',
                      quantity: 1,
                      price: formData.unit_price || 0,
                      notes: '',
                      enabled: true,
                      selectedOption: ''
                    }}
                    onChange={() => {}}
                    readOnly={false}
                    showInCard={false}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground space-y-2">
                  <div><strong>Type:</strong> {fieldTypeOptions.find(opt => opt.value === formData.field_type)?.label}</div>
                   {isPricingField && !isDropdownField && (
                     <div><strong>Unit Price:</strong> £{(formData.unit_price || 0).toFixed(2)}</div>
                   )}
                  {isDropdownField && (
                    <div><strong>Options:</strong> {formData.dropdown_options?.length || 0} configured</div>
                  )}
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