
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
import { CustomerProfilePage } from "./pages/CustomerProfile";

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
                  {/* Authentication Routes */}
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
                  
                  {/* Main Application Routes */}
                  <Route path="/" element={
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
                              <ErrorBoundary>
                                <Dashboard />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/leads/:leadId/view" element={
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
                              <ErrorBoundary>
                                <LeadView />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/leads/:leadId/edit" element={
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
                              <ErrorBoundary>
                                <LeadEdit />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/events" element={
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
                              <ErrorBoundary>
                                <Events />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/events/:eventId" element={
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
                              <ErrorBoundary>
                                <EventDetail />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/events/settings" element={
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
                              <ErrorBoundary>
                                <EventSettings />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/forms" element={
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
                              <ErrorBoundary>
                                <Forms />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/form-builder" element={
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
                              <ErrorBoundary>
                                <FormBuilder />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/form-builder/:formId" element={
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
                              <ErrorBoundary>
                                <FormBuilder />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/forms/new" element={
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
                              <ErrorBoundary>
                                <NewFormBuilderPage />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/customers" element={
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
                              <ErrorBoundary>
                                <Customers />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/customers/:customerId" element={
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
                              <ErrorBoundary>
                                <CustomerProfilePage />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
                  } />
                  
                  <Route path="/calendar-settings" element={
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
                              <ErrorBoundary>
                                <CalendarSettings />
                              </ErrorBoundary>
                            </div>
                          </main>
                        </div>
                    </ErrorBoundary>
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
