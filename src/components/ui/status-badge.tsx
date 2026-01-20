import { PROJECT_STATUSES, ProjectStatusKey } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ProjectStatusKey;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = PROJECT_STATUSES[status];
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}