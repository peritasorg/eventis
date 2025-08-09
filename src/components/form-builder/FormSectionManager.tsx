import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FormSectionManagerProps {
  formId: string;
  onSectionSelect?: (sectionId: string) => void;
  selectedSectionId?: string;
}

interface Section {
  id: string;
  section_title: string | null;
  section_description: string | null;
  section_order: number;
  form_page_id: string | null;
  tenant_id: string | null;
  created_at: string;
  background_color: string | null;
  layout_type: string | null;
}

export const FormSectionManager: React.FC<FormSectionManagerProps> = ({
  formId,
  onSectionSelect,
  selectedSectionId
}) => {
  const { currentTenant } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Fetch form sections
  const { data: sections, refetch: refetchSections } = useSupabaseQuery(
    ['form-sections', formId],
    async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('form_sections')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('section_order');
      
      if (error) {
        console.error('Form sections error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Create section mutation
  const createSectionMutation = useSupabaseMutation(
    async (sectionData: { section_title: string; section_description?: string }) => {
      const maxOrder = sections?.length ? Math.max(...sections.map(s => s.section_order)) : 0;
      
      const { data, error } = await supabase
        .from('form_sections')
        .insert([{
          section_title: sectionData.section_title,
          section_description: sectionData.section_description,
          section_order: maxOrder + 1,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Section created successfully!',
      onSuccess: () => {
        setIsCreateOpen(false);
        refetchSections();
      }
    }
  );

  // Update section mutation
  const updateSectionMutation = useSupabaseMutation(
    async (variables: { id: string; section_title: string; section_description?: string }) => {
      const { data, error } = await supabase
        .from('form_sections')
        .update({ 
          section_title: variables.section_title,
          section_description: variables.section_description 
        })
        .eq('id', variables.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Section updated successfully!',
      onSuccess: () => {
        setEditingSection(null);
        refetchSections();
      }
    }
  );

  // Delete section mutation
  const deleteSectionMutation = useSupabaseMutation(
    async (sectionId: string) => {
      const { error } = await supabase
        .from('form_sections')
        .delete()
        .eq('id', sectionId);
      
      if (error) throw error;
    },
    {
      successMessage: 'Section deleted successfully!',
      onSuccess: refetchSections
    }
  );

  // Reorder sections mutation
  const reorderSectionsMutation = useSupabaseMutation(
    async (reorderedSections: Section[]) => {
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        section_order: index + 1,
      }));
      
      for (const update of updates) {
        await supabase
          .from('form_sections')
          .update({ section_order: update.section_order })
          .eq('id', update.id);
      }
    },
    {
      successMessage: 'Sections reordered successfully!',
      invalidateQueries: [['form-sections', formId]],
    }
  );

  const handleDragEnd = (result: any) => {
    if (!result.destination || !sections) return;
    
    const reorderedSections = Array.from(sections);
    const [movedSection] = reorderedSections.splice(result.source.index, 1);
    reorderedSections.splice(result.destination.index, 0, movedSection);
    
    reorderSectionsMutation.mutate(reorderedSections);
  };

  const handleCreateSection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createSectionMutation.mutate({
      section_title: formData.get('title') as string,
      section_description: formData.get('description') as string
    });
  };

  const handleUpdateSection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSection) return;
    
    const formData = new FormData(e.currentTarget);
    
    updateSectionMutation.mutate({
      id: editingSection.id,
      section_title: formData.get('title') as string,
      section_description: formData.get('description') as string
    });
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Form Sections</h3>
          <p className="text-sm text-muted-foreground">Organize your form into logical sections</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div>
                <Label htmlFor="title">Section Title *</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="e.g., Contact Information"
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Describe what this section covers..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSectionMutation.isPending}>
                  {createSectionMutation.isPending ? 'Creating...' : 'Create Section'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sections List */}
      {sections?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">No sections created yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="form-sections">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3"
              >
                {sections?.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        } ${
                          selectedSectionId === section.id ? 'ring-2 ring-primary' : ''
                        } cursor-pointer transition-all`}
                        onClick={() => onSectionSelect?.(section.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="p-1 text-muted-foreground hover:text-foreground cursor-grab"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSectionCollapse(section.id);
                                }}
                              >
                                {collapsedSections.has(section.id) ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                              
                              <div>
                                <CardTitle className="text-base">{section.section_title || 'Untitled Section'}</CardTitle>
                                {section.section_description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {section.section_description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                #{section.section_order}
                              </Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSection(section);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSectionMutation.mutate(section.id);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {!collapsedSections.has(section.id) && (
                          <CardContent className="pt-0">
                            <div className="text-sm text-muted-foreground">
                              Click to select this section and add fields to it
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSection} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Section Title *</Label>
              <Input 
                id="edit-title" 
                name="title" 
                defaultValue={editingSection?.section_title || ''}
                required 
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                name="description" 
                defaultValue={editingSection?.section_description || ''}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSectionMutation.isPending}>
                {updateSectionMutation.isPending ? 'Updating...' : 'Update Section'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};