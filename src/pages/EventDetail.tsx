import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventBusinessFlow } from '@/components/events/EventBusinessFlow';
import { EventOverviewTab } from '@/components/events/EventOverviewTab';
import { EventFormTab } from '@/components/events/EventFormTab';
import { toast } from 'sonner';
import { generateQuotePDF, generateInvoicePDF } from '@/utils/pdfGenerator';

export const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleDeleteEvent = () => {
    deleteEventMutation.mutate({});
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Event not found</h2>
          <Button onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Compact Header */}
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/events')}
                className="shrink-0 h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-foreground mb-1 truncate">{event.event_name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{event.event_type}</span>
                  <Badge variant="secondary" className="text-xs">
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={handleGenerateQuote}
              >
                <FileText className="h-3 w-3 mr-1" />
                Quote
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={handleGenerateInvoice}
              >
                <Receipt className="h-3 w-3 mr-1" />
                Invoice
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{event.event_name}"? This action cannot be undone and will permanently remove all event data, including form responses and financial records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteEvent}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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

        {/* Business Process Flow - Compact */}
        <div className="bg-card rounded-lg border shadow-sm p-4">
          <EventBusinessFlow 
            depositPaid={event.deposit_paid}
            balanceCleared={event.balance_cleared}
            eventFinalized={event.event_finalized}
            eventId={event.id}
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-sm grid-cols-2 h-9 bg-muted">
              <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
              <TabsTrigger value="form" className="text-sm">Form</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview">
            <EventOverviewTab event={event} />
          </TabsContent>
          
          <TabsContent value="form">
            <EventFormTab event={event} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
