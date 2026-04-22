import { cn } from '@/lib/utils';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface ClientAvatarProps {
  fullName: string;
  className?: string;
}

export default function ClientAvatar({ fullName, className }: ClientAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-primary text-primary-foreground grid place-items-center font-bold shrink-0 select-none',
        className,
      )}
      aria-label={fullName}
    >
      {getInitials(fullName)}
    </div>
  );
}
