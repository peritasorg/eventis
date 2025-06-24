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
import { Sidebar } from '@/components/Sidebar';

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-200">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-200">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Event not found</h2>
              <Button onClick={() => navigate('/events')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </div>
          </div>
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
    <div className="min-h-screen flex w-full bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="flex flex-col space-y-4 mb-6 lg:mb-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/events')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Events</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 truncate">{event.event_name}</h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">{event.event_type}</span>
                  <Badge className={`${getStatusColor(event.status)} border font-medium text-xs sm:text-sm`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button variant="outline" className="flex items-center justify-center gap-2 font-medium text-sm">
                <FileText className="h-4 w-4" />
                Generate Quote
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-2 font-medium text-sm">
                <Receipt className="h-4 w-4" />
                Generate Invoice
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2 font-medium text-sm text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                    Delete Event
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
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={deleteEventMutation.isPending}
                    >
                      {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Business Process Flow - Mobile Optimized */}
          <div className="mb-6 lg:mb-8">
            <div className="max-w-4xl mx-auto">
              <EventBusinessFlow 
                depositPaid={event.deposit_paid}
                balanceCleared={event.balance_cleared}
                eventFinalized={event.event_finalized}
                eventId={event.id}
              />
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-sm sm:max-w-md grid-cols-2 h-10 sm:h-12">
                <TabsTrigger value="overview" className="font-medium text-sm sm:text-base">Overview</TabsTrigger>
                <TabsTrigger value="form" className="font-medium text-sm sm:text-base">Form</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="space-y-0">
              <EventOverviewTab event={event} />
            </TabsContent>
            
            <TabsContent value="form" className="space-y-0">
              <EventFormTab event={event} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
