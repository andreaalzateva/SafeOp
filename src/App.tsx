import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/authContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import NewSurgery from "./pages/NewSurgery";
import History from "./pages/History";
import SurgeryDetail from "./pages/SurgeryDetail";
import AdminUsers from "./pages/AdminUsers";
import AdminClinics from "./pages/AdminClinics";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/checklist/:id" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
            <Route path="/nueva-cirugia" element={<ProtectedRoute><NewSurgery /></ProtectedRoute>} />
            <Route path="/historial" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/cirugia/:id" element={<ProtectedRoute><SurgeryDetail /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/clinicas" element={<ProtectedRoute><AdminClinics /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
