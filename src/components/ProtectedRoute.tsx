
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';

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

  // Enhanced security check - verify session validity
  if (!user.email_confirmed_at && !user.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Account Verification Required</h2>
            <p className="text-red-700 mb-4">
              Your account needs to be verified. Please check your email and click the verification link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user exists but no profile, show a helpful message
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Setup Required</h2>
            <p className="text-yellow-700 mb-4">
              Your account profile is being set up. This usually takes a few moments.
            </p>
            <p className="text-sm text-yellow-600 mb-4">
              Email: {user.email}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Refresh Page
            </button>
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
              Your business profile is being set up. This usually takes a few moments.
            </p>
            <p className="text-sm text-blue-600 mb-4">
              User: {userProfile.full_name || userProfile.email}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Additional security validation - check if tenant is active
  if (currentTenant.active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Account Suspended</h2>
            <p className="text-red-700 mb-4">
              Your business account has been suspended. Please contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has both profile and tenant, show protected content
  return <>{children}</>;
};
