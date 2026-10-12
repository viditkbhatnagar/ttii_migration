import { Mail, Pencil, Power } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { istDateTime } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { initialsOf } from '../students/students-list-model.js';
import { LAST_SIGN_IN_HINT, type AdminUserRow } from './admin-users-model.js';

// Read-only summary of one admin account (Naji's ViewUserDialog). Edit and
// Enable / Disable hand back to the page's own handlers (same confirm + toast).

export function AdminUserViewDialog({ user, onClose, onEdit, onToggle }: {
  user: AdminUserRow | null;
  onClose: () => void;
  onEdit: (u: AdminUserRow) => void;
  onToggle: (u: AdminUserRow) => void;
}) {
  const rows: Array<[string, string]> = user
    ? [
      ['Email', user.email || '—'],
      ['Mobile', user.phone || '—'],
      ['Role', user.roleLabel],
      ['Status', user.status],
      ['Last Sign-in', istDateTime(user.lastSignIn) || 'None on record'],
      ['Created', formatYmd(user.created) || '—'],
    ]
    : [];

  return (
    <Dialog open={user !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        style={{ width: 'min(520px, calc(100vw - 2rem))', maxWidth: 'min(520px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        {user ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {user.photo ? <AvatarImage src={user.photo} alt="" /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(user.name)}</AvatarFallback>
                </Avatar>
                <DialogTitle className="truncate">{user.name || 'Admin user'}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <dl className="divide-y divide-border rounded-xl border border-border">
                {rows.map(([k, v]) => (
                  <div key={k} title={k === 'Last Sign-in' ? LAST_SIGN_IN_HINT : undefined} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4">
              {user.email ? (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={`mailto:${user.email}`}><Mail aria-hidden="true" className="size-4" /> Email</a>
                </Button>
              ) : null}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onToggle(user)}>
                <Power aria-hidden="true" className="size-4" /> {user.isDisabled ? 'Enable' : 'Disable'}
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => onEdit(user)}>
                <Pencil aria-hidden="true" className="size-4" /> Edit
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
