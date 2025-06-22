import React, { useState } from 'react';
import { Plus, Search, Filter, Phone, Mail, Calendar, UserPlus, List, CalendarIcon, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ConvertLeadDialog } from '@/components/leads/ConvertLeadDialog';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { LeadsCalendarView } from '@/components/leads/LeadsCalendarView';

export const Leads = () => {
  const { currentTenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeView, setActiveView] = useState('list');
  const [selectedDate, setSelectedDate] = useState('');

  // Get leads with upcoming appointments priority
  const { data: leads, refetch } = useSupabaseQuery(
    ['leads'],
    async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('event_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  );

  // Get upcoming appointments (leads with event dates)
  const upcomingAppointments = leads?.filter(lead => 
    lead.event_date && new Date(lead.event_date) >= new Date()
  ).slice(0, 5) || [];

  const addLeadMutation = useSupabaseMutation(
    async (newLead: any) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          ...newLead,
          tenant_id: currentTenant?.id,
          event_date: selectedDate || newLead.event_date || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Lead added successfully!',
      invalidateQueries: [['leads']],
      onSuccess: () => {
        setIsAddLeadOpen(false);
        setSelectedDate('');
      }
    }
  );

  const updateLeadStatus = useSupabaseMutation(
    async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Lead status updated!',
      invalidateQueries: [['leads']]
    }
  );

  const handleAddLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventDate = formData.get('event_date') as string;
    const eventDateValue = eventDate && eventDate.trim() !== '' ? eventDate : null;
    
    const estimatedGuests = formData.get('estimated_guests') as string;
    const estimatedBudget = formData.get('estimated_budget') as string;
    
    const leadData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company: formData.get('company') as string || null,
      event_type: formData.get('event_type') as string || null,
      event_date: eventDateValue,
      estimated_guests: estimatedGuests && estimatedGuests.trim() !== '' ? parseInt(estimatedGuests) : null,
      estimated_budget: estimatedBudget && estimatedBudget.trim() !== '' ? parseFloat(estimatedBudget) : null,
      source: formData.get('source') as string || 'website',
      notes: formData.get('notes') as string || null,
      status: 'new'
    };

    addLeadMutation.mutate(leadData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'converted': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleConvertLead = (lead: any) => {
    setSelectedLead(lead);
    setConvertDialogOpen(true);
  };

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
    setDetailsDialogOpen(true);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setIsAddLeadOpen(true);
  };

  const handleConversionSuccess = () => {
    refetch();
    setSelectedLead(null);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads & Appointments</h1>
          <p className="text-gray-600">Manage your leads and upcoming appointments</p>
        </div>
        
        <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Add New Lead
                {selectedDate && (
                  <span className="text-sm font-normal text-blue-600 ml-2">
                    for {new Date(selectedDate).toLocaleDateString()}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_type">Event Type</Label>
                  <Select name="event_type">
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_date">Event Date</Label>
                  <Input 
                    id="event_date" 
                    name="event_date" 
                    type="date" 
                    defaultValue={selectedDate}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_guests">Estimated Guests</Label>
                  <Input id="estimated_guests" name="estimated_guests" type="number" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_budget">Estimated Budget (£)</Label>
                  <Input id="estimated_budget" name="estimated_budget" type="number" step="0.01" min="0" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select name="source" defaultValue="website">
                  <SelectTrigger>
                    <SelectValue placeholder="How did they find you?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Any additional notes..." />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddLeadOpen(false);
                  setSelectedDate('');
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLeadMutation.isPending}>
                  {addLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <div className="font-medium">{appointment.name}</div>
                      <div className="text-gray-600">
                        {appointment.event_type} • {new Date(appointment.event_date).toLocaleDateString()}
                      </div>
                    </div>
                    {appointment.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {appointment.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleViewLead(appointment)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={setActiveView} className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="space-y-4">
                {leads?.length ? leads.map((lead) => (
                  <div key={lead.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                          {lead.event_date && new Date(lead.event_date) >= new Date() && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {lead.event_type && <span>{lead.event_type}</span>}
                          {lead.event_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(lead.event_date).toLocaleDateString()}
                            </div>
                          )}
                          {lead.estimated_guests && <span>{lead.estimated_guests} guests</span>}
                          {lead.estimated_budget && <span>£{lead.estimated_budget.toLocaleString()}</span>}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewLead(lead)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        <Select
                          value={lead.status}
                          onValueChange={(status) => updateLeadStatus.mutate({ id: lead.id, status })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="quoted">Quoted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {lead.status !== 'converted' && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertLead(lead)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Convert
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {lead.notes && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {lead.notes}
                      </p>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding your first lead</p>
                    <Button onClick={() => setIsAddLeadOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Lead
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <LeadsCalendarView
            leads={leads || []}
            onLeadClick={handleViewLead}
            onDateClick={handleDateClick}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConvertLeadDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        lead={selectedLead}
        onSuccess={handleConversionSuccess}
      />

      <LeadDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        lead={selectedLead}
        onUpdate={refetch}
      />
    </div>
  );
};
