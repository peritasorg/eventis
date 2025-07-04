
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { TrialBanner } from "./components/TrialBanner";
import { TrialLockOverlay } from "./components/TrialLockOverlay";
import { TrialExpiredModal } from "./components/TrialExpiredModal";
import { useTrialStatus } from "./hooks/useTrialStatus";
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

// Component to handle trial expiration redirects
const TrialRedirectHandler = ({ children }: { children: React.ReactNode }) => {
  const { isTrialExpired } = useTrialStatus();

  if (isTrialExpired) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
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
                            <TrialLockOverlay>
                              <div className="h-full">
                                <Routes>
                                  <Route path="/" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <Dashboard />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/leads" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <Leads />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/leads/:leadId/view" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <LeadView />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/leads/:leadId/edit" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <LeadEdit />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/events" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <Events />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/events/:eventId" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <EventDetail />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/form-builder" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <FormBuilder />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/customers" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <Customers />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                  <Route path="/settings" element={
                                    <ErrorBoundary>
                                      <Settings />
                                    </ErrorBoundary>
                                  } />
                                  <Route path="*" element={
                                    <ErrorBoundary>
                                      <TrialRedirectHandler>
                                        <NotFound />
                                      </TrialRedirectHandler>
                                    </ErrorBoundary>
                                  } />
                                </Routes>
                              </div>
                            </TrialLockOverlay>
                            <TrialExpiredModal />
                          </main>
                        </div>
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
