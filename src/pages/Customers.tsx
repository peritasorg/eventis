import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  customer_type: string;
  total_spent: number;
  total_events: number;
  last_event_date?: string;
  customer_since: string;
  notes?: string;
  active: boolean;
  vip_status: boolean;
  marketing_consent: boolean;
}

export const Customers = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    customer_type: 'individual',
    notes: '',
    marketing_consent: false,
    vip_status: false
  });

  const { data: customers = [], refetch } = useSupabaseQuery(
    ['customers', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  );

  const createCustomerMutation = useSupabaseMutation(
    async (customerData: any) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          tenant_id: currentTenant?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Customer created successfully');
        setIsCreateModalOpen(false);
        resetForm();
        refetch();
      },
      onError: (error) => {
        console.error('Error creating customer:', error);
        toast.error('Failed to create customer');
      }
    }
  );

  const deleteCustomerMutation = useSupabaseMutation(
    async (customerId: string) => {
      // First, get the customer to find the associated lead_id
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('lead_id')
        .eq('id', customerId)
        .single();

      if (fetchError) throw fetchError;

      // Deactivate the customer
      const { error } = await supabase
        .from('customers')
        .update({ active: false })
        .eq('id', customerId);
      
      if (error) throw error;

      // If there's an associated lead, clear its conversion_date so it can be converted again
      if (customer.lead_id) {
        const { error: leadError } = await supabase
          .from('leads')
          .update({ 
            conversion_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.lead_id);

        if (leadError) {
          console.error('Error clearing lead conversion date:', leadError);
          // Don't throw here as the customer was already deleted successfully
        }
      }
    },
    {
      onSuccess: () => {
        toast.success('Customer deleted successfully');
        refetch();
      },
      onError: (error) => {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      customer_type: 'individual',
      notes: '',
      marketing_consent: false,
      vip_status: false
    });
  };

  const handleCreate = () => {
    createCustomerMutation.mutate(formData);
  };

  const handleEdit = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleView = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleDelete = (customer: Customer) => {
    if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm);
    const matchesType = selectedType === "all" || customer.customer_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Customer Management</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="customer@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+44 7123 456789"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <Label htmlFor="customer_type">Customer Type</Label>
                <Select value={formData.customer_type} onValueChange={(value) => setFormData({...formData, customer_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about the customer"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing_consent"
                  checked={formData.marketing_consent}
                  onChange={(e) => setFormData({...formData, marketing_consent: e.target.checked})}
                />
                <Label htmlFor="marketing_consent">Marketing consent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="vip_status"
                  checked={formData.vip_status}
                  onChange={(e) => setFormData({...formData, vip_status: e.target.checked})}
                />
                <Label htmlFor="vip_status">VIP status</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name || createCustomerMutation.isPending}>
                  {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer: Customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    {customer.company && (
                      <div className="text-sm text-muted-foreground">{customer.company}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div className="text-muted-foreground">{customer.phone}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.customer_type === 'corporate' ? 'default' : 'secondary'}>
                    {customer.customer_type}
                  </Badge>
                </TableCell>
                <TableCell>{customer.total_events || 0}</TableCell>
                <TableCell>£{(customer.total_spent || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="outline">Active</Badge>
                    {customer.vip_status && (
                      <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleView(customer)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(customer)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first customer</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};