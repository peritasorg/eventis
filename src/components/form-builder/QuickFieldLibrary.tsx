
import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuickFieldLibraryProps {
  onAddField: (fieldLibraryId: string) => void;
}

export const QuickFieldLibrary: React.FC<QuickFieldLibraryProps> = ({ onAddField }) => {
  const { currentTenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter fields based on search term
  const filteredFields = useMemo(() => {
    if (!fieldLibrary) return [];
    if (!searchTerm.trim()) return fieldLibrary;
    
    return fieldLibrary.filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.field_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (field.category && field.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [fieldLibrary, searchTerm]);

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return '📝';
      case 'textarea': return '📄';
      case 'number': return '🔢';
      case 'select': return '📋';
      case 'checkbox': return '☑️';
      case 'radio': return '🔘';
      case 'date': return '📅';
      default: return '📝';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-4 pb-3 border-b bg-white">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Field Library</h3>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredFields?.map((field) => (
            <div
              key={field.id}
              className="group p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 cursor-pointer"
              onClick={() => onAddField(field.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getFieldIcon(field.field_type)}</span>
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {field.label}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 capitalize mb-1">
                    {field.field_type.replace('_', ' ')}
                  </p>
                  {field.category && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                      {field.category}
                    </span>
                  )}
                  {field.affects_pricing && (
                    <div className="mt-2">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        £{field.price_modifier || 0}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddField(field.id);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {field.help_text && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {field.help_text}
                </p>
              )}
            </div>
          ))}
          
          {(!filteredFields || filteredFields.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm ? 'No fields found' : 'No fields available'}
              </p>
              <p className="text-xs">
                {searchTerm ? 'Try a different search term' : 'Create fields in the Field Library'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
