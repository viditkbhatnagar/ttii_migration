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
import type { CreateTeamsMeetingResult, TeamsMeetingError, TeamsMeetingService } from './teams-meeting-service.js';

export interface TeamsScheduleSlot {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm or HH:mm:ss */
  fromTime: string;
  /** HH:mm or HH:mm:ss */
  toTime: string;
}

/** One active host with no `live_class` conflict across every requested slot. */
export interface TeamsHostCandidate {
  id: number;
  teamsEmail: string;
  displayName: string | null;
  /** NULL until Graph has actually accepted a meeting on this account. */
  policyVerifiedAt: Date | null;
}

export interface TeamsHostSelection {
  /** Ordered: proven accounts first, then id ASC. Empty whenever `reason` is set. */
  candidates: TeamsHostCandidate[];
  reason?: string;
}

export type TeamsMeetingAttempt =
  | { ok: true; hostEmail: string; meeting: CreateTeamsMeetingResult; hardFailedHosts: readonly string[] }
  | { ok: false; message: string; hardFailedHosts: readonly string[] };

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
 * Auto-pick every active Teams host with no `live_class` conflict across all
 * requested slots, best candidate first. Returns `{ candidates: [], reason }`
 * when the pool is empty or every host is busy for at least one slot. The
 * conflict check is global across all live_class rows (admin/centre/instructor
 * alike), keyed on host_email + date + overlapping time window.
 *
 * Naji UAT 2026-08-10 — this used to return only the FIRST free host and the
 * caller had one shot at it. Every class since 6 June went to naji@ (id 2)
 * because he sorts first among the active rows; the moment he was
 * double-booked the pick fell through to a placeholder row that is not a real
 * mailbox, Graph 404'd, and the live class was silently never created. Hand
 * the caller the whole ordered list so it can fail over instead.
 */
