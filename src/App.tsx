
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityProvider } from "@/components/SecurityProvider";
import { useCalendarSync } from "./hooks/useCalendarSync";
import { Sidebar } from "./components/Sidebar";
import { TrialBanner } from "./components/TrialBanner";
import { Dashboard } from "./pages/Dashboard";
import { Leads } from "./pages/Leads";
import { LeadView } from "./pages/LeadView";
import { LeadEdit } from "./pages/LeadEdit";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { FormBuilder } from "./pages/FormBuilder";
import { Customers } from "./pages/Customers";
import { Settings } from "./pages/Settings";
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
            <SecurityProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={
                    <ErrorBoundary>
                      <Auth />
                    </ErrorBoundary>
                  } />
                  <Route path="/success" element={
                    <ErrorBoundary>
                      <ProtectedRoute>
                        <Success />
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="/*" element={
                    <ErrorBoundary>
                      <ProtectedRoute>
                        <div className="flex h-screen w-full bg-gray-50">
                          <ErrorBoundary>
                            <Sidebar />
                          </ErrorBoundary>
                          <main className="flex-1 overflow-auto relative bg-gray-50">
                            <ErrorBoundary>
                              <TrialBanner />
                            </ErrorBoundary>
                            <div className="h-full">
                              <Routes>
                                <Route path="/" element={
                                  <ErrorBoundary>
                                    <Dashboard />
                                  </ErrorBoundary>
                                } />
                                <Route path="/leads" element={
                                  <ErrorBoundary>
                                    <Leads />
                                  </ErrorBoundary>
                                } />
                                <Route path="/leads/:leadId/view" element={
                                  <ErrorBoundary>
                                    <LeadView />
                                  </ErrorBoundary>
                                } />
                                <Route path="/leads/:leadId/edit" element={
                                  <ErrorBoundary>
                                    <LeadEdit />
                                  </ErrorBoundary>
                                } />
                                <Route path="/events" element={
                                  <ErrorBoundary>
                                    <Events />
                                  </ErrorBoundary>
                                } />
                                <Route path="/events/:eventId" element={
                                  <ErrorBoundary>
                                    <EventDetail />
                                  </ErrorBoundary>
                                } />
                                <Route path="/form-builder" element={
                                  <ErrorBoundary>
                                    <FormBuilder />
                                  </ErrorBoundary>
                                } />
                                <Route path="/customers" element={
                                  <ErrorBoundary>
                                    <Customers />
                                  </ErrorBoundary>
                                } />
                                <Route path="/settings" element={
                                  <ErrorBoundary>
                                    <Settings />
                                  </ErrorBoundary>
                                } />
                                <Route path="*" element={
                                  <ErrorBoundary>
                                    <NotFound />
                                  </ErrorBoundary>
                                } />
                              </Routes>
                            </div>
                          </main>
                        </div>
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                </Routes>
              </BrowserRouter>
              </TooltipProvider>
            </SecurityProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
