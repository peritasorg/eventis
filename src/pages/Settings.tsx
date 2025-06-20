
import React from 'react';
import { Building2, User, Palette, FileText, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const Settings = () => {
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
                <Input placeholder="Your Banqueting Hall Name" defaultValue="Elegant Events Hall" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <Input placeholder="contact@yourbusiness.com" defaultValue="info@elegantevents.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Input placeholder="+44 20 1234 5678" defaultValue="+44 20 7890 1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <Input placeholder="www.yourbusiness.com" defaultValue="www.elegantevents.com" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
              <Textarea 
                placeholder="Full business address" 
                defaultValue="123 Event Street, London, UK, SW1A 1AA"
                rows={3}
              />
            </div>
            <div className="mt-6">
              <Button>Save Business Details</Button>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Palette className="h-5 w-5 text-purple-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo Upload</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-gray-500">Drop your logo here or click to browse</p>
                  <Button variant="outline" className="mt-2">Upload Logo</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-blue-600 rounded border border-gray-300"></div>
                    <Input placeholder="#3B82F6" defaultValue="#3B82F6" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gray-600 rounded border border-gray-300"></div>
                    <Input placeholder="#6B7280" defaultValue="#6B7280" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button>Save Branding</Button>
            </div>
          </div>

          {/* Quote & Invoice Settings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <FileText className="h-5 w-5 text-green-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Quote & Invoice Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <Textarea 
                  placeholder="Enter your terms and conditions..."
                  defaultValue="Payment terms: 50% deposit required to confirm booking. Balance due 7 days before event date."
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions</label>
                <Textarea 
                  placeholder="Enter payment instructions..."
                  defaultValue="Bank transfers preferred. Account details will be provided with invoice."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                <Input 
                  placeholder="Thank you for your business!"
                  defaultValue="Thank you for choosing Elegant Events Hall - Making your special day unforgettable"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button>Save Settings</Button>
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
                <Input defaultValue="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input defaultValue="john@elegantevents.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <Button variant="outline" className="w-full">Change Password</Button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Mail className="h-5 w-5 text-orange-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                "New lead notifications",
                "Payment reminders",
                "Event reminders",
                "Form submissions"
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item}</span>
                  <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-6">
              <Shield className="h-5 w-5 text-red-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full text-left justify-start">
                Two-Factor Authentication
              </Button>
              <Button variant="outline" className="w-full text-left justify-start">
                Login Activity
              </Button>
              <Button variant="outline" className="w-full text-left justify-start text-red-600 hover:text-red-700">
                Delete Account
              </Button>
            </div>
          </div>

          {/* Plan Information */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2">Premium Plan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Unlimited forms, customers, and events. Advanced reporting and priority support.
            </p>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Manage Subscription
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
