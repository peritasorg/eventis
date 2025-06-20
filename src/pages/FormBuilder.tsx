
import React from 'react';
import { Plus, Edit, Copy, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mockForms = [
  {
    id: 1,
    name: "Wedding Package Form",
    description: "Comprehensive form for wedding events with catering, decoration, and entertainment options",
    fields: 24,
    lastModified: "2024-10-20",
    status: "Active",
    usage: 12
  },
  {
    id: 2,
    name: "Corporate Event Form",
    description: "Business event form with AV equipment, catering, and professional services",
    fields: 18,
    lastModified: "2024-10-18",
    status: "Active",
    usage: 8
  },
  {
    id: 3,
    name: "Birthday Celebration Form",
    description: "Simple form for birthday parties and small celebrations",
    fields: 15,
    lastModified: "2024-10-15",
    status: "Draft",
    usage: 3
  }
];

const mockFields = [
  { id: 1, name: "Traditional Music", category: "Entertainment", defaultPrice: 300 },
  { id: 2, name: "Photography", category: "Services", defaultPrice: 800 },
  { id: 3, name: "Floral Decorations", category: "Decoration", defaultPrice: 450 },
  { id: 4, name: "Three-Course Meal", category: "Catering", defaultPrice: 45 },
  { id: 5, name: "DJ Services", category: "Entertainment", defaultPrice: 250 },
  { id: 6, name: "Wedding Cake", category: "Catering", defaultPrice: 150 }
];

export const FormBuilder = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Builder</h1>
          <p className="text-gray-600">Create and manage dynamic forms for your events</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Form
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Templates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Templates</h2>
            <div className="space-y-4">
              {mockForms.map((form) => (
                <div key={form.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{form.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{form.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{form.fields} fields</span>
                        <span>Used {form.usage} times</span>
                        <span>Modified {new Date(form.lastModified).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        form.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {form.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3 mr-1" />
                      Clone
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Field Library */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Field Library</h2>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" />
                Add Field
              </Button>
            </div>
            <div className="space-y-3">
              {mockFields.map((field) => (
                <div key={field.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">{field.name}</h4>
                      <p className="text-xs text-gray-500">{field.category}</p>
                      <p className="text-xs text-blue-600 font-medium">£{field.defaultPrice}</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Forms</span>
                <span className="text-sm font-medium">{mockForms.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Fields</span>
                <span className="text-sm font-medium">{mockFields.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Forms Used This Month</span>
                <span className="text-sm font-medium">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg. Form Completion</span>
                <span className="text-sm font-medium text-green-600">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
