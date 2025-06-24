
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from './Dashboard';

const Index = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Eventis</h1>
          <p className="text-lg text-gray-600 mb-8">Professional event management made simple</p>
          <a 
            href="/auth" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Get Started
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-200">
        <Dashboard />
      </div>
    </div>
  );
};

export default Index;
