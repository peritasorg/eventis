import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Calendar, Phone, Mail, Users, Clock, Trash2, UserCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEventTypeConfigs } from '@/hooks/useEventTypeConfigs';
import { LeadForm } from '@/components/leads/LeadForm';
import { LeadsCalendarView } from '@/components/leads/LeadsCalendarView';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  
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
  conversion_date?: string;
  event_date?: string;
}

export const Leads = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const { data: eventTypeConfigs = [] } = useEventTypeConfigs();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "calendar">("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Multi-select state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: leads = [], refetch } = useSupabaseQuery(
    ['leads', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers(id, lead_id)
        `)
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
    const matchesEventType = selectedEventType === "all" || lead.event_type === selectedEventType;
    
    // Filter by conversion status
    const isConverted = lead.conversion_date || (lead as any).customers?.length > 0;
    const matchesStatus = selectedStatus === "all" || 
                         (selectedStatus === "converted" && isConverted) ||
                         (selectedStatus === "active" && !isConverted);
    
    return matchesSearch && matchesEventType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'secondary';
      case 'in_progress': return 'default';
      case 'converted': return 'default';
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
    ? Math.round((leads.filter(l => l.conversion_date).length / leads.length) * 100)
    : 0;

  // Multi-select handlers
  const handleSelectAll = (checked: boolean) => {
    setIsAllSelected(checked);
    setSelectedLeadIds(checked ? filteredLeads.map(lead => lead.id) : []);
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, leadId]);
    } else {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
      setIsAllSelected(false);
    }
  };

  // Bulk operations
  const handleBulkConvertToCustomers = async () => {
    if (selectedLeadIds.length === 0) return;
    
    setIsLoading(true);
    try {
      const selectedLeads = leads.filter(lead => selectedLeadIds.includes(lead.id));
      
      for (const lead of selectedLeads) {
        // Create customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            tenant_id: currentTenant?.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            lead_id: lead.id,
            customer_since: new Date().toISOString().split('T')[0],
            active: true
          })
          .select()
          .single();

        if (customerError) throw customerError;

        // Update lead conversion date
        const { error: leadError } = await supabase
          .from('leads')
          .update({ 
            conversion_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (leadError) throw leadError;
      }

      toast.success(`Successfully converted ${selectedLeadIds.length} lead(s) to customers`);
      setSelectedLeadIds([]);
      setIsAllSelected(false);
      refetch();
    } catch (error) {
      console.error('Error converting leads:', error);
      toast.error('Failed to convert leads to customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    
    setIsLoading(true);
    try {
      // Check if any of the selected leads have linked customers
      const { data: linkedCustomers, error: checkError } = await supabase
        .from('customers')
        .select('lead_id')
        .in('lead_id', selectedLeadIds);

      if (checkError) throw checkError;

      const leadsWithCustomers = linkedCustomers?.map(c => c.lead_id) || [];
      const leadsToDelete = selectedLeadIds.filter(id => !leadsWithCustomers.includes(id));

      if (leadsWithCustomers.length > 0) {
        toast.error(`Cannot delete ${leadsWithCustomers.length} lead(s) that have been converted to customers. Only deleting unconverted leads.`);
      }

      if (leadsToDelete.length === 0) {
        toast.error('No leads can be deleted. All selected leads have been converted to customers.');
        return;
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadsToDelete);

      if (error) throw error;

      toast.success(`Successfully deleted ${leadsToDelete.length} lead(s)`);
      setSelectedLeadIds([]);
      setIsAllSelected(false);
      refetch();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast.error('Failed to delete leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleDelete = async (leadId: string) => {
    setIsLoading(true);
    try {
      // First check if there are customers linked to this lead
      const { data: linkedCustomers, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('lead_id', leadId);

      if (checkError) throw checkError;

      if (linkedCustomers && linkedCustomers.length > 0) {
        // If there are linked customers, show a more specific error
        toast.error('Cannot delete lead: This lead has been converted to a customer. You can only delete leads that haven\'t been converted yet.');
        return;
      }

      // If no linked customers, proceed with deletion
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setIsLoading(false);
    }
  };


  const handleCalendarLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditMode(true);
  };

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
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedLeadIds.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {selectedLeadIds.length} lead(s) selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedLeadIds([]);
                        setIsAllSelected(false);
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBulkConvertToCustomers}
                      disabled={isLoading}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Convert to Customers
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isLoading}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Leads</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedLeadIds.length} selected lead(s)? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all leads"
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Appointment</TableHead>
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
                        <Checkbox
                          checked={selectedLeadIds.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                          aria-label={`Select ${lead.name}`}
                        />
                      </TableCell>
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
                        {lead.conversion_date || (lead as any).customers?.length > 0 ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            Converted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Active
                          </Badge>
                        )}
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
                              setIsEditMode(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!(lead.conversion_date || (lead as any).customers?.length > 0) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this lead? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleSingleDelete(lead.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
          <LeadsCalendarView 
            leads={leads} 
            eventTypeConfigs={eventTypeConfigs}
            onLeadClick={handleCalendarLeadClick}
          />
        </TabsContent>
      </Tabs>

      {/* Lead Edit/View Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? 'Edit Lead' : 'View Lead'}
              </DialogTitle>
            </DialogHeader>
            <LeadForm 
              leadData={selectedLead}
              isEdit={isEditMode}
              onSuccess={() => {
                setSelectedLead(null);
                refetch();
              }}
              eventTypeConfigs={eventTypeConfigs}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};