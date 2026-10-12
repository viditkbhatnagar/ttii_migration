import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { initialsOf } from '../students/students-list-model.js';
import type { GrantRow } from './roles-model.js';

// One row per Super Admin / Admin with the permissions recorded for them —
// the old Roles & Permissions table, in Naji's table style. "Manage
// Permissions" opens the existing full-page editor (/admin/roles/manage/:id);
// for a role that is not permission-managed it shows the old info toast.

export function AdminGrantsTable({ rows, totalPermissions, onManage, emptyTitle }: {
  rows: GrantRow[];
  totalPermissions: number;
  onManage: (row: GrantRow) => void;
  emptyTitle: string;
}) {
  if (rows.length === 0) return <EmptyState icon={ShieldCheck} title={emptyTitle} />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs">User</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Permissions recorded</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-right text-xs">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const pct = totalPermissions > 0 ? Math.round((r.granted / totalPermissions) * 100) : 0;
            return (
              <TableRow key={r.userId} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initialsOf(r.name || r.email)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.name || '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Pill tone={r.roleId === 1 ? 'primary' : 'blue'}>{r.roleLabel}</Pill></TableCell>
                <TableCell>
                  {r.roleId === 1 ? (
                    <span className="text-sm font-medium text-primary">All ({totalPermissions})</span>
                  ) : !r.managed ? (
                    <span className="text-xs italic text-muted-foreground">Role-based</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums text-foreground">{r.granted} / {totalPermissions}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell><Pill tone={r.active ? 'emerald' : 'slate'}>{r.active ? 'Active' : 'Inactive'}</Pill></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => onManage(r)}>Manage Permissions</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
