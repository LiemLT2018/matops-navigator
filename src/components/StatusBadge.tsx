import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/15 text-warning border-warning/30',
  in_progress: 'bg-info/15 text-info border-info/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  draft: 'bg-muted text-muted-foreground border-border',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-info/15 text-info border-info/30',
  pass: 'bg-success/15 text-success border-success/30',
  fail: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = statusConfig[status] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border', colors, className)}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}
