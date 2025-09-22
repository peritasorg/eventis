
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Settings, BarChart3, FileText, UserPlus, LogOut, Menu, X, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Leads & Appointments', href: '/leads', icon: UserPlus },
  { name: 'Event Calendar', href: '/events', icon: Calendar },
  { name: 'Form Builder', href: '/forms', icon: FileText, desktopOnly: true },
  { name: 'Form Fields', href: '/field-library', icon: Library, desktopOnly: true },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut, currentTenant, userProfile, subscriptionData } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        "flex h-14 items-center border-b border-white/10 px-6 transition-all duration-200",
        isCollapsed ? "justify-center" : ""
      )}>
        {!isCollapsed && (
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/4503c477-cf89-4d4d-84ef-e832a880c76a.png" 
              alt="Eventis" 
              className="h-7 w-auto flex-shrink-0 filter brightness-0 invert"
            />
          </div>
        )}
        
        {!isMobile && (
          <div className={cn("ml-auto", isCollapsed && "ml-0")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7 p-0 rounded-md"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 overflow-y-auto">
        {/* Company Section */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Company</h3>
          </div>
          <div className="space-y-1">
            {filteredNavigation.slice(0, 3).map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center text-sm rounded-md transition-all duration-200 relative',
                    isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-colors flex-shrink-0',
                      isCollapsed ? '' : 'mr-3'
                    )}
                  />
                  {!isCollapsed && <span className="truncate text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Setup Section */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Setup</h3>
          </div>
          <div className="space-y-1">
            {filteredNavigation.slice(3, 6).map((item) => {
              const isActive = location.pathname === item.href;
              const isFormBuilder = item.href === '/form-builder';
              const shouldShowFormBuilder = !isFormBuilder || window.innerWidth >= 768;
              
              if (!shouldShowFormBuilder) {
                return (
                  <div
                    key={item.name}
                    className={cn(
                      "flex items-center text-sm cursor-not-allowed opacity-40 transition-all duration-200 rounded-md",
                      isCollapsed ? "px-3 py-2 justify-center" : "px-3 py-2"
                    )}
                    title="Form Builder is only available on tablet and desktop devices"
                  >
                    <item.icon className={cn(
                      "h-4 w-4 flex-shrink-0 text-white/50",
                      isCollapsed ? "" : "mr-3"
                    )} />
                    {!isCollapsed && (
                      <>
                        <span className="truncate text-white/50 text-sm">{item.name}</span>
                        <span className="ml-2 text-xs text-white/30">(Desktop only)</span>
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
                    'group flex items-center text-sm rounded-md transition-all duration-200 relative',
                    isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-colors flex-shrink-0',
                      isCollapsed ? '' : 'mr-3'
                    )}
                  />
                  {!isCollapsed && <span className="truncate text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mb-6">
          <div className="px-3 mb-3">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Settings</h3>
          </div>
          <div className="space-y-1">
            {filteredNavigation.slice(6).map((item) => {
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center text-sm rounded-md transition-all duration-200 relative',
                    isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-colors flex-shrink-0',
                      isCollapsed ? '' : 'mr-3'
                    )}
                  />
                  {!isCollapsed && <span className="truncate text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer with User Info */}
      <div className="border-t border-white/10 p-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white">
                {getUserInitial()}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-white" title={getBusinessName()}>
                  {getBusinessName()}
                </p>
                <p className="text-xs text-white/70 truncate" title={getSubscriptionStatus()}>
                  {getSubscriptionStatus()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0 ml-2 h-7 w-7 p-0 rounded-md"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-white/70 hover:text-white hover:bg-white/10 h-7 w-7 p-0 rounded-md"
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
          className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent border border-sidebar-border/50 shadow-md"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col relative overflow-hidden transition-all duration-200",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}
      style={{
        background: 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(233, 92%, 62%) 50%, hsl(242, 87%, 58%) 100%)'
      }}
      >
        {/* Animated Clouds */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="cloud-animation cloud-1"></div>
          <div className="cloud-animation cloud-2"></div>
          <div className="cloud-animation cloud-3"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 relative overflow-hidden flex flex-col shadow-elegant"
               style={{
                 background: 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(233, 92%, 62%) 50%, hsl(242, 87%, 58%) 100%)'
               }}>
            {/* Animated Clouds */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="cloud-animation cloud-1"></div>
              <div className="cloud-animation cloud-2"></div>
              <div className="cloud-animation cloud-3"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};