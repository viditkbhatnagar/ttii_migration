// Shared Teams live-meeting scheduling helpers — host-pool selection + the
// env-wired meeting service. Extracted (Naji/Risha 2026-07-06) so both the
// admin/centre "Add Live Session" flow (operations-service.addLiveClasses) and
// the instructor "Schedule Live Session" flow (instructor-service.scheduleLiveClass)
// share ONE source of truth for picking a free org host and creating the meeting.
//
// Instructors never become the Teams organiser — every meeting is hosted by a
// configured, licensed org host from the `teams_meeting_hosts` allowlist, so no
// per-instructor Teams licence is required.

import type { PrismaClient } from '@prisma/client';

import { env } from '../env.js';

export interface TeamsScheduleSlot {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm or HH:mm:ss */
  fromTime: string;
  /** HH:mm or HH:mm:ss */
  toTime: string;
}

/** Env-wired Teams meeting service; null when EMAIL_MSGRAPH_* is not configured. */
export async function createTeamsMeetingServiceFromEnv() {
  const { createTeamsMeetingService } = await import('./teams-meeting-service.js');
  return createTeamsMeetingService({
    clientId: env.EMAIL_MSGRAPH_CLIENT_ID,
    clientSecret: env.EMAIL_MSGRAPH_CLIENT_SECRET,
    tenantId: env.EMAIL_MSGRAPH_TENANT_ID,
  });
}

function parseSlotTime(t: string): Date {
  const cleaned = /^\d{1,2}:\d{2}(:\d{2})?$/.test(t) ? (t.length === 5 ? `${t}:00` : t) : '00:00:00';
  return new Date(`1970-01-01T${cleaned}Z`);
}

/**
 * Auto-pick the first active Teams host with no `live_class` conflict across
 * every requested slot. Returns `{ host: null, reason }` when the pool is empty
 * or every host is busy for at least one slot. The conflict check is global
 * across all live_class rows (admin/centre/instructor alike), keyed on
 * host_email + date + overlapping time window.
 */
export async function pickAvailableTeamsHost(
  prisma: PrismaClient,
  entries: TeamsScheduleSlot[],
): Promise<{ host: { teams_email: string } | null; reason?: string }> {
  const hosts = await prisma.teams_meeting_hosts.findMany({
    where: { is_active: 1, deleted_at: null },
    orderBy: [{ id: 'asc' }],
    select: { teams_email: true, display_name: true },
  });

  if (hosts.length === 0) {
    return {
      host: null,
      reason:
        'No Teams meeting hosts are configured. Add at least one under Integrations → Teams Meeting Hosts before scheduling a live session.',
    };
  }

  for (const host of hosts) {
    let conflicted = false;
    for (const entry of entries) {
      const conflict = await prisma.live_class.findFirst({
        where: {
          host_email: host.teams_email,
          deleted_at: null,
          date: new Date(entry.date),
          // Overlap: existing.fromTime < new.toTime AND existing.toTime > new.fromTime
          fromTime: { lt: parseSlotTime(entry.toTime) },
          toTime: { gt: parseSlotTime(entry.fromTime) },
          status: { not: 'cancelled' },
        },
        select: { id: true },
      });
      if (conflict) {
        conflicted = true;
        break;
      }
    }
    if (!conflicted) {
      return { host: { teams_email: host.teams_email } };
    }
  }

  return {
    host: null,
    reason: `All ${hosts.length} Teams faculty accounts are already booked for this time slot. Pick a different time, or contact admin to add another host.`,
  };
}
