import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFormFields } from '@/hooks/useFormFields';

export const FieldLibraryPage = () => {
  const navigate = useNavigate();
  const { fieldsByCategory, deleteField, isDeleting } = useFormFields();

  const handleDeleteField = async (fieldId: string) => {
    if (window.confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      deleteField(fieldId);
    }
  };

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return '📝';
      case 'text_notes_only': return '📝';
      case 'fixed_price_notes': return '💰';
      case 'per_person_price_notes': return '👥';
      case 'counter_notes': return '#️⃣';
      case 'dropdown_options': return '📋';
      case 'dropdown_options_price_notes': return '💰📋';
      default: return '⚙️';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Field Library</h1>
          <p className="text-muted-foreground">Create and manage reusable form fields</p>
        </div>
        <Button onClick={() => navigate('/field-library/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Field
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(fieldsByCategory || {}).map(([category, fields]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(fields) && fields.map((field) => (
                <Card key={field.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getFieldIcon(field.field_type)}</span>
                        <div>
                          <h3 className="font-medium">{field.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {field.field_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/field-library/edit/${field.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {field.help_text && (
                      <p className="text-sm text-muted-foreground mb-2">{field.help_text}</p>
                    )}
                    
                    {field.has_pricing && field.default_price_gbp && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-medium">£{field.default_price_gbp}</span>
                      </div>
                    )}
                    
                    {field.dropdown_options && field.dropdown_options.length > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Options:</span>
                        <span className="font-medium">{field.dropdown_options.length}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(fieldsByCategory || {}).length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No fields created yet</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first reusable form field</p>
            <Button onClick={() => navigate('/field-library/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Field
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};