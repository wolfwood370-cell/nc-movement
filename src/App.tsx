import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AppShell from "@/components/AppShell";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Assessments = lazy(() => import("./pages/Assessments"));
const FmsAssessment = lazy(() => import("./pages/FmsAssessment"));
const FmsSetup = lazy(() => import("./pages/FmsSetup"));
const FmsWizardPage = lazy(() => import("./pages/FmsWizardPage"));
const FcsAssessment = lazy(() => import("./pages/FcsAssessment"));
const SfmaAssessment = lazy(() => import("./pages/SfmaAssessment"));
const YbtAssessment = lazy(() => import("./pages/YbtAssessment"));
const CorrectiveLibrary = lazy(() => import("./pages/CorrectiveLibrary"));
const DailyPrep = lazy(() => import("./pages/DailyPrep"));
const BugReports = lazy(() => import("./pages/BugReports"));
const Team = lazy(() => import("./pages/Team"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-[40vh] grid place-items-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<Shell><Dashboard /></Shell>} />
              <Route path="/clients" element={<Shell><Clients /></Shell>} />
              <Route path="/clients/:id" element={<Shell><ClientDetail /></Shell>} />
              <Route path="/assessments" element={<Shell><Assessments /></Shell>} />
              <Route path="/assessments/fms/setup" element={<ProtectedRoute><FmsSetup /></ProtectedRoute>} />
              <Route path="/assessments/fms/new" element={<ProtectedRoute><FmsWizardPage /></ProtectedRoute>} />
              <Route path="/assessments/fms/:id" element={<Shell><FmsAssessment /></Shell>} />
              <Route path="/assessments/fcs/:id" element={<Shell><FcsAssessment /></Shell>} />
              <Route path="/assessments/sfma/:id" element={<Shell><SfmaAssessment /></Shell>} />
              <Route path="/assessments/ybt/:id" element={<Shell><YbtAssessment /></Shell>} />
              <Route path="/library" element={<Shell><CorrectiveLibrary /></Shell>} />
              <Route path="/daily-prep" element={<Shell><DailyPrep /></Shell>} />
              <Route path="/team" element={<Shell><Team /></Shell>} />
              <Route path="/admin/bugs" element={<Shell><AdminRoute><BugReports /></AdminRoute></Shell>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
