
import React from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Calendar, Users, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Good morning, John! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your banqueting business today.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Upcoming Events"
          value="12"
          subtitle="Next 30 days"
          icon={Calendar}
          trend={{ value: 8.2, isPositive: true }}
        />
        <MetricCard
          title="Next Event"
          value="3 Days"
          subtitle="Sarah's Wedding - Oct 25"
          icon={Clock}
        />
        <MetricCard
          title="Total This Month"
          value="£24,500"
          subtitle="8 completed events"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <MetricCard
          title="Active Leads"
          value="18"
          subtitle="5 appointments scheduled"
          icon={Users}
          trend={{ value: 3.1, isPositive: false }}
        />
      </div>

      {/* Charts and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Trends</h2>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart visualization coming soon</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[
              {
                title: "New lead added: Maria Rodriguez",
                time: "2 hours ago",
                type: "lead"
              },
              {
                title: "Payment received: £2,500 from Ahmed Wedding",
                time: "4 hours ago",
                type: "payment"
              },
              {
                title: "Event completed: Corporate Dinner",
                time: "1 day ago",
                type: "event"
              },
              {
                title: "Quote sent: Birthday Celebration",
                time: "2 days ago",
                type: "quote"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'payment' ? 'bg-green-500' :
                  activity.type === 'lead' ? 'bg-blue-500' :
                  activity.type === 'event' ? 'bg-purple-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Add New Lead", color: "bg-blue-500 hover:bg-blue-600", icon: Users },
            { title: "Create Event", color: "bg-green-500 hover:bg-green-600", icon: Calendar },
            { title: "Build Form", color: "bg-purple-500 hover:bg-purple-600", icon: CheckCircle },
            { title: "Generate Quote", color: "bg-orange-500 hover:bg-orange-600", icon: DollarSign }
          ].map((action, index) => (
            <button
              key={index}
              className={`${action.color} text-white p-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg`}
            >
              <action.icon className="h-6 w-6 mx-auto mb-2" />
              <span className="text-sm font-medium">{action.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
