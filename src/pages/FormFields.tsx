import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useFormFields } from '@/hooks/useFormFields';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function FormFieldsPage() {
  const navigate = useNavigate();
  const { formFields, fieldsByCategory, deleteField, isDeleting } = useFormFields();

  const handleDeleteField = async (fieldId: string) => {
    await deleteField(fieldId);
  };

  const getFieldIcon = (fieldType: string) => {
    const iconMap: Record<string, string> = {
      text: '📝',
      textarea: '📄',
      number: '🔢',
      email: '📧',
      phone: '📞',
      dropdown: '📋',
      toggle: '🔘',
      price: '💰',
      quantity: '📊',
      counter: '🔢',
      notes: '📝',
    };
    return iconMap[fieldType] || '📄';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Fields Library</h1>
          <p className="text-muted-foreground">
            Manage reusable form fields that can be used across multiple forms
          </p>
        </div>
        <Button onClick={() => navigate('/field-edit')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Field
        </Button>
      </div>

      {Object.keys(fieldsByCategory).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-medium">No fields found</h3>
              <p className="text-muted-foreground">
                Create your first form field to get started
              </p>
              <Button onClick={() => navigate('/field-edit')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(fieldsByCategory).map(([category, fields]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize">
                {category.replace('_', ' ')} Fields
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(fields as any[]).map((field) => (
                  <Card key={field.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{getFieldIcon(field.field_type)}</span>
                          <div>
                            <CardTitle className="text-base">{field.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {field.field_type}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/field-edit/${field.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Field</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{field.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteField(field.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {field.help_text && (
                        <p className="text-sm text-muted-foreground">{field.help_text}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {field.has_pricing && (
                          <Badge variant="secondary">Pricing: £{field.default_price_gbp || 0}</Badge>
                        )}
                        {field.appears_on_quote && (
                          <Badge variant="outline">Quote</Badge>
                        )}
                        {field.appears_on_invoice && (
                          <Badge variant="outline">Invoice</Badge>
                        )}
                        {field.dropdown_options && 
                         Array.isArray(field.dropdown_options) && 
                         field.dropdown_options.length > 0 && (
                          <Badge variant="secondary">
                            {field.dropdown_options.length} options
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}