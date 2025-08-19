import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, User, Calendar, Mail, Phone, Users, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { LeadForm } from './LeadForm';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LeadDetailsDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isEditMode?: boolean;
}

export const LeadDetailsDialog: React.FC<LeadDetailsDialogProps> = ({
  lead,
  open,
  onOpenChange,
  onUpdate,
  isEditMode = false
}) => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();
  const [isEditing, setIsEditing] = useState(isEditMode);
  const [isConverting, setIsConverting] = useState(false);

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
      // Create customer record
      const customerData = {
        tenant_id: currentTenant.id,
        name: lead.name.trim(),
        email: lead.email?.trim() || null,
        phone: lead.phone?.trim() || null,
        customer_type: 'individual',
        notes: lead.notes?.trim() || null,
        lead_id: lead.id,
        active: true,
        customer_since: new Date().toISOString().split('T')[0],
        marketing_consent: false,
        vip_status: false,
        preferred_contact_method: 'email'
      };

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (customerError) throw customerError;

      // Update lead status to won
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'won',
          conversion_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)
        .eq('tenant_id', currentTenant.id);

      if (leadError) throw leadError;

      toast.success('Lead successfully converted to customer!');
      onOpenChange(false);
      onUpdate();
      navigate(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Error converting lead to customer:', error);
      
      if (error.message?.includes('duplicate')) {
        toast.error('A customer with this information already exists.');
      } else if (error.message?.includes('not-null')) {
        toast.error('Missing required customer information.');
      } else {
        toast.error(`Failed to convert lead: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const eventConfig = eventTypeConfigs.find(config => config.event_type === lead.event_type);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{lead.name}</DialogTitle>
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
            <div className="flex gap-2">
              {!isEditing && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {lead.status !== 'won' && !isEditing && (
                <Button 
                  onClick={convertToCustomer}
                  disabled={isConverting}
                  className="bg-primary hover:bg-primary/90"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {isConverting ? 'Converting...' : 'Convert to Customer'}
                </Button>
              )}
              {isEditing && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {isEditing ? (
            <LeadForm 
              leadData={lead}
              isEdit={true}
              onSuccess={() => {
                setIsEditing(false);
                onUpdate();
                toast.success('Lead updated successfully!');
              }}
              eventTypeConfigs={eventTypeConfigs}
            />
          ) : (
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
                    <p className="text-foreground">{eventConfig?.display_name || lead.event_type || 'Not specified'}</p>
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
          )}

          {/* Notes */}
          {!isEditing && lead.notes && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};