
import React from 'react';
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export const Dashboard = () => {
  const { currentTenant } = useAuth();

  const { data: upcomingEvents } = useSupabaseQuery(
    ['upcoming-events'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .gte('event_date', today.toISOString())
        .order('event_date', { ascending: true });
      
      if (error) {
        console.error('Upcoming events error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: totalCustomers } = useSupabaseQuery(
    ['total-customers'],
    async () => {
      if (!currentTenant?.id) return 0;
      
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id);
      
      if (error) {
        console.error('Total customers error:', error);
        return 0;
      }
      
      return count || 0;
    }
  );

  const { data: totalLeads } = useSupabaseQuery(
    ['total-leads'],
    async () => {
      if (!currentTenant?.id) return 0;
      
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id);
      
      if (error) {
        console.error('Total leads error:', error);
        return 0;
      }
      
      return count || 0;
    }
  );

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Upcoming Events"
                value={upcomingEvents?.length || 0}
                icon={Calendar}
                trend="+12% from last month"
                trendUp={true}
              />
              <MetricCard
                title="Total Customers"
                value={totalCustomers || 0}
                icon={Users}
                trend="+8% from last month"
                trendUp={true}
              />
              <MetricCard
                title="Total Leads"
                value={totalLeads || 0}
                icon={TrendingUp}
                trend="+15% from last month"
                trendUp={true}
              />
              <MetricCard
                title="Revenue"
                value="£12,345"
                icon={DollarSign}
                trend="+5% from last month"
                trendUp={true}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingEvents && upcomingEvents.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(event.event_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              £{event.total_cost || 0}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No upcoming events</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      <p className="font-medium text-blue-900">Create New Event</p>
                      <p className="text-sm text-blue-600">Start planning your next event</p>
                    </button>
                    <button className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                      <p className="font-medium text-green-900">Add New Lead</p>
                      <p className="text-sm text-green-600">Capture a new potential customer</p>
                    </button>
                    <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                      <p className="font-medium text-purple-900">View Reports</p>
                      <p className="text-sm text-purple-600">Analyze your business performance</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
