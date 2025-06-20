
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventBusinessFlow } from '@/components/events/EventBusinessFlow';
import { EventOverviewTab } from '@/components/events/EventOverviewTab';
import { EventFormTab } from '@/components/events/EventFormTab';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h2>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/events')}
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.event_name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 font-medium">{event.event_type}</span>
                <Badge className={`${getStatusColor(event.status)} border font-medium`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4" />
              Generate Quote
            </Button>
            <Button variant="outline" className="flex items-center gap-2 font-medium">
              <Receipt className="h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Business Process Flow - Properly Centered */}
        <div className="mb-8">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
              <TabsTrigger value="overview" className="font-medium">Overview</TabsTrigger>
              <TabsTrigger value="form" className="font-medium">Form</TabsTrigger>
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
  );
};
