import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Assessments from "./pages/Assessments";
import FmsAssessment from "./pages/FmsAssessment";
import FcsAssessment from "./pages/FcsAssessment";
import SfmaAssessment from "./pages/SfmaAssessment";
import YbtAssessment from "./pages/YbtAssessment";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function Shell({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Shell><Dashboard /></Shell>} />
            <Route path="/clients" element={<Shell><Clients /></Shell>} />
            <Route path="/clients/:id" element={<Shell><ClientDetail /></Shell>} />
            <Route path="/assessments" element={<Shell><Assessments /></Shell>} />
            <Route path="/assessments/fms/:id" element={<Shell><FmsAssessment /></Shell>} />
            <Route path="/assessments/fcs/:id" element={<Shell><FcsAssessment /></Shell>} />
            <Route path="/assessments/sfma/:id" element={<Shell><SfmaAssessment /></Shell>} />
            <Route path="/assessments/ybt/:id" element={<Shell><YbtAssessment /></Shell>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
