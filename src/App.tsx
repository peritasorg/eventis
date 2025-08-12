
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CalendarStateProvider } from "@/contexts/CalendarStateContext";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import { AppLayout } from "@/components/layout/AppLayout";

import { Dashboard } from "./pages/Dashboard";
import { LeadView } from "./pages/LeadView";
import { LeadEdit } from "./pages/LeadEdit";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { EventSettings } from "./pages/EventSettings";
import { FormBuilder } from "./pages/FormBuilder";
import { Forms } from "./pages/Forms";
import { NewFormBuilderPage } from "./pages/NewFormBuilder";
import { Customers } from "./pages/Customers";
import { CustomerProfilePage } from "./pages/CustomerProfile";
import { CalendarSettings } from "./pages/CalendarSettings";
import { FieldLibraryPage } from "./pages/FieldLibrary";
import { FieldEdit } from "./pages/FieldEdit";
import { Leads } from "./pages/Leads";
import { Settings } from "./pages/Settings";
import { BillingSettings } from "./components/settings/BillingSettings";
import { ProfileSettings } from "./components/settings/ProfileSettings";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Success } from "./pages/success";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
            <CalendarStateProvider>
              <SecurityProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
               <BrowserRouter>
                <Routes>
                  {/* Authentication Routes - Redirect if already logged in */}
                  <Route path="/auth" element={
                    <AuthRedirect>
                      <ErrorBoundary>
                        <Auth />
                      </ErrorBoundary>
                    </AuthRedirect>
                  } />
                  
                  <Route path="/success" element={
                    <AuthRedirect>
                      <ErrorBoundary>
                        <Success />
                      </ErrorBoundary>
                    </AuthRedirect>
                  } />
                  
                  {/* Protected Application Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/leads/:leadId/view" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <LeadView />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/leads/:leadId/edit" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <LeadEdit />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/leads" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Leads />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/events" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Events />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/events/:eventId" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <EventDetail />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/events/settings" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <EventSettings />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/forms" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Forms />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/form-builder" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FormBuilder />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/form-builder/:formId" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FormBuilder />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/forms/new" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <NewFormBuilderPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/customers" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Customers />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/customers/:customerId" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <CustomerProfilePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/calendar-settings" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <CalendarSettings />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/field-library" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FieldLibraryPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/field-library/new" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FieldEdit />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/field-library/edit/:id" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FieldEdit />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings/billing" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <BillingSettings />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings/profile" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ProfileSettings />
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 Fallback */}
                  <Route path="*" element={
                    <ErrorBoundary>
                      <NotFound />
                    </ErrorBoundary>
                  } />
                </Routes>
              </BrowserRouter>
              </TooltipProvider>
              </SecurityProvider>
            </CalendarStateProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
