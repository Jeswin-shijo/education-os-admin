import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { Loading } from '../components';
import { AppShell } from '../layout/AppShell';

export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <Loading label="Loading AI Campus OS Admin…" />
      </div>
    );
  }
  if (status === 'guest') return <Navigate to="/login" replace />;
  return <AppShell />;
}
