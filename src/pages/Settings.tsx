
import React, { useState, useEffect } from 'react';
import { Building2, User, Palette, FileText, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const Settings = () => {
  const { user, currentTenant, userProfile, refreshUserData } = useAuth();
  const [businessData, setBusinessData] = useState({
    business_name: '',
    contact_email: '',
    contact_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'GB'
  });

  const [brandingData, setBrandingData] = useState({
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    logo_url: ''
  });

  const [userProfileData, setUserProfileData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });

  const [tenantSettings, setTenantSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    require_deposit: true,
    deposit_percentage: 25,
    payment_terms_days: 30,
    late_fee_percentage: 5,
    minimum_notice_hours: 24,
    default_event_duration: 240
  });

  // Update local state when auth data changes
  useEffect(() => {
    if (currentTenant) {
      setBusinessData({
        business_name: currentTenant.business_name || '',
        contact_email: currentTenant.contact_email || '',
        contact_phone: currentTenant.contact_phone || '',
        address_line1: currentTenant.address_line1 || '',
        address_line2: currentTenant.address_line2 || '',
        city: currentTenant.city || '',
        postal_code: currentTenant.postal_code || '',
        country: currentTenant.country || 'GB'
      });
      
      setBrandingData({
        primary_color: currentTenant.primary_color || '#2563eb',
        secondary_color: currentTenant.secondary_color || '#1e40af',
        logo_url: currentTenant.logo_url || ''
      });
    }
  }, [currentTenant]);

  useEffect(() => {
    if (userProfile) {
      setUserProfileData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || ''
      });
    }
  }, [userProfile]);

  // Load tenant settings only if we have a tenant
  const { data: settingsData, refetch: refetchSettings, isLoading: settingsLoading } = useSupabaseQuery(
    ['tenant_settings', currentTenant?.id],
    async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('tenant_settings')
            .insert([{ tenant_id: currentTenant.id }])
            .select()
            .single();
          
          if (createError) throw createError;
          return newSettings;
        }
        throw error;
      }
      
      setTenantSettings({
        email_notifications: data.email_notifications ?? true,
        sms_notifications: data.sms_notifications ?? false,
        require_deposit: data.require_deposit ?? true,
        deposit_percentage: data.deposit_percentage ?? 25,
        payment_terms_days: data.payment_terms_days ?? 30,
        late_fee_percentage: data.late_fee_percentage ?? 5,
        minimum_notice_hours: data.minimum_notice_hours ?? 24,
        default_event_duration: data.default_event_duration ?? 240
      });
      
      return data;
    }
  );

  // Mutations for updating data
  const updateTenantMutation = useSupabaseMutation(
    async (data: any) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');
      
      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Business details updated successfully');
        refreshUserData();
      }
    }
  );

  const updateUserMutation = useSupabaseMutation(
    async (data: any) => {
      if (!user?.id) throw new Error('No user authenticated');
      
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Profile updated successfully');
        refreshUserData();
      }
    }
  );

  const updateSettingsMutation = useSupabaseMutation(
    async (data: any) => {
      if (!currentTenant?.id) throw new Error('No tenant selected');
      
      const { error } = await supabase
        .from('tenant_settings')
        .update(data)
        .eq('tenant_id', currentTenant.id);
      
      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Settings updated successfully');
        refetchSettings();
      }
    }
  );

  const handleBusinessSave = () => {
    updateTenantMutation.mutate(businessData);
  };

  const handleBrandingSave = () => {
    updateTenantMutation.mutate(brandingData);
  };

  const handleProfileSave = () => {
    updateUserMutation.mutate(userProfileData);
  };

  const handleSettingsSave = () => {
    updateSettingsMutation.mutate(tenantSettings);
  };

  const getSubscriptionStatusDisplay = () => {
    if (!currentTenant) return { status: 'Loading...', description: '' };
    
    const status = currentTenant.subscription_status;
    
    switch (status) {
      case 'trial':
        return {
          status: 'Free Trial',
          description: 'You are currently on a free trial. Upgrade for unlimited access.'
        };
      case 'active':
        return {
          status: 'Premium Plan',
          description: 'Unlimited forms, customers, and events. Advanced reporting and priority support.'
        };
      case 'expired':
      case 'overdue':
        return {
          status: 'Expired',
          description: 'Your subscription has expired. Please renew to continue using all features.'
        };
      case 'cancelled':
        return {
          status: 'Cancelled',
          description: 'Your subscription was cancelled. Reactivate to continue using premium features.'
        };
      default:
        return {
          status: 'Free Trial',
          description: 'You are currently on a free trial. Upgrade for unlimited access.'
        };
    }
  };

  const subscriptionInfo = getSubscriptionStatusDisplay();

  // Show loading if still loading settings or no user/tenant data
  if (!user || settingsLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your business settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Building2 className="h-5 w-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <Input 
                  placeholder="Your Banqueting Hall Name" 
                  value={businessData.business_name}
                  onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <Input 
                  placeholder="contact@yourbusiness.com" 
                  value={businessData.contact_email}
                  onChange={(e) => setBusinessData({...businessData, contact_email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Input 
                  placeholder="+44 20 1234 5678" 
                  value={businessData.contact_phone}
                  onChange={(e) => setBusinessData({...businessData, contact_phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input 
                  placeholder="London" 
                  value={businessData.city}
                  onChange={(e) => setBusinessData({...businessData, city: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <Input 
                  placeholder="123 Event Street" 
                  value={businessData.address_line1}
                  onChange={(e) => setBusinessData({...businessData, address_line1: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <Input 
                  placeholder="Suite 100" 
                  value={businessData.address_line2}
                  onChange={(e) => setBusinessData({...businessData, address_line2: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <Input 
                  placeholder="SW1A 1AA" 
                  value={businessData.postal_code}
                  onChange={(e) => setBusinessData({...businessData, postal_code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={businessData.country}
                  onChange={(e) => setBusinessData({...businessData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleBusinessSave} disabled={updateTenantMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateTenantMutation.isPending ? 'Saving...' : 'Save Business Details'}
              </Button>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Palette className="h-5 w-5 text-purple-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-10 h-10 rounded border border-gray-300"
                      style={{ backgroundColor: brandingData.primary_color }}
                    ></div>
                    <Input 
                      placeholder="#3B82F6" 
                      value={brandingData.primary_color}
                      onChange={(e) => setBrandingData({...brandingData, primary_color: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-10 h-10 rounded border border-gray-300"
                      style={{ backgroundColor: brandingData.secondary_color }}
                    ></div>
                    <Input 
                      placeholder="#1E40AF" 
                      value={brandingData.secondary_color}
                      onChange={(e) => setBrandingData({...brandingData, secondary_color: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <Input 
                  placeholder="https://yoursite.com/logo.png" 
                  value={brandingData.logo_url}
                  onChange={(e) => setBrandingData({...brandingData, logo_url: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleBrandingSave} disabled={updateTenantMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateTenantMutation.isPending ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          </div>

          {/* Business Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <FileText className="h-5 w-5 text-green-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Business Settings</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Percentage (%)</label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={tenantSettings.deposit_percentage}
                    onChange={(e) => setTenantSettings({...tenantSettings, deposit_percentage: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
                  <Input 
                    type="number"
                    min="1"
                    value={tenantSettings.payment_terms_days}
                    onChange={(e) => setTenantSettings({...tenantSettings, payment_terms_days: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee (%)</label>
                  <Input 
                    type="number"
                    min="0"
                    max="50"
                    value={tenantSettings.late_fee_percentage}
                    onChange={(e) => setTenantSettings({...tenantSettings, late_fee_percentage: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Notice (hours)</label>
                  <Input 
                    type="number"
                    min="1"
                    value={tenantSettings.minimum_notice_hours}
                    onChange={(e) => setTenantSettings({...tenantSettings, minimum_notice_hours: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="require_deposit"
                    checked={tenantSettings.require_deposit}
                    onChange={(e) => setTenantSettings({...tenantSettings, require_deposit: e.target.checked})}
                  />
                  <label htmlFor="require_deposit" className="text-sm font-medium text-gray-700">Require deposit for bookings</label>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleSettingsSave} disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <User className="h-5 w-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input 
                  value={userProfileData.full_name}
                  onChange={(e) => setUserProfileData({...userProfileData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input 
                  value={userProfileData.email}
                  onChange={(e) => setUserProfileData({...userProfileData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input 
                  value={userProfileData.phone}
                  onChange={(e) => setUserProfileData({...userProfileData, phone: e.target.value})}
                />
              </div>
              <Button onClick={handleProfileSave} className="w-full" disabled={updateUserMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateUserMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Mail className="h-5 w-5 text-orange-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email notifications</span>
                <input 
                  type="checkbox" 
                  checked={tenantSettings.email_notifications}
                  onChange={(e) => setTenantSettings({...tenantSettings, email_notifications: e.target.checked})}
                  className="rounded text-blue-600" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">SMS notifications</span>
                <input 
                  type="checkbox" 
                  checked={tenantSettings.sms_notifications}
                  onChange={(e) => setTenantSettings({...tenantSettings, sms_notifications: e.target.checked})}
                  className="rounded text-blue-600" 
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSettingsSave} className="w-full" disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Notifications'}
              </Button>
            </div>
          </div>

          {/* Plan Information */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2">
              {subscriptionInfo.status}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {subscriptionInfo.description}
            </p>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              {currentTenant?.subscription_status === 'trial' ? 'Upgrade Plan' : 'Manage Subscription'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
