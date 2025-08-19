import React, { useState } from 'react';
import { Search, Filter, Plus, Eye, Edit, Calendar, Phone, Mail, Users, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { LeadForm } from '@/components/leads/LeadForm';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { AppointmentsCalendarView } from '@/components/leads/AppointmentsCalendarView';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  event_type: string;
  created_at: string;
  appointment_date: string;
  date_of_contact: string;
  men_count: number;
  ladies_count: number;
  guest_mixture: string;
  date_of_interest: string;
  estimated_budget: number;
  notes: string;
  lead_score: number;
}

export const Leads = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "calendar">("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');

  const { data: leads = [], refetch } = useSupabaseQuery(
    ['leads', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.phone?.includes(searchTerm);
    const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
    const matchesEventType = selectedEventType === "all" || lead.event_type === selectedEventType;
    return matchesSearch && matchesStatus && matchesEventType;
  });

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

  const getEventTypeConfig = (eventType: string) => {
    return eventTypeConfigs.find(config => config.event_type === eventType);
  };

  const appointmentsThisWeek = leads.filter(lead => {
    if (!lead.appointment_date) return false;
    const appointmentDate = new Date(lead.appointment_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointmentDate >= now && appointmentDate <= weekFromNow;
  }).length;

  const conversionRate = leads.length > 0 
    ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100)
    : 0;

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Leads & Appointments</h1>
          <p className="text-muted-foreground">Manage your leads and scheduled appointments</p>
        </div>
        <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <LeadForm 
              onSuccess={() => {
                setIsAddLeadOpen(false);
                refetch();
              }}
              eventTypeConfigs={eventTypeConfigs}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{appointmentsThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(l => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(l.created_at) > weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "table" | "calendar")} className="mb-6">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="calendar">Appointments Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search leads by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Event Types</SelectItem>
                      {eventTypeConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.event_type}>
                          {config.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event Details</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date of Interest</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead: Lead) => {
                  const eventConfig = getEventTypeConfig(lead.event_type);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Score: {lead.lead_score || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
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
                          <div className="text-sm text-muted-foreground">
                            {lead.men_count + lead.ladies_count} guests ({lead.guest_mixture})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.appointment_date ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {format(new Date(lead.appointment_date), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-muted-foreground">Scheduled</div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No appointment</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.date_of_interest ? (
                          <div className="text-sm">
                            {format(new Date(lead.date_of_interest), 'dd/MM/yyyy')}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Not specified</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setSelectedLead(lead);
                              setViewMode('view');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedLead(lead);
                              setViewMode('edit');
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first lead</p>
                <Button onClick={() => setIsAddLeadOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Lead
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <AppointmentsCalendarView leads={leads} eventTypeConfigs={eventTypeConfigs} />
        </TabsContent>
      </Tabs>

      {/* Lead Details Dialogs */}
      {selectedLead && (
        <LeadDetailsDialog 
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => {
            if (!open) setSelectedLead(null);
          }}
          onUpdate={refetch}
          isEditMode={viewMode === 'edit'}
        />
      )}
    </div>
  );
};