import { useEffect, useRef } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ThirdwebProvider, useActiveAccount } from 'thirdweb/react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ThirdwebWalletSync } from '@/components/ThirdwebWalletSync'
import { RoleGuard } from '@/components/auth/RoleGuard'
import Login from './pages/Login'
import RegisterUser from './pages/RegisterUser'
import Governance from './pages/Governance'
import Dashboard from './pages/Dashboard'
import IdentityWallet from './pages/IdentityWallet'
import ClaimRegistry from './pages/ClaimRegistry'
import ClaimRequests from './pages/ClaimRequests'
import Verification from './pages/Verification'
import Credentials from './pages/Credentials'
import VerificationRequests from './pages/VerificationRequests'
import AuditLogs from './pages/AuditLogs'
import SettingsPage from './pages/Settings'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

const WalletAccountWatcher = () => {
  const account = useActiveAccount()
  const navigate = useNavigate()
  const previousAddressRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const currentAddress = account?.address
    const previousAddress = previousAddressRef.current

    if (previousAddress && previousAddress !== currentAddress) {
      navigate('/', { replace: true })
    }

    previousAddressRef.current = currentAddress
  }, [account?.address, navigate])

  return null
}

const App = () => (
  <ThirdwebProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThirdwebWalletSync />
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <WalletAccountWatcher />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register-user" element={<RegisterUser />} />
            <Route path="/governance" element={<Governance />} />
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <RoleGuard>
                    <Dashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="/identity"
                element={
                  <RoleGuard requireRegistered={false}>
                    <IdentityWallet />
                  </RoleGuard>
                }
              />
              <Route
                path="/claims"
                element={
                  <RoleGuard allowedRoles={['governance']}>
                    <ClaimRegistry />
                  </RoleGuard>
                }
              />
              <Route
                path="/claim-requests"
                element={
                  <RoleGuard allowedRoles={['citizen', 'approver']}>
                    <ClaimRequests />
                  </RoleGuard>
                }
              />
              <Route
                path="/verification"
                element={
                  <RoleGuard allowedRoles={['approver']}>
                    <Verification />
                  </RoleGuard>
                }
              />
              <Route
                path="/credentials"
                element={
                  <RoleGuard allowedRoles={['citizen', 'approver']}>
                    <Credentials />
                  </RoleGuard>
                }
              />
              <Route
                path="/verification-requests"
                element={
                  <RoleGuard allowedRoles={['verifier']}>
                    <VerificationRequests />
                  </RoleGuard>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <RoleGuard allowedRoles={['governance']}>
                    <AuditLogs />
                  </RoleGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleGuard requireRegistered={false}>
                    <SettingsPage />
                  </RoleGuard>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThirdwebProvider>
)

export default App
