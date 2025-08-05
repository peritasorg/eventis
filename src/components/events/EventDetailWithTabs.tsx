import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Edit2, Receipt, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventOverviewTab } from './EventOverviewTab';
import { EventFormTab } from './EventFormTab';
import { AddFormTabDialog } from './AddFormTabDialog';
import { toast } from 'sonner';
import { useManualEventSync } from '@/hooks/useCalendarSync';
import { generateQuotePDF, generateInvoicePDF } from '@/utils/pdfGenerator';
import { EventBusinessFlow } from './EventBusinessFlow';

export const EventDetailWithTabs = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { syncEvent } = useManualEventSync();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabLabel, setEditingTabLabel] = useState('');

  // Fetch event data
  const { data: event, isLoading } = useSupabaseQuery(
    ['event', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            company
          )
        `)
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Event detail error:', error);
        return null;
      }
      
      return data;
    }
  );

  // Fetch event forms
  const { data: eventForms, refetch: refetchForms } = useSupabaseQuery(
    ['event-forms', eventId],
    async () => {
      if (!eventId || !currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('event_forms')
        .select(`
          *,
          form_templates (
            id,
            name,
            description
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('tab_order');
      
      if (error) {
        console.error('Event forms error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  // Fetch tenant details for PDF generation
  const { data: tenantDetails } = useSupabaseQuery(
    ['tenant-details', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', currentTenant.id)
        .single();
      
      if (error) {
        console.error('Tenant details error:', error);
        return null;
      }
      
      return data;
    }
  );

  // Update event mutation
  const updateEventMutation = useSupabaseMutation(
    async (updates: any) => {
      if (!event?.id) throw new Error('Event not found');
      
      // If not multiple days, set end date to start date
      if (!updates.event_multiple_days && updates.event_start_date) {
        updates.event_end_date = updates.event_start_date;
      }
      
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', event.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Event updated successfully!',
      invalidateQueries: [['event', event?.id]]
    }
  );

  // Delete event mutation
  const deleteEventMutation = useSupabaseMutation(
    async () => {
      if (!eventId || !currentTenant?.id) throw new Error('Missing event ID or tenant');
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Event deleted successfully');
        navigate('/events');
      },
      onError: (error) => {
        toast.error('Failed to delete event: ' + error.message);
      }
    }
  );

  // Update form tab label mutation
  const updateFormTabMutation = useSupabaseMutation(
    async ({ formId, label }: { formId: string; label: string }) => {
      const { data, error } = await supabase
        .from('event_forms')
        .update({ form_label: label })
        .eq('id', formId)
        .eq('tenant_id', currentTenant?.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Tab renamed successfully!',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  // Delete form tab mutation
  const deleteFormTabMutation = useSupabaseMutation(
    async (formId: string) => {
      const { error } = await supabase
        .from('event_forms')
        .update({ is_active: false })
        .eq('id', formId)
        .eq('tenant_id', currentTenant?.id);
      
      if (error) throw error;
    },
    {
      successMessage: 'Form tab removed successfully!',
      invalidateQueries: [['event-forms', eventId]]
    }
  );

  const handleUpdateEventName = (name: string) => {
    updateEventMutation.mutate({ event_name: name });
  };

  const handleSyncToCalendar = async () => {
    if (!eventId) return;
    
    toast.loading('Syncing to calendar...', { id: 'calendar-sync' });
    
    try {
      const results = await syncEvent(eventId, 'create');
      const successful = results.filter(r => r.success).length;
      
      if (successful > 0) {
        toast.success(`Event synced to ${successful} calendar(s) successfully!`, { id: 'calendar-sync' });
      } else {
        toast.info('No calendar integrations available to sync to', { id: 'calendar-sync' });
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      toast.error('Failed to sync to calendar', { id: 'calendar-sync' });
    }
  };

  const handleGenerateQuote = () => {
    if (!event || !tenantDetails) {
      toast.error('Missing event or tenant information');
      return;
    }
    
    try {
      generateQuotePDF(event, tenantDetails);
      toast.success('Quote PDF generated successfully');
    } catch (error) {
      console.error('Error generating quote PDF:', error);
      toast.error('Failed to generate quote PDF');
    }
  };

  const handleGenerateInvoice = () => {
    if (!event || !tenantDetails) {
      toast.error('Missing event or tenant information');
      return;
    }
    
    try {
      generateInvoicePDF(event, tenantDetails);
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleEditTabLabel = (formId: string, currentLabel: string) => {
    setEditingTabId(formId);
    setEditingTabLabel(currentLabel);
  };

  const handleSaveTabLabel = () => {
    if (editingTabId && editingTabLabel.trim()) {
      updateFormTabMutation.mutate({
        formId: editingTabId,
        label: editingTabLabel.trim()
      });
    }
    setEditingTabId(null);
    setEditingTabLabel('');
  };

  const handleDeleteTab = (formId: string) => {
    deleteFormTabMutation.mutate(formId);
    if (activeTab === formId) {
      setActiveTab('overview');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Event not found</h2>
          <Button onClick={() => navigate('/events')} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/events')}
                className="h-9 w-9 p-0 hover:bg-accent rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{event.event_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground capitalize">{event.event_type}</span>
                  <EventBusinessFlow
                    depositPaid={event.deposit_paid || false}
                    balanceCleared={event.balance_cleared || false}
                    eventFinalized={event.event_finalized || false}
                    eventId={event.id}
                    compact={true}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncToCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                Sync
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateQuote}>
                <Receipt className="h-4 w-4 mr-2" />
                Quote
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateInvoice}>
                <Receipt className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{event.event_name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteEventMutation.mutate(undefined)}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={deleteEventMutation.isPending}
                    >
                      {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border bg-background sticky top-[73px] z-10">
            <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0 space-x-8">
              <TabsTrigger
                value="overview"
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-0 font-medium"
              >
                Overview
              </TabsTrigger>
              
              {eventForms?.map((form) => (
                <div key={form.id} className="flex items-center group">
                  {editingTabId === form.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingTabLabel}
                        onChange={(e) => setEditingTabLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTabLabel();
                          if (e.key === 'Escape') {
                            setEditingTabId(null);
                            setEditingTabLabel('');
                          }
                        }}
                        onBlur={handleSaveTabLabel}
                        className="h-8 w-32 text-sm"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <TabsTrigger
                        value={form.id}
                        className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-0 font-medium"
                      >
                        {form.form_label}
                      </TabsTrigger>
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditTabLabel(form.id, form.form_label)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTab(form.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddFormOpen(true)}
                className="h-8 px-3 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Form
              </Button>
            </TabsList>
          </div>

          <div className="py-6">
            <TabsContent value="overview" className="mt-0">
              <EventOverviewTab event={event} />
            </TabsContent>
            
            {eventForms?.map((form) => (
              <TabsContent key={form.id} value={form.id} className="mt-0">
                <EventFormTab event={form} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <AddFormTabDialog
        open={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        eventId={eventId || ''}
        nextTabOrder={0} // Will be calculated by the database function
        onSuccess={() => {
          refetchForms();
          setIsAddFormOpen(false);
        }}
      />
    </div>
  );
};