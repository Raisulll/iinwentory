import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/useAuthStore';
import LoadingShell from './LoadingShell';
import type { ReactNode } from 'react';

// Gates the platform super-admin area. Sits inside ProtectedRoute, so the user
// is already known to be logged in by the time this renders — here we only
// check the operator flag and bounce non-admins back to their dashboard.
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { authLoading, isLoggedIn, user } = useAuth();

  if (authLoading) {
    return <LoadingShell />;
  }

  if (!isLoggedIn || !user?.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
