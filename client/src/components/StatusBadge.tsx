import { Badge } from '@/components/ui/badge';

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  in_review: 'bg-info/10 text-info border-info/20',
  approved: 'bg-success/10 text-success border-success/20',
  issued: 'bg-primary/10 text-primary border-primary/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  revoked: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-success/10 text-success border-success/20',
  draft: 'bg-muted text-muted-foreground border-border',
  deprecated: 'bg-muted text-muted-foreground border-border',
  deactivated: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusStyles[status] || 'bg-muted text-muted-foreground'}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
