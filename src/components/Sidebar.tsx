
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Settings, BarChart3, FileText, UserPlus, Building2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads & Appointments', href: '/leads', icon: UserPlus },
  { name: 'Event Calendar', href: '/events', icon: Calendar },
  { name: 'Form Builder', href: '/form-builder', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut, currentTenant, userProfile } = useAuth();

  const getSubscriptionStatus = () => {
    if (!currentTenant) return 'Loading...';
    
    const status = currentTenant.subscription_status;
    
    switch (status) {
      case 'trial':
        return 'Free Trial';
      case 'active':
        return 'Premium Plan';
      case 'expired':
      case 'overdue':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Free Trial';
    }
  };

  const getBusinessName = () => {
    if (!currentTenant) return 'Loading...';
    return currentTenant.business_name || 'Business';
  };

  const getUserInitial = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center px-6 border-b border-gray-700">
        <Building2 className="h-8 w-8 text-blue-400" />
        <span className="ml-3 text-lg font-semibold">BanquetPro</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {getUserInitial()}
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium truncate" title={getBusinessName()}>
                {getBusinessName()}
              </p>
              <p className="text-xs text-gray-400 truncate" title={getSubscriptionStatus()}>
                {getSubscriptionStatus()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-gray-400 hover:text-white hover:bg-gray-800 flex-shrink-0 ml-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
