import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/authContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Gate only while auth is genuinely unknown (cold start, before the stored
  // session is read). Once a session exists the page renders immediately —
  // profile and data refresh in the background, so an app resume after the
  // phone was locked never blanks the screen.
  if (isLoading && !isAuthenticated) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Loading...</span>
        <Skeleton className="h-8 w-40" />
        {[0, 1, 2].map((skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
