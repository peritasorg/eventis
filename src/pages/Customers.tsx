
import React, { useState } from 'react';
import { Search, Filter, Plus, Edit, Eye, Trash2 } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

  const updateCustomerMutation = useSupabaseMutation(
    async ({ id, ...customerData }: any) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        toast.success('Customer updated successfully');
        setIsEditModalOpen(false);
        resetForm();
        refetch();
      },
      onError: (error) => {
        console.error('Error updating customer:', error);
        toast.error('Failed to update customer');
      }
    }
  );

  const deleteCustomerMutation = useSupabaseMutation(
    async (customerId: string) => {
      const { error } = await supabase
        .from('customers')
        .update({ active: false })
        .eq('id', customerId);
      
      if (error) throw error;
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
    setSelectedCustomer(null);
  };

  const handleCreate = () => {
    createCustomerMutation.mutate(formData);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      customer_type: customer.customer_type,
      notes: customer.notes || '',
      marketing_consent: customer.marketing_consent,
      vip_status: customer.vip_status
    });
    setIsEditModalOpen(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const handleUpdate = () => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({
        id: selectedCustomer.id,
        ...formData
      });
    }
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
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
                      <div className="text-sm text-gray-500">{customer.company}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {customer.email && <div>{customer.email}</div>}
                    {customer.phone && <div className="text-gray-500">{customer.phone}</div>}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">Start by adding your first customer</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Customer
            </Button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Same form fields as create modal */}
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+44 7123 456789"
              />
            </div>
            <div>
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData({...formData, company: e.target.value})}
                placeholder="Company name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="edit-customer_type">Customer Type</Label>
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
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about the customer"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-marketing_consent"
                checked={formData.marketing_consent}
                onChange={(e) => setFormData({...formData, marketing_consent: e.target.checked})}
              />
              <Label htmlFor="edit-marketing_consent">Marketing consent</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-vip_status"
                checked={formData.vip_status}
                onChange={(e) => setFormData({...formData, vip_status: e.target.checked})}
              />
              <Label htmlFor="edit-vip_status">VIP status</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || updateCustomerMutation.isPending}>
                {updateCustomerMutation.isPending ? 'Updating...' : 'Update Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm text-gray-600">{selectedCustomer.name}</p>
              </div>
              {selectedCustomer.email && (
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                </div>
              )}
              {selectedCustomer.phone && (
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                </div>
              )}
              {selectedCustomer.company && (
                <div>
                  <Label>Company</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.company}</p>
                </div>
              )}
              <div>
                <Label>Customer Type</Label>
                <p className="text-sm text-gray-600">{selectedCustomer.customer_type}</p>
              </div>
              <div>
                <Label>Total Events</Label>
                <p className="text-sm text-gray-600">{selectedCustomer.total_events || 0}</p>
              </div>
              <div>
                <Label>Total Spent</Label>
                <p className="text-sm text-gray-600">£{(selectedCustomer.total_spent || 0).toLocaleString()}</p>
              </div>
              {selectedCustomer.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.notes}</p>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Badge variant="outline">Active</Badge>
                  {selectedCustomer.vip_status && (
                    <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                  )}
                  {selectedCustomer.marketing_consent && (
                    <Badge variant="secondary">Marketing Consent</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
