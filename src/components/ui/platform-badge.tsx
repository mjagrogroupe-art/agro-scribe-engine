import { PLATFORMS, PlatformKey } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PlatformBadgeProps {
  platform: PlatformKey;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const config = PLATFORMS[platform];
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}