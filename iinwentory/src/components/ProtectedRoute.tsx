import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/useAuthStore';
import LoadingShell from './LoadingShell';
import type { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, authLoading } = useAuth();
  const location = useLocation();

  // Show a skeleton that mirrors the real layout while we verify the
  // stored token. This avoids the jarring full-screen spinner → full-UI pop.
  if (authLoading) {
    return <LoadingShell />;
  }

  if (!isLoggedIn) {
    const search = location.search;
    const dest = search ? `/login${search}` : '/login';
    return <Navigate to={dest} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
