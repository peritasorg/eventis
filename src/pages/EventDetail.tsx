
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
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
      case 'inquiry': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/events')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{event.event_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600">{event.event_type}</span>
              <Badge className={getStatusColor(event.status)}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Quote
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Business Process Flow - Centered */}
      <div className="flex justify-center mb-6">
        <div className="w-full max-w-4xl">
          <EventBusinessFlow 
            depositPaid={event.deposit_paid}
            balanceCleared={event.balance_cleared}
            eventFinalized={event.event_finalized}
            eventId={event.id}
          />
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <EventOverviewTab event={event} />
        </TabsContent>
        
        <TabsContent value="form" className="mt-6">
          <EventFormTab event={event} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
