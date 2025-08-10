
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

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
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

import { CalendarSettings } from "./pages/CalendarSettings";
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
                  <Route path="/auth" element={
                    <ErrorBoundary>
                      <Auth />
                    </ErrorBoundary>
                  } />
                  <Route path="/success" element={
                    <ErrorBoundary>
                        <Success />
                    </ErrorBoundary>
                  } />
                  <Route path="/*" element={
                    <ErrorBoundary>
                        <div className="flex h-screen w-full bg-gray-50">
                          <ErrorBoundary>
                            <Sidebar />
                          </ErrorBoundary>
                          <main className="flex-1 overflow-auto relative bg-gray-50">
                            <ErrorBoundary>
                              <TopBar />
                            </ErrorBoundary>
                            <div className="h-full">
                              <Routes>
                                <Route path="/" element={
                                  <ErrorBoundary>
                                    <Dashboard />
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
                                <Route path="/events/settings" element={
                                  <ErrorBoundary>
                                    <EventSettings />
                                  </ErrorBoundary>
                                } />
                <Route path="/forms" element={
                  <ErrorBoundary>
                    <Forms />
                  </ErrorBoundary>
                } />
                <Route path="/form-builder" element={
                  <ErrorBoundary>
                    <FormBuilder />
                  </ErrorBoundary>
                } />
                <Route path="/form-builder/:formId" element={
                  <ErrorBoundary>
                    <FormBuilder />
                  </ErrorBoundary>
                } />
                                <Route path="/forms/new" element={
                                  <ErrorBoundary>
                                    <NewFormBuilderPage />
                                  </ErrorBoundary>
                                } />
                                <Route path="/customers" element={
                                  <ErrorBoundary>
                                    <Customers />
                                  </ErrorBoundary>
                                } />
                                <Route path="/calendar-settings" element={
                                  <ErrorBoundary>
                                    <CalendarSettings />
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
