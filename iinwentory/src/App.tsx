import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/useAuthStore';
import { StoreProvider } from './store/useStore';
import { SettingsProvider } from './store/useSettingsStore';
import { CurrencyProvider } from './store/useCurrencyStore';
import { TeamProvider } from './store/useTeamStore';
import { WorkflowProvider } from './store/useWorkflowStore';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoadingShell from './components/LoadingShell';
import Login from './pages/Login';
import { TooltipProvider } from '@/components/ui/tooltip';

// Lazy-load every non-auth page so the initial bundle is dramatically smaller.
// Each route becomes its own JS chunk fetched on demand. Login stays eager
// because it's the first paint for unauthenticated visitors.
const Landing = lazy(() => import('./pages/Landing'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Items = lazy(() => import('./pages/Items'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Search = lazy(() => import('./pages/Search'));
const Tags = lazy(() => import('./pages/Tags'));
const Workflows = lazy(() => import('./pages/Workflows'));
const Reports = lazy(() => import('./pages/Reports'));
const PickMode = lazy(() => import('./pages/PickMode'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <CurrencyProvider>
            <TeamProvider>
              <StoreProvider>
                <WorkflowProvider>
                <Suspense fallback={<LoadingShell />}>
                <Routes>
                  {/* Public marketing landing page (ported from the old Nuxt site) */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  {/* Marketing site CTAs link to /?register=1&plan=xxx */}
                  <Route path="/register" element={<Login />} />
                  {/* Password-reset links from email land here with ?token=... */}
                  <Route path="/reset-password" element={<Login />} />
                  {/* Onboarding sits outside the Layout chrome (full-screen wizard) */}
                  <Route path="/onboarding" element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  } />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={<LoadingShell />}>
                          <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/items" element={<Items />} />
                            <Route path="/items/folder/:folderId" element={<Items />} />
                            <Route path="/items/detail/:itemId" element={<ItemDetail />} />
                            <Route path="/scanner" element={<Scanner />} />
                            <Route path="/search" element={<Search />} />
                            <Route path="/tags" element={<Tags />} />
                            <Route path="/workflows" element={<Workflows />} />
                            <Route path="/pick-mode" element={<PickMode />} />
                            <Route path="/reports" element={<Reports />} />
                            {/* Old /transactions URL kept as a redirect to its new home (Reports tab) */}
                            <Route path="/transactions" element={<Navigate to="/reports" replace />} />
                            <Route path="/settings" element={<Settings />} />
                            {/* Team page moved into Settings → Team tab */}
                            <Route path="/team" element={<Navigate to="/settings?tab=team" replace />} />
                            <Route path="/notifications" element={<Notifications />} />
                            {/* Platform operator console — gated to super-admins */}
                            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                          </Routes>
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                </Suspense>
                </WorkflowProvider>
              </StoreProvider>
            </TeamProvider>
          </CurrencyProvider>
        </SettingsProvider>
      </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
