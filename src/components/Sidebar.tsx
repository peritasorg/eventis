
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Settings, BarChart3, FileText, UserPlus, LogOut, Menu, X, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads & Appointments', href: '/leads', icon: UserPlus },
  { name: 'Event Calendar', href: '/events', icon: Calendar },
  { name: 'Form Builder', href: '/form-builder', icon: FileText, desktopOnly: true },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut, currentTenant, userProfile, subscriptionData } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
    
    // Check subscription data from check-subscription function first
    if (subscriptionData) {
      if (subscriptionData.subscribed) {
        return subscriptionData.subscription_tier || 'Active Plan';
      } else {
        return 'Free Trial';
      }
    }
    
    // Fallback to tenant subscription status
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

  const SidebarContent = () => (
    <>
      {/* Logo/Brand with collapse toggle */}
      <div className={cn(
        "flex h-16 items-center border-b border-gray-700 transition-all duration-200",
        isCollapsed ? "px-3 justify-center" : "px-4 lg:px-6"
      )}>
        {!isCollapsed && (
          <>
            <img 
              src="/lovable-uploads/16cc12a3-a27d-4a10-b056-398569b8dfa5.png" 
              alt="Eventis" 
              className="h-8 w-auto flex-shrink-0"
            />
          </>
        )}
        
        <div className="ml-auto flex items-center gap-2">
          {/* Collapse Toggle */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8 p-0"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 lg:px-4 py-4 lg:py-6 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          const isFormBuilder = item.href === '/form-builder';
          const shouldShowFormBuilder = !isFormBuilder || window.innerWidth >= 768;
          
          if (!shouldShowFormBuilder) {
            return (
              <div
                key={item.name}
                className={cn(
                  "flex items-center text-sm font-medium text-gray-400 cursor-not-allowed opacity-50 transition-all duration-200",
                  isCollapsed ? "px-3 py-2 justify-center" : "px-3 py-2"
                )}
                title="Form Builder is only available on tablet and desktop devices"
              >
                <item.icon className={cn(
                  "h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0",
                  isCollapsed ? "" : "mr-3"
                )} />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.name}</span>
                    <span className="ml-2 text-xs">(Desktop only)</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'group flex items-center text-sm font-medium rounded-lg transition-all duration-200',
                isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 lg:h-5 lg:w-5 transition-colors flex-shrink-0',
                  isCollapsed ? '' : 'mr-3',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}

        {/* Fullscreen Button in Navigation */}
        <Link
          to="#"
          onClick={(e) => {
            e.preventDefault();
            toggleFullscreen();
          }}
          className={cn(
            'group flex items-center text-sm font-medium rounded-lg transition-all duration-200',
            isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
            'text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105'
          )}
          title={isCollapsed ? (isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen') : undefined}
        >
          {isFullscreen ? (
            <Minimize
              className={cn(
                'h-4 w-4 lg:h-5 lg:w-5 transition-colors flex-shrink-0',
                isCollapsed ? '' : 'mr-3',
                'text-gray-400 group-hover:text-white'
              )}
            />
          ) : (
            <Maximize
              className={cn(
                'h-4 w-4 lg:h-5 lg:w-5 transition-colors flex-shrink-0',
                isCollapsed ? '' : 'mr-3',
                'text-gray-400 group-hover:text-white'
              )}
            />
          )}
          {!isCollapsed && <span className="truncate">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>}
        </Link>
      </nav>

      {/* Footer with User Info */}
      <div className="border-t border-gray-700 p-3 lg:p-4">
        {/* User Info */}
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs lg:text-sm font-medium flex-shrink-0">
                {getUserInitial()}
              </div>
              <div className="ml-2 lg:ml-3 min-w-0 flex-1">
                <p className="text-xs lg:text-sm font-medium truncate text-white" title={getBusinessName()}>
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
              className="text-gray-400 hover:text-white hover:bg-gray-800 flex-shrink-0 ml-2 h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-gray-900 text-white hover:bg-gray-800"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:bg-gray-900 transition-all duration-200",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
