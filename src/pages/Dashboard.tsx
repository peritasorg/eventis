
import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { UserPlus, Calendar, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard = () => {
  const { currentTenant } = useAuth();

  const { data: dashboardStats } = useSupabaseQuery(
    ['dashboard-stats'],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .rpc('get_tenant_dashboard_stats', { p_tenant_id: currentTenant.id });
      
      if (error) throw error;
      return data[0];
    }
  );

  const { data: recentLeads } = useSupabaseQuery(
    ['recent-leads'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  );

  const { data: upcomingEvents } = useSupabaseQuery(
    ['upcoming-events'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*, customers(name)')
        .eq('tenant_id', currentTenant.id)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  );

  if (!dashboardStats) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const trialDaysLeft = currentTenant?.trial_ends_at 
    ? Math.ceil((new Date(currentTenant.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back to your BanquetPro dashboard</p>
        {currentTenant?.subscription_status === 'trial' && trialDaysLeft > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              🎉 You have <strong>{trialDaysLeft} days</strong> left in your free trial
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Total Leads"
          value={dashboardStats.total_leads || 0}
          icon={UserPlus}
          trend={{
            value: dashboardStats.new_leads_this_month || 0,
            isPositive: true
          }}
        />
        
        <MetricCard
          title="Active Events"
          value={dashboardStats.active_events || 0}
          icon={Calendar}
          subtitle="Confirmed bookings"
        />
        
        <MetricCard
          title="This Month Revenue"
          value={`£${(dashboardStats.this_month_revenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend={{
            value: 12,
            isPositive: true
          }}
        />
        
        <MetricCard
          title="Total Customers"
          value={dashboardStats.total_customers || 0}
          icon={Users}
          subtitle="Active customers"
        />
        
        <MetricCard
          title="Upcoming Events"
          value={dashboardStats.upcoming_events || 0}
          icon={Clock}
          subtitle="Next 30 days"
        />
        
        <MetricCard
          title="Conversion Rate"
          value="24%"
          icon={TrendingUp}
          subtitle="Leads to customers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Leads */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
          <div className="space-y-4">
            {recentLeads?.length ? recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{lead.name}</h3>
                  <p className="text-sm text-gray-600">{lead.email}</p>
                  <p className="text-xs text-gray-500">
                    {lead.event_type} • {lead.estimated_guests} guests
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                  lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                  lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {lead.status}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No leads yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents?.length ? upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{event.event_name}</h3>
                  <p className="text-sm text-gray-600">
                    {event.customers?.name || 'No customer assigned'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.event_date).toLocaleDateString()} • {event.estimated_guests} guests
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    £{(event.total_amount || 0).toLocaleString()}
                  </p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    event.status === 'provisional' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
