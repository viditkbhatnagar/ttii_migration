import { BookOpen, IdCard, Mail, MessageSquare, MoreHorizontal, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CallButton } from '../../../shared/components/CallButton.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { statusTone } from '../students-list-model.js';

// Naji's StudentCard on real data: photo, name, account status (+ course status
// when it says something), first course; facts line; Call / Message / Edit
// profile / More; and the four meta chips (Student ID, Email, Phone,
// Enrollments). Message opens a mailto: as before.

export function StudentHeroCard({
  student, accountStatus, courseStatus, enrolments, canEdit, onEdit, onToggleLogin,
}: {
  student: Record<string, unknown>;
  accountStatus: string;
  courseStatus: string;
  enrolments: Record<string, unknown>[];
  canEdit: boolean;
  onEdit: () => void;
  onToggleLogin: () => void;
}) {
  const name = asString(student.name) || 'Unnamed Student';
  const photo = asString(student.profile_picture);
  const email = asString(student.user_email);
  const firstCourse = asString(enrolments[0]?.course_title);
  const isActive = accountStatus.toLowerCase() === 'active';
  const disabled = Boolean(student.disabled_at);
  const meta = [
    { icon: IdCard, label: 'Student ID', value: asString(student.student_id) },
    { icon: Mail, label: 'Email', value: email },
    { icon: Phone, label: 'Phone', value: asString(student.phone) },
    { icon: BookOpen, label: 'Enrollments', value: `${enrolments.length} ${enrolments.length === 1 ? 'course' : 'courses'}` },
  ];
  const facts = [
    asString(student.highest_qualification),
    asString(student.country_name) || asString(student.country),
    student.created_at ? `Joined ${formatDate(student.created_at)}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            {photo ? (
              <img src={photo} alt={name} className="size-20 rounded-2xl object-cover ring-4 ring-primary/10" />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-semibold text-primary ring-4 ring-primary/10">
                {name.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            {isActive ? <span className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-card bg-success" aria-label="Active" /> : null}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{name}</h2>
              <Pill tone={statusTone(accountStatus)}>{accountStatus}</Pill>
              {courseStatus && courseStatus !== 'Active' ? <Pill tone={courseStatus === 'Dropout' ? 'rose' : 'primary'}>{courseStatus}</Pill> : null}
              {firstCourse ? <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">{firstCourse}</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{facts || 'Drill down into an individual learner.'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CallButton phone={asString(student.phone)} />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!email}
            title={email ? `Email ${email}` : 'No email on file'}
            onClick={() => { if (email) window.location.href = `mailto:${email}`; }}
          >
            <MessageSquare aria-hidden="true" className="size-3.5" /> Message
          </Button>
          {canEdit ? (
            <Button size="sm" className="rounded-xl bg-[image:var(--gradient-primary)] px-4 shadow-[var(--shadow-soft)] hover:opacity-90" onClick={onEdit}>
              Edit profile
            </Button>
          ) : null}
          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9 rounded-xl" aria-label="More actions">
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit}>Edit full profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={cn(!disabled && 'text-destructive focus:text-destructive')} onClick={onToggleLogin}>
                  {disabled ? 'Enable login' : 'Disable login'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {meta.map((m) => (
          <div key={m.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-[var(--shadow-soft)]">
              <m.icon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
              <p className="truncate text-sm font-medium text-foreground">{m.value || '-'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
