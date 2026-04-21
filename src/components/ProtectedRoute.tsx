import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
