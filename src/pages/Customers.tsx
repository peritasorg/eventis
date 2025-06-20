
import React, { useState } from 'react';
import { Search, Filter, User, Mail, Phone, Calendar, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const mockCustomers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah@email.com",
    phone: "+44 7123 456789",
    type: "Real Customer",
    status: "Event Completed",
    totalSpent: 8500,
    eventsCount: 1,
    lastEvent: "2024-10-25",
    joinDate: "2024-09-12",
    notes: "Excellent experience, likely to recommend"
  },
  {
    id: 2,
    name: "Ahmed Hassan",
    email: "ahmed@company.com",
    phone: "+44 7987 654321",
    type: "Quoted Customer",
    status: "Quote Sent",
    totalSpent: 0,
    eventsCount: 0,
    lastEvent: null,
    joinDate: "2024-10-15",
    notes: "Awaiting response on corporate event quote"
  },
  {
    id: 3,
    name: "Maria Rodriguez",
    email: "maria@email.com",
    phone: "+44 7456 123789",
    type: "Real Customer",
    status: "Deposit Paid",
    totalSpent: 2800,
    eventsCount: 1,
    lastEvent: "2024-12-05",
    joinDate: "2024-10-01",
    notes: "Birthday celebration, very excited about event"
  }
];

const customerTypeColors = {
  "Real Customer": "bg-green-100 text-green-800",
  "Quoted Customer": "bg-orange-100 text-orange-800"
};

const statusColors = {
  "Event Completed": "bg-purple-100 text-purple-800",
  "Quote Sent": "bg-yellow-100 text-yellow-800",
  "Deposit Paid": "bg-blue-100 text-blue-800",
  "Fully Paid": "bg-green-100 text-green-800"
};

export const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management</h1>
          <p className="text-gray-600">Manage your quoted and confirmed customers</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Export Customers
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{mockCustomers.length}</p>
            </div>
            <User className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Real Customers</p>
              <p className="text-2xl font-bold text-green-600">
                {mockCustomers.filter(c => c.type === "Real Customer").length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">
                £{mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Event Value</p>
              <p className="text-2xl font-bold text-orange-600">£5,100</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Real Customer">Real Customers</option>
              <option value="Quoted Customer">Quoted Customers</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockCustomers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">
                    Customer since {new Date(customer.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${customerTypeColors[customer.type as keyof typeof customerTypeColors]}`}>
                  {customer.type}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[customer.status as keyof typeof statusColors]}`}>
                  {customer.status}
                </span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                {customer.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                {customer.phone}
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Spent</p>
                  <p className="font-semibold text-lg">£{customer.totalSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Events</p>
                  <p className="font-semibold text-lg">{customer.eventsCount}</p>
                </div>
              </div>
              {customer.lastEvent && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Last Event</p>
                  <p className="text-sm font-medium">{new Date(customer.lastEvent).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                View Profile
              </Button>
              <Button size="sm" variant="outline">
                Contact
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