export async function pickAvailableTeamsHost(
  prisma: PrismaClient,
  entries: TeamsScheduleSlot[],
): Promise<TeamsHostSelection> {
  const hosts = await prisma.teams_meeting_hosts.findMany({
    where: { is_active: 1, deleted_at: null },
    orderBy: [{ id: 'asc' }],
    select: { id: true, teams_email: true, display_name: true, policy_verified_at: true },
  });

  if (hosts.length === 0) {
    return {
      candidates: [],
      reason:
        'No Teams meeting hosts are configured. Add at least one under Integrations → Teams Meeting Hosts before scheduling a live session.',
    };
  }

  // Naji UAT 2026-08-10 — proven accounts (policy_verified_at set by a real
  // successful create) go ahead of unproven ones, id ASC within each group so
  // the existing pick is unchanged for the proven set. Unproven rows are NOT
  // dropped: a trainer added five minutes ago also has policy_verified_at
  // NULL, and excluding them would make onboarding a new host impossible.
  const ordered = [...hosts].sort((a, b) => {
    const aRank = a.policy_verified_at !== null ? 0 : 1;
    const bRank = b.policy_verified_at !== null ? 0 : 1;
    return aRank !== bRank ? aRank - bRank : a.id - b.id;
  });

  const candidates: TeamsHostCandidate[] = [];
  for (const host of ordered) {
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
      candidates.push({
        id: host.id,
        teamsEmail: host.teams_email,
        displayName: host.display_name,
        policyVerifiedAt: host.policy_verified_at,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      candidates: [],
      reason: `All ${hosts.length} Teams faculty accounts are already booked for this time slot. Pick a different time, or contact admin to add another host.`,
    };
  }

  return { candidates };
}

/**
 * Reads a TeamsMeetingError's `code` without importing the class.
 *
 * Naji UAT 2026-08-10 — deliberately NOT `instanceof TeamsMeetingError`. A value
 * import of teams-meeting-service.js drags @azure/msal-node in behind it, and
 * both callers import THIS module lazily precisely so MSAL never loads on a
 * non-Teams request. Matching on the error's own name + code keeps that promise
 * and keeps the import type-only.
 */
function teamsErrorCode(err: unknown): string | null {
  if (!(err instanceof Error) || err.name !== 'TeamsMeetingError') return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** Codes that mean "that account, not us" — the only ones worth another host. */
const HOST_LEVEL_CODES = new Set<string>(
  ['host_unknown', 'user_not_found', 'policy_missing'] satisfies TeamsMeetingError['code'][],
);

/** Codes that mean "our app registration, not any host" — stop, don't fail over. */
const APP_LEVEL_CODES = new Set<string>(['unauthorized'] satisfies TeamsMeetingError['code'][]);

/**
 * True when Graph rejected the request because of THAT ACCOUNT — no mailbox in
 * the tenant, no Teams licence, or no CsApplicationAccessPolicy. Only these are
 * worth retrying on a different host.
 *
 * Naji UAT 2026-08-10 — deliberately narrow. 'unauthorized' is our own app
 * registration (a 401, or a 403 whose body says Authorization_RequestDenied),
 * 'network' is connectivity, and 'unknown' covers throttling (429) and Graph
 * 5xx. Walking the whole pool on any of those turns one outage into four
 * pointless round trips and four bogus last_error stamps on innocent accounts.
 */
export function isHostLevelTeamsFailure(err: unknown): boolean {
  const code = teamsErrorCode(err);
  return code !== null && HOST_LEVEL_CODES.has(code);
}

/**
 * True when the fault is our Azure app registration rather than any one trainer
 * — a 401, or the 403 Authorization_RequestDenied Graph returns once the
 * OnlineMeetings.ReadWrite.All consent is revoked.
 *
 * Naji UAT 2026-08-10 — these must not touch teams_meeting_hosts at all. The
 * probe that found this stamped last_error on all four rows, naji@ included,
 * and told the admin "tried all 4 host accounts" — pointing operations at the
 * trainers when the actual fix was re-consenting the app.
 */
export function isAppLevelTeamsFailure(err: unknown): boolean {
  const code = teamsErrorCode(err);
  return code !== null && APP_LEVEL_CODES.has(code);
}

/**
 * True only for the "this mailbox does not exist in the tenant" shape — the AAD
 * lookup 404 that already got info@teachersindia.in disabled by hand. Such a row
 * can never recover on its own, so we deactivate it rather than let it poison
 * every future schedule.
 *
 * Naji UAT 2026-08-10 — 'user_not_found' (the 404 from the onlineMeetings POST)
 * is NOT quarantined any more, and that is the whole point of the split. It
 * fires while a Teams licence or a just-granted CsApplicationAccessPolicy is
 * still propagating. Quarantining it permanently disabled the newly added
 * trainer the admin was in the middle of onboarding — the class quietly
 * succeeded on another host and the row was excluded from the picker forever,
 * because the picker only ever looks at is_active = 1.
 * 'policy_missing' (403) is not quarantined either: it clears the moment the
 * policy lands.
 */
function shouldQuarantineTeamsHost(err: unknown): boolean {
  return teamsErrorCode(err) === 'host_unknown';
}

/**
 * Walks `candidates` in order and returns the first host Graph accepts.
 *
 * On success: stamps policy_verified_at + clears last_error on that host, same
 * as the single-host path always did. On a host-level failure: records
 * last_error, quarantines the row only when the mailbox genuinely does not
 * exist, and moves on to the next candidate. On an app-level failure: stops
 * without writing to any host row, because the trainers are not at fault. On
 * anything else: stops immediately and hands the raw message back, so a
 * throttle or an outage is not retried four times.
 *
 * `hardFailedHosts` (returned on BOTH outcomes) lists the accounts that rejected
 * this meeting host-level. A batch caller should drop them from the candidate
 * list for its remaining entries — see operations-service.addLiveClasses.
 */
export async function createTeamsMeetingOnFirstWorkingHost(
  prisma: PrismaClient,
  service: Pick<TeamsMeetingService, 'createMeeting'>,
  candidates: readonly TeamsHostCandidate[],
  input: { subject: string; startDateTime: string; endDateTime: string },
  now: Date = new Date(),
): Promise<TeamsMeetingAttempt> {
  const tried: string[] = [];
  const hardFailedHosts: string[] = [];
  let lastError = '';

  for (const candidate of candidates) {
    tried.push(candidate.teamsEmail);
    try {
      const meeting = await service.createMeeting({
        hostEmail: candidate.teamsEmail,
        subject: input.subject,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
      });
      await prisma.teams_meeting_hosts.updateMany({
        where: { teams_email: candidate.teamsEmail },
        data: { policy_verified_at: now, last_error: null, updated_at: now },
      });
      return { ok: true, hostEmail: candidate.teamsEmail, meeting, hardFailedHosts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;

      // Naji UAT 2026-08-10 — bail before the write. Our own app registration
      // being un-consented is not something to record against a trainer, and
      // naming the host in "tried all N accounts" sends operations hunting in
      // the wrong place entirely.
      if (isAppLevelTeamsFailure(err)) {
        return {
          ok: false,
          hardFailedHosts,
          message: `Microsoft Graph rejected our app registration, not the host account (${candidate.teamsEmail}). Re-grant admin consent for OnlineMeetings.ReadWrite.All in Azure, then retry. ${msg}`,
        };
      }

      const quarantine = shouldQuarantineTeamsHost(err);
      await prisma.teams_meeting_hosts.updateMany({
        where: { teams_email: candidate.teamsEmail },
        data: {
          last_error: msg.substring(0, 1000),
          updated_at: now,
          ...(quarantine ? { is_active: 0 } : {}),
        },
      });
      if (!isHostLevelTeamsFailure(err)) {
        return { ok: false, message: msg, hardFailedHosts };
      }
      hardFailedHosts.push(candidate.teamsEmail);
    }
  }

  if (tried.length === 0) {
    return { ok: false, message: 'No Teams host account was free for this session.', hardFailedHosts };
  }

  return {
    ok: false,
    hardFailedHosts,
    message: `Tried all ${tried.length} available Teams host account(s) (${tried.join(', ')}) and none could host this session. Last error: ${lastError}`,
  };
}
