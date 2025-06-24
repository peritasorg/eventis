import React from 'react';
import { Calendar, Users, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { currentTenant } = useAuth();
  const navigate = useNavigate();

  const { data: dashboardStats, isLoading } = useSupabaseQuery(
    ['dashboard-stats'],
    async () => {
      if (!currentTenant?.id) return null;
      
      // Get stats with corrected logic - no longer filtering by status for revenue calculation
      const [leadsResult, customersResult, eventsResult, revenueResult, upcomingResult] = await Promise.all([
        // Total leads
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id),
        
        // Total customers
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        
        // Active events (any event with an amount > 0, regardless of status)
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id)
          .gt('total_amount', 0),
        
        // This month revenue - ALL events with total_amount in current month
        supabase
          .from('events')
          .select('total_amount')
          .eq('tenant_id', currentTenant.id)
          .not('total_amount', 'is', null)
          .gt('total_amount', 0)
          .gte('event_start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .lte('event_start_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]),
        
        // Upcoming events with amounts
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id)
          .gte('event_start_date', new Date().toISOString().split('T')[0])
          .gt('total_amount', 0)
      ]);
      
      const thisMonthRevenue = revenueResult.data?.reduce((sum, event) => sum + (event.total_amount || 0), 0) || 0;
      
      // New leads this month
      const newLeadsResult = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      
      return {
        total_leads: leadsResult.count || 0,
        new_leads_this_month: newLeadsResult.count || 0,
        total_customers: customersResult.count || 0,
        active_events: eventsResult.count || 0,
        this_month_revenue: thisMonthRevenue,
        upcoming_events: upcomingResult.count || 0
      };
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
      
      if (error) {
        console.error('Recent leads error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  const { data: upcomingEvents } = useSupabaseQuery(
    ['upcoming-events'],
    async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .gte('event_start_date', new Date().toISOString().split('T')[0])
        .order('event_start_date', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Upcoming events error:', error);
        return [];
      }
      
      return data || [];
    }
  );

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardStats || {
    total_leads: 0,
    new_leads_this_month: 0,
    total_customers: 0,
    active_events: 0,
    this_month_revenue: 0,
    upcoming_events: 0
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Leads"
          value={stats.total_leads?.toString() || '0'}
          icon={<Users className="h-8 w-8 text-blue-600" />}
          change={`+${stats.new_leads_this_month || 0} this month`}
          changeType="positive"
        />
        <MetricCard
          title="Active Events"
          value={stats.active_events?.toString() || '0'}
          icon={<Calendar className="h-8 w-8 text-green-600" />}
          change={`${stats.upcoming_events || 0} upcoming`}
          changeType="positive"
        />
        <MetricCard
          title="This Month Revenue"
          value={`£${Number(stats.this_month_revenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-8 w-8 text-purple-600" />}
          change="Revenue for current month"
          changeType="neutral"
        />
        <MetricCard
          title="Total Customers"
          value={stats.total_customers?.toString() || '0'}
          icon={<TrendingUp className="h-8 w-8 text-orange-600" />}
          change="Active customers"
          changeType="positive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h3>
          <div className="space-y-3">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-600">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No leads yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{event.event_name}</p>
                    <p className="text-sm text-gray-600">{event.event_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{new Date(event.event_start_date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-600">{event.start_time} - {event.end_time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
