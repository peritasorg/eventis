
import React from 'react';
import { Calendar, Users, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard = () => {
  const { currentTenant } = useAuth();

  // Get dashboard metrics
  const { data: leads } = useSupabaseQuery(
    ['leads-count'],
    async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', currentTenant.id);
      if (error) throw error;
      return data;
    }
  );

  const { data: events } = useSupabaseQuery(
    ['events-count'],
    async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', currentTenant.id);
      if (error) throw error;
      return data;
    }
  );

  const { data: customers } = useSupabaseQuery(
    ['customers-count'],
    async () => {
      if (!currentTenant?.id) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', currentTenant.id);
      if (error) throw error;
      return data;
    }
  );

  const totalLeads = leads?.length || 0;
  const totalEvents = events?.length || 0;
  const totalCustomers = customers?.length || 0;
  const newLeads = leads?.filter(lead => lead.status === 'new').length || 0;
  const upcomingEvents = events?.filter(event => 
    event.event_date && new Date(event.event_date) >= new Date()
  ).length || 0;
  const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0;

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

  const metrics = [
    {
      title: 'Total Leads',
      value: totalLeads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'New Leads',
      value: newLeads,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Upcoming Events',
      value: upcomingEvents,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Customers',
      value: totalCustomers,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Rate Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Conversion Rate
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{conversionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {convertedLeads} of {totalLeads} leads converted
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Events
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalEvents}</div>
            <p className="text-xs text-gray-500 mt-1">
              All time events managed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Response Time
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">&lt; 2h</div>
            <p className="text-xs text-gray-500 mt-1">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads && leads.length > 0 ? (
            <div className="space-y-4">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-600">
                      {lead.event_type && `${lead.event_type} • `}
                      {lead.status}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Start by adding your first lead!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
