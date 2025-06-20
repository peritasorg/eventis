
import React, { useState } from 'react';
import { Plus, Search, Filter, Phone, Mail, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockLeads = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah@email.com",
    phone: "+44 7123 456789",
    eventDate: "2024-10-25",
    guestCount: 150,
    status: "Appointment Scheduled",
    eventType: "Wedding",
    createdAt: "2024-10-20",
    notes: "Looking for outdoor ceremony option"
  },
  {
    id: 2,
    name: "Ahmed Hassan",
    email: "ahmed@company.com",
    phone: "+44 7987 654321",
    eventDate: "2024-11-15",
    guestCount: 80,
    status: "New",
    eventType: "Corporate Event",
    createdAt: "2024-10-22",
    notes: "Annual company dinner"
  },
  {
    id: 3,
    name: "Maria Rodriguez",
    email: "maria@email.com",
    phone: "+44 7456 123789",
    eventDate: "2024-12-05",
    guestCount: 45,
    status: "Quoted",
    eventType: "Birthday",
    createdAt: "2024-10-21",
    notes: "50th birthday celebration"
  }
];

const statusColors = {
  "New": "bg-blue-100 text-blue-800",
  "Appointment Scheduled": "bg-yellow-100 text-yellow-800",
  "Appointment Completed": "bg-purple-100 text-purple-800",
  "Quoted": "bg-orange-100 text-orange-800",
  "Deposit Paid": "bg-green-100 text-green-800",
  "Lost": "bg-red-100 text-red-800"
};

export const Leads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads & Appointments</h1>
          <p className="text-gray-600">Manage your potential customers and scheduled meetings</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="New">New</option>
              <option value="Appointment Scheduled">Appointment Scheduled</option>
              <option value="Quoted">Quoted</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockLeads.map((lead) => (
          <div key={lead.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                  <p className="text-sm text-gray-500">{lead.eventType}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[lead.status as keyof typeof statusColors]}`}>
                {lead.status}
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                {lead.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                {lead.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Event: {new Date(lead.eventDate).toLocaleDateString()}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Guest Count:</span>
                <span className="font-medium">{lead.guestCount}</span>
              </div>
              {lead.notes && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Notes:</p>
                  <p className="text-sm text-gray-700">{lead.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">
                Schedule Call
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Create Event
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Total Leads</p>
          <p className="text-2xl font-bold text-blue-600">{mockLeads.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">This Week</p>
          <p className="text-2xl font-bold text-green-600">5</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Conversion Rate</p>
          <p className="text-2xl font-bold text-purple-600">68%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Avg. Response Time</p>
          <p className="text-2xl font-bold text-orange-600">2.3h</p>
        </div>
      </div>
    </div>
  );
};
