import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant =
  | 'active' | 'inactive' | 'published' | 'completed' | 'approved'
  | 'pending' | 'rejected' | 'overdue' | 'due' | 'upcoming' | 'paid'
  | 'draft' | 'unpublished' | 'submitted' | 'graded' | 'failed'
  | 'passed' | 'registered' | 'mcq' | 'descriptive' | 'range' | 'incomplete'
  | 'default';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-teal-100 text-teal-700 border-teal-200',
  approved: 'bg-teal-100 text-teal-700 border-teal-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  passed: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  due: 'bg-orange-100 text-orange-700 border-orange-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  registered: 'bg-blue-100 text-blue-700 border-blue-200',
  graded: 'bg-teal-100 text-teal-700 border-teal-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  unpublished: 'bg-gray-100 text-gray-600 border-gray-200',
  incomplete: 'bg-gray-100 text-gray-600 border-gray-200',
  mcq: 'bg-purple-100 text-purple-700 border-purple-200',
  descriptive: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  range: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

function resolveVariant(status: string): StatusVariant {
  const normalized = status.toLowerCase().trim();
  if (normalized in VARIANT_STYLES) {
    return normalized as StatusVariant;
  }
  return 'default';
}

interface AdminStatusBadgeProps {
  status: string;
  className?: string;
}

export function AdminStatusBadge({ status, className }: AdminStatusBadgeProps) {
  const variant = resolveVariant(status);
  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', VARIANT_STYLES[variant], className)}>
      {status}
    </Badge>
  );
}
