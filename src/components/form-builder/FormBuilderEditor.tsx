
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Save, X } from 'lucide-react';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FormBuilderEditorProps {
  form: any;
  open: boolean;
  onClose: () => void;
}

export const FormBuilderEditor: React.FC<FormBuilderEditorProps> = ({ form, open, onClose }) => {
  const { currentTenant } = useAuth();
  const [formFields, setFormFields] = useState<any[]>([]);

  const { data: fieldLibrary } = useSupabaseQuery(
    ['field-library'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('field_library')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Field library error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: existingFields } = useSupabaseQuery(
    ['form-field-instances', form.id],
    async () => {
      if (!form.id || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('form_field_instances')
        .select('*, field_library(*)')
        .eq('form_template_id', form.id)
        .eq('tenant_id', currentTenant.id)
        .order('field_order');
      
      if (error) {
        console.error('Form fields error:', error);
        return [];
      }
      
      setFormFields(data || []);
      return data || [];
    }
  );

  const addFieldMutation = useSupabaseMutation(
    async (fieldData: any) => {
      const { data, error } = await supabase
        .from('form_field_instances')
        .insert([{
          ...fieldData,
          tenant_id: currentTenant?.id,
          form_template_id: form.id
        }])
        .select('*, field_library(*)')
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Field added to form!',
      onSuccess: (newField) => {
        setFormFields(prev => [...prev, newField]);
      }
    }
  );

  const removeFieldMutation = useSupabaseMutation(
    async (fieldInstanceId: string) => {
      const { error } = await supabase
        .from('form_field_instances')
        .delete()
        .eq('id', fieldInstanceId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Field removed from form!',
      onSuccess: (_, fieldInstanceId) => {
        setFormFields(prev => prev.filter(f => f.id !== fieldInstanceId));
      }
    }
  );

  const handleAddField = (fieldLibraryId: string) => {
    const maxOrder = Math.max(...formFields.map(f => f.field_order), 0);
    
    addFieldMutation.mutate({
      field_library_id: fieldLibraryId,
      field_order: maxOrder + 1
    });
  };

  const handleRemoveField = (fieldInstanceId: string) => {
    removeFieldMutation.mutate(fieldInstanceId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Form: {form.name}</span>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Fields Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Fields from Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fieldLibrary?.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-gray-600">{field.field_type}</div>
                      {field.affects_pricing && (
                        <div className="text-xs text-green-600">£{field.price_modifier}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddField(field.id)}
                      disabled={formFields.some(f => f.field_library_id === field.id)}
                      className="h-7"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Fields Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Form Fields ({formFields.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {formFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No fields added yet. Add fields from the library above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formFields.map((fieldInstance, index) => {
                    const field = fieldInstance.field_library;
                    return (
                      <div key={fieldInstance.id} className="flex items-center gap-3 p-3 border rounded">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">{field.label}</div>
                              <div className="text-xs text-gray-600">{field.field_type}</div>
                            </div>
                            {field.affects_pricing && (
                              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                £{field.price_modifier}
                              </div>
                            )}
                          </div>
                          
                          {field.help_text && (
                            <div className="text-xs text-gray-500 mb-2">{field.help_text}</div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Custom Label (optional)</Label>
                              <Input
                                value={fieldInstance.label_override || ''}
                                placeholder={field.label}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Help Text Override</Label>
                              <Input
                                value={fieldInstance.help_text_override || ''}
                                placeholder={field.help_text || 'No help text'}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id={`required-${fieldInstance.id}`}
                                checked={fieldInstance.required_override ?? true}
                                size="sm"
                              />
                              <Label htmlFor={`required-${fieldInstance.id}`} className="text-xs">Required</Label>
                            </div>
                            <div>
                              <Label className="text-xs">Width</Label>
                              <Select value={fieldInstance.field_width || 'full'}>
                                <SelectTrigger className="h-7 text-xs w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full">Full</SelectItem>
                                  <SelectItem value="half">Half</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveField(fieldInstance.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save/Cancel Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} size="sm">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
