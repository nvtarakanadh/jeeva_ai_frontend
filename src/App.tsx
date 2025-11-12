import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/i18n"; // Initialize i18n
import { PageSkeleton } from "@/components/ui/skeleton-loading";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PatientDashboard from "./pages/patient/Dashboard";
import HealthRecords from "./pages/patient/HealthRecords";
import ConsentManagement from "./pages/patient/ConsentManagement";
import ShareData from "./pages/patient/ShareData";
import Profile from "./pages/patient/Profile";
import Settings from "./pages/patient/Settings";
import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorPatients from "./pages/doctor/Patients";
import Prescriptions from "./pages/doctor/Prescriptions";
import ConsultationNotes from "./pages/doctor/ConsultationNotes";
import DoctorConsents from "./pages/doctor/Consents";
import DoctorConsultations from "./pages/doctor/Consultations";
import PatientConsultations from "./pages/patient/Consultations";
import PatientPrescriptions from "./pages/patient/Prescriptions";
import PatientConsultationNotes from "./pages/patient/ConsultationNotes";
// New Coming Soon pages
import Vendors from "./pages/patient/Vendors";
import MedicalDeviceCompanies from "./pages/patient/MedicalDeviceCompanies";
import InsurancePartners from "./pages/patient/InsurancePartners";
import Pharmacies from "./pages/patient/Pharmacies";
import Loans from "./pages/patient/Loans";
import CouponsSchemes from "./pages/patient/CouponsSchemes";
import MedicalTourism from "./pages/patient/MedicalTourism";
import ClinicalResearch from "./pages/patient/ClinicalResearch";
import FinancePartners from "./pages/patient/FinancePartners";
import TeleHealth from "./pages/patient/TeleHealth";
import RemoteMonitoring from "./pages/patient/RemoteMonitoring";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MainLayout from "./layouts/MainLayout";

const queryClient = new QueryClient();

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default behavior (which would log to console)
  event.preventDefault();
});

// Global error handler for module loading errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't prevent default for regular errors
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NavigationProvider>
              <AuthProvider>
                <SidebarProvider>
                  <NotificationProvider>
                  <ErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/login" element={<Auth />} />
                        <Route path="/auth/reset-password" element={<ResetPassword />} />
                
                {/* Patient Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><PatientDashboard /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/records" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><HealthRecords /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/consents" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><ConsentManagement /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/consultations" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><PatientConsultations /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/prescriptions" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><PatientPrescriptions /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/consultation-notes" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><PatientConsultationNotes /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/share-data" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><ShareData /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><Profile /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><Settings /></MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* New Coming Soon Pages */}
                <Route path="/vendors" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><Vendors /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/medical-device-companies" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><MedicalDeviceCompanies /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/insurance-partners" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><InsurancePartners /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/pharmacies" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><Pharmacies /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/loans" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><Loans /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/coupons-schemes" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><CouponsSchemes /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/medical-tourism" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><MedicalTourism /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/clinical-research" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><ClinicalResearch /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/finance-partners" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><FinancePartners /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/coming-soon/tele-health" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><TeleHealth /></MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/coming-soon/remote-monitoring" element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <MainLayout><RemoteMonitoring /></MainLayout>
                  </ProtectedRoute>
                } />
                
                        {/* Doctor Routes */}
                        <Route path="/doctor/dashboard" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><DoctorDashboard /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/patients" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><DoctorPatients /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/prescriptions" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Prescriptions /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/consultation-notes" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><ConsultationNotes /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/consultations" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><DoctorConsultations /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/consents" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><DoctorConsents /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/profile" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Profile /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/settings" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Settings /></MainLayout>
                          </ProtectedRoute>
                        } />
                        
                        {/* Doctor Coming Soon Pages */}
                        <Route path="/doctor/vendors" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Vendors /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/medical-device-companies" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><MedicalDeviceCompanies /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/insurance-partners" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><InsurancePartners /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/pharmacies" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Pharmacies /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/loans" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><Loans /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/coupons-schemes" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><CouponsSchemes /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/medical-tourism" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><MedicalTourism /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/clinical-research" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><ClinicalResearch /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/finance-partners" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><FinancePartners /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/coming-soon/tele-health" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><TeleHealth /></MainLayout>
                          </ProtectedRoute>
                        } />
                        <Route path="/doctor/coming-soon/remote-monitoring" element={
                          <ProtectedRoute allowedRoles={['doctor']}>
                            <MainLayout><RemoteMonitoring /></MainLayout>
                          </ProtectedRoute>
                        } />
                
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
                  </ErrorBoundary>
                  </NotificationProvider>
                </SidebarProvider>
              </AuthProvider>
            </NavigationProvider>
          </BrowserRouter>
        </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
