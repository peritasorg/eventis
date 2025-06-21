
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Settings, BarChart3, FileText, UserPlus, Building2, LogOut, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads & Appointments', href: '/leads', icon: UserPlus },
  { name: 'Event Calendar', href: '/events', icon: Calendar },
  { name: 'Form Builder', href: '/form-builder', icon: FileText, desktopOnly: true },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { user, signOut, currentTenant, userProfile } = useAuth();
  const { state } = useSidebar();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

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

  const filteredNavigation = navigation.filter(item => {
    if (item.desktopOnly && window.innerWidth < 768) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar className="bg-gray-900 text-white border-r border-gray-700" collapsible="icon">
      <SidebarHeader className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SidebarTrigger className="text-gray-400 hover:text-white hover:bg-gray-800" />
            {state === "expanded" && (
              <>
                <Building2 className="h-6 w-6 text-blue-400 flex-shrink-0" />
                <span className="text-lg font-semibold text-white truncate">BanquetPro</span>
              </>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const isFormBuilder = item.href === '/form-builder';
                const shouldShowFormBuilder = !isFormBuilder || window.innerWidth >= 768;
                
                if (!shouldShowFormBuilder) {
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        className="text-gray-400 cursor-not-allowed opacity-50"
                        title="Form Builder is only available on tablet and desktop devices"
                        disabled
                      >
                        <item.icon className="h-4 w-4" />
                        <span>
                          {item.name}
                          {state === "expanded" && <span className="ml-2 text-xs">(Desktop only)</span>}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "transition-all duration-200",
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-600'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <Link to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-700 p-3">
        {state === "collapsed" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium">
              {getUserInitial()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {getUserInitial()}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-white" title={getBusinessName()}>
                  {getBusinessName()}
                </p>
                <p className="text-xs text-gray-400 truncate" title={getSubscriptionStatus()}>
                  {getSubscriptionStatus()}
                </p>
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-gray-400 hover:text-white hover:bg-gray-800 flex-shrink-0 h-8 w-8 p-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
