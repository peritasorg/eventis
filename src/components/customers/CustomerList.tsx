import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone, User } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { currentTenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers = [], isLoading } = useSupabaseQuery(
    ['new-customers', currentTenant?.id, searchTerm],
    async () => {
      if (!currentTenant?.id) return [];
      
      let query = supabase
        .from('new_customers')
        .select('*')
        .eq('tenant_id', currentTenant.id);

      if (searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('last_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          <Button onClick={() => navigate('/customers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Grid */}
        {customers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              {searchTerm ? (
                <p className="text-muted-foreground mb-4">
                  No customers match your search "{searchTerm}"
                </p>
              ) : (
                <p className="text-muted-foreground mb-4">
                  Start building your customer database by adding your first customer
                </p>
              )}
              <Button onClick={() => navigate('/customers/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <Card 
                key={customer.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {customer.first_name} {customer.last_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {customer.notes}
                    </p>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/new?customer=${customer.id}`);
                      }}
                    >
                      Add Event
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${customer.id}`);
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};