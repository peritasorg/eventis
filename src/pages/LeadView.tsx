
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Users, Calendar, Mail, Phone, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { LeadForm } from '@/components/leads/LeadForm';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const LeadView = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const { data: lead, isLoading, refetch } = useSupabaseQuery(
    ['lead', leadId, currentTenant?.id],
    async () => {
      if (!leadId || !currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'contacted': return 'default';
      case 'qualified': return 'outline';
      case 'quoted': return 'outline';
      case 'won': return 'default';
      case 'lost': return 'destructive';
      default: return 'secondary';
    }
  };

  const convertToCustomer = async () => {
    if (!lead || !currentTenant?.id) return;

    setIsConverting(true);
    try {
      // Split the full name into first and last name
      const nameParts = lead.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create customer record
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          tenant_id: currentTenant.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          customer_type: 'individual',
          notes: lead.notes,
          lead_id: lead.id,
          active: true
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      // Update lead status to won
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'won',
          conversion_date: new Date().toISOString()
        })
        .eq('id', lead.id)
        .eq('tenant_id', currentTenant.id);

      if (leadError) throw leadError;

      toast.success('Lead successfully converted to customer!');
      navigate(`/customers/${customer.id}`);
    } catch (error) {
      console.error('Error converting lead to customer:', error);
      toast.error('Failed to convert lead to customer. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lead Not Found</h1>
          <p className="text-muted-foreground mb-4">The lead you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/leads')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{lead.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
                {eventConfig && (
                  <Badge 
                    variant="outline" 
                    style={{ 
                      backgroundColor: eventConfig.color + '20',
                      borderColor: eventConfig.color,
                      color: eventConfig.text_color 
                    }}
                  >
                    {eventConfig.display_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
            {lead.status !== 'won' && (
              <Button 
                onClick={convertToCustomer}
                disabled={isConverting}
                className="bg-primary hover:bg-primary/90"
              >
                {isConverting ? 'Converting...' : 'Convert to Customer'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-foreground">{lead.name}</p>
              </div>
              {lead.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Source</label>
                <p className="text-foreground capitalize">{lead.source}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lead Score</label>
                <p className="text-foreground">{lead.lead_score || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                <p className="text-foreground">{eventConfig?.display_name || lead.event_type}</p>
              </div>
              {lead.date_of_interest && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Interest</label>
                  <p className="text-foreground">
                    {format(new Date(lead.date_of_interest), 'EEEE, dd MMMM yyyy')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Guest Information</label>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{lead.men_count + lead.ladies_count} guests ({lead.guest_mixture})</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {lead.men_count} men, {lead.ladies_count} ladies
                </p>
              </div>
              {lead.estimated_budget && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estimated Budget</label>
                  <p className="text-foreground">£{parseFloat(lead.estimated_budget).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Appointment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.appointment_date ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Scheduled Appointment</label>
                  <p className="text-foreground">
                    {format(new Date(lead.appointment_date), 'EEEE, dd MMMM yyyy')}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">No appointment scheduled</p>
                </div>
              )}
              {lead.date_of_contact && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Contact</label>
                  <p className="text-foreground">
                    {format(new Date(lead.date_of_contact), 'dd MMMM yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                {lead.updated_at && lead.updated_at !== lead.created_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                )}
                {lead.conversion_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Converted to Customer</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lead.conversion_date), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {lead.notes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <LeadForm 
              leadData={lead}
              isEdit={true}
              onSuccess={() => {
                setIsEditOpen(false);
                refetch();
              }}
              eventTypeConfigs={eventTypeConfigs}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
