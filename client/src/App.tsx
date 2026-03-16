import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThirdwebProvider } from "thirdweb/react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThirdwebWalletSync } from "@/components/ThirdwebWalletSync";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import IdentityWallet from "./pages/IdentityWallet";
import ClaimRegistry from "./pages/ClaimRegistry";
import ClaimRequests from "./pages/ClaimRequests";
import Verification from "./pages/Verification";
import Credentials from "./pages/Credentials";
import VerificationRequests from "./pages/VerificationRequests";
import AuditLogs from "./pages/AuditLogs";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThirdwebProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThirdwebWalletSync />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/identity" element={<IdentityWallet />} />
              <Route path="/claims" element={<ClaimRegistry />} />
              <Route path="/claim-requests" element={<ClaimRequests />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/credentials" element={<Credentials />} />
              <Route path="/verification-requests" element={<VerificationRequests />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThirdwebProvider>
);

export default App;
