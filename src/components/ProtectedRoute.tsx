
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, currentTenant, loading } = useAuth();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    console.log('No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile, show a helpful message
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Setup Required</h2>
            <p className="text-yellow-700 mb-4">
              Your account needs to be set up. Please contact support or try signing up again.
            </p>
            <p className="text-sm text-yellow-600">
              Email: {user.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user has profile but no tenant, show setup message
  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Business Setup Required</h2>
            <p className="text-blue-700 mb-4">
              Your business profile needs to be set up. Please contact support.
            </p>
            <p className="text-sm text-blue-600">
              User: {userProfile.full_name || userProfile.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has both profile and tenant, show protected content
  return <>{children}</>;
};
