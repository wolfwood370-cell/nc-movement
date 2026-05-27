import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsStaff } from '@/hooks/useIsStaff';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isStaff, loading } = useIsStaff();
  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isStaff) return <Navigate to="/" replace />;
  return <>{children}</>;
}
