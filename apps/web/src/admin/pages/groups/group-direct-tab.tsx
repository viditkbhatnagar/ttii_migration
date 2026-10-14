import { UserMinus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { istYmd } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../counsellor/staff-model.js';
import type { TeamMember } from '../teams/org-model.js';

// "Counsellors (direct)" on the group profile (Naji 2026-10-14): counsellors
// filed straight under the group because they are in no team. Joining a team
// moves them under the team's group automatically.

export function DirectCounsellorsTab({ members, ready, onAdd, onRemove }: {
  members: TeamMember[]; ready: boolean; onAdd: () => void; onRemove: (m: TeamMember) => void;
}) {
  const live = members.filter((m) => m.current).length;
  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{live} counsellor{live === 1 ? '' : 's'} filed directly</p>
          <p className="text-[11px] text-muted-foreground">Counsellors who are not in any team. Joining a team moves them under the team&rsquo;s group.</p>
        </div>
        {ready ? <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}><UserPlus aria-hidden="true" className="size-4" /> Add Counsellors</Button> : null}
      </div>
      {!ready ? (
        <EmptyState icon={Users} title="Adding counsellors directly to a group is not set up yet." body="Teams and their counsellors work as before." />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="No counsellors filed directly under this group." action={<Button size="sm" onClick={onAdd}>Add Counsellors</Button>} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Counsellor</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Added</TableHead>
                <TableHead className="text-right text-xs">Applications</TableHead>
                <TableHead className="text-right text-xs">Enrolled</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.email || `#${m.id}`}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{m.phone || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(istYmd(m.joinedAt)) || '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{m.kpis.applications}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                    <span className="font-semibold">{m.kpis.enrolled}</span> <span className="text-xs text-muted-foreground">({m.kpis.conversion}%)</span>
                  </TableCell>
                  <TableCell>
                    {!m.current ? <Pill tone="slate">No longer a counsellor</Pill> : m.loginDisabled ? <Pill tone="rose">Login disabled</Pill> : <Pill tone="emerald">Active</Pill>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" title="Remove from group" aria-label={`Remove ${m.name} from the group`} onClick={() => onRemove(m)}>
                      <UserMinus aria-hidden="true" className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
