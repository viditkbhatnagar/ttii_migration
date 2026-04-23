import { ConfidentialClientApplication } from '@azure/msal-node';

export interface TeamsMeetingCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface CreateTeamsMeetingInput {
  /** The trainer's UPN in the M365 tenant (e.g. jane@teachersindia.in). */
  hostEmail: string;
  /** Meeting subject shown in Teams + Outlook calendar invite. */
  subject: string;
  /** ISO-8601 start time (UTC). */
  startDateTime: string;
  /** ISO-8601 end time (UTC). */
  endDateTime: string;
}

export interface CreateTeamsMeetingResult {
  meetingId: string;
  joinUrl: string;
  joinWebUrl: string | null;
}

export class TeamsMeetingError extends Error {
  public readonly code:
    | 'policy_missing'          // 403 — trainer not covered by Cloud Communications Access Policy
    | 'unauthorized'            // 401 — app creds wrong or permission not granted
    | 'user_not_found'          // 404 — host email not in tenant
    | 'network'                 // fetch / connectivity
    | 'unknown';                // everything else

  constructor(code: TeamsMeetingError['code'], message: string, public readonly status?: number) {
    super(message);
    this.code = code;
    this.name = 'TeamsMeetingError';
  }
}

/**
 * Creates Microsoft Teams online meetings on behalf of a trainer using
 * Microsoft Graph + app-only (client-credentials) auth.
 *
 * Prerequisites in Azure tenant (one-time setup by admin — see deploy/
 * teams-admin-setup.md):
 *   1. App registration has "OnlineMeetings.ReadWrite.All" application
 *      permission, with admin consent granted.
 *   2. Each `hostEmail` is assigned a CsApplicationAccessPolicy granting
 *      our app the right to create meetings on their behalf.
 *
 * If either prerequisite is missing, createMeeting() throws a
 * TeamsMeetingError with code 'policy_missing' or 'unauthorized'.
 */
export class TeamsMeetingService {
  private readonly msal: ConfidentialClientApplication;

  constructor(
    private readonly creds: TeamsMeetingCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.msal = new ConfidentialClientApplication({
      auth: {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        authority: `https://login.microsoftonline.com/${creds.tenantId}`,
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const result = await this.msal.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    if (!result?.accessToken) {
      throw new TeamsMeetingError('unauthorized', 'Failed to acquire Graph access token (check clientId/secret/tenantId).');
    }
    return result.accessToken;
  }

  async createMeeting(input: CreateTeamsMeetingInput): Promise<CreateTeamsMeetingResult> {
    const token = await this.getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(input.hostEmail)}/onlineMeetings`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
          subject: input.subject,
        }),
      });
    } catch (err) {
      throw new TeamsMeetingError('network', `Graph request failed: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const body = await response.text();
      const code = this.classifyError(response.status, body);
      const lower = body.toLowerCase();
      const hint =
        code === 'policy_missing'
          ? ` — assign a CsApplicationAccessPolicy to ${input.hostEmail} (PowerShell: Grant-CsApplicationAccessPolicy -PolicyName <name> -Identity ${input.hostEmail}).`
          : code === 'unauthorized'
            ? ' — verify OnlineMeetings.ReadWrite.All application permission is granted + admin-consented.'
            : code === 'user_not_found'
              ? ` — user ${input.hostEmail} not found in the M365 tenant.`
              : '';
      throw new TeamsMeetingError(
        code,
        `Graph online-meeting create failed (${response.status}): ${body.substring(0, 200)}${hint}`,
        response.status,
      );
      void lower;
    }

    const data = (await response.json()) as {
      id?: string;
      joinUrl?: string;
      joinWebUrl?: string;
    };
    if (!data.id || !data.joinUrl) {
      throw new TeamsMeetingError('unknown', 'Graph returned 200 but missing id/joinUrl in response body.');
    }
    return {
      meetingId: data.id,
      joinUrl: data.joinUrl,
      joinWebUrl: data.joinWebUrl ?? null,
    };
  }

  private classifyError(status: number, body: string): TeamsMeetingError['code'] {
    if (status === 401) return 'unauthorized';
    if (status === 404) return 'user_not_found';
    if (status === 403) {
      // Graph returns 403 with an 'Forbidden' / policy hint when the trainer
      // isn't covered by an ApplicationAccessPolicy.
      const lc = body.toLowerCase();
      if (lc.includes('policy') || lc.includes('forbidden')) return 'policy_missing';
      return 'policy_missing';
    }
    return 'unknown';
  }
}

/** Returns null if Teams config is missing from env (feature disabled). */
export function createTeamsMeetingService(creds: {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  tenantId?: string | undefined;
}): TeamsMeetingService | null {
  if (!creds.clientId || !creds.clientSecret || !creds.tenantId) return null;
  return new TeamsMeetingService({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    tenantId: creds.tenantId,
  });
}
