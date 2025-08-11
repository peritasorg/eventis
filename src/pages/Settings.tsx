import React from 'react';
import { Settings as SettingsIcon, Calendar, Users, FileText, Bell, Shield, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      title: 'Event Settings',
      description: 'Configure event types, calendar warnings, and templates',
      icon: Calendar,
      path: '/events/settings',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Calendar Settings', 
      description: 'Sync with external calendars and manage time slots',
      icon: Calendar,
      path: '/calendar-settings',
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Field Library',
      description: 'Manage custom fields and form components',
      icon: FileText,
      path: '/field-library',
      color: 'text-purple-600 bg-purple-100'
    },
    {
      title: 'User Management',
      description: 'Manage team members and user permissions',
      icon: Users,
      path: '#',
      color: 'text-orange-600 bg-orange-100',
      disabled: true
    },
    {
      title: 'Notifications',
      description: 'Configure email and SMS notification settings',
      icon: Bell,
      path: '#',
      color: 'text-yellow-600 bg-yellow-100',
      disabled: true
    },
    {
      title: 'Security',
      description: 'Manage security settings and access controls',
      icon: Shield,
      path: '#',
      color: 'text-red-600 bg-red-100',
      disabled: true
    },
    {
      title: 'Billing & Subscription',
      description: 'Manage your subscription and billing details',
      icon: CreditCard,
      path: '#',
      color: 'text-indigo-600 bg-indigo-100',
      disabled: true
    }
  ];

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCategories.map((category) => {
          const IconComponent = category.icon;
          
          return (
            <Card 
              key={category.title} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                category.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
              }`}
              onClick={() => {
                if (!category.disabled && category.path !== '#') {
                  navigate(category.path);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    {category.disabled && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
                {!category.disabled && category.path !== '#' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(category.path);
                    }}
                  >
                    Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Changes</CardTitle>
              <CardDescription>View your recent configuration changes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent changes to display</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
              <CardDescription>Check system health and integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-foreground">All systems operational</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};