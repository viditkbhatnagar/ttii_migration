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
    | 'not_ready'               // 404 on recordings/attendance — Teams hasn't finished processing the meeting
    | 'network'                 // fetch / connectivity
    | 'unknown';                // everything else

  constructor(code: TeamsMeetingError['code'], message: string, public readonly status?: number) {
    super(message);
    this.code = code;
    this.name = 'TeamsMeetingError';
  }
}

export interface TeamsRecording {
  /** Graph-assigned recording ID (unique within the meeting). */
  recordingId: string;
  /** Back-reference to the parent onlineMeeting. */
  meetingId: string;
  /** Authenticated SharePoint URL pointing at the MP4. Needs the Graph Bearer token to download. */
  contentUrl: string;
  /** ISO-8601 timestamp of when Teams finished processing the recording. */
  createdDateTime: string;
}

export interface TeamsAttendanceInterval {
  joinDateTime: string;
  leaveDateTime: string;
  durationInSeconds: number;
}

export interface TeamsAttendanceRecord {
  email: string;
  displayName: string;
  /** 'Organizer' | 'Presenter' | 'Attendee'. */
  role: string;
  totalSeconds: number;
  intervals: TeamsAttendanceInterval[];
}

export interface TeamsAttendanceReport {
  reportId: string;
  meetingStartDateTime: string;
  meetingEndDateTime: string;
  records: TeamsAttendanceRecord[];
}

export interface TeamsRecordingStream {
  /** MP4 byte stream. Iterate with a worker that writes to storage; don't buffer. */
  body: ReadableStream<Uint8Array>;
  /** Size hint from the server, or null if the response was chunked without a Content-Length. */
  contentLength: number | null;
  /** MIME type reported by SharePoint (usually `video/mp4`). */
  contentType: string;
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

  /**
   * Resolves a UPN (email) to the user's Azure AD object ID.
   *
   * The Graph `/users/{id}/onlineMeetings` endpoint — unlike most other
   * `/users/{id}/...` endpoints — rejects UPNs with 404 "UnknownError"
   * when called with app-only auth. It requires the user's GUID object ID.
   * We resolve it here and cache per-process.
   */
  private readonly objectIdCache = new Map<string, string>();

  private async resolveObjectId(upn: string, token: string): Promise<string> {
    const cached = this.objectIdCache.get(upn.toLowerCase());
    if (cached) return cached;

    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}?$select=id`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new TeamsMeetingError('network', `Graph user lookup failed: ${(err as Error).message}`);
    }

    if (response.status === 404) {
      throw new TeamsMeetingError('user_not_found', `User ${upn} not found in the M365 tenant.`, 404);
    }
    if (response.status === 401 || response.status === 403) {
      throw new TeamsMeetingError('unauthorized', `Graph user lookup rejected (${response.status}) — check app permissions (User.Read.All).`, response.status);
    }
    if (!response.ok) {
      const body = await response.text();
      throw new TeamsMeetingError('unknown', `Graph user lookup failed (${response.status}): ${body.substring(0, 200)}`, response.status);
    }

    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      throw new TeamsMeetingError('unknown', `Graph user lookup returned no id for ${upn}.`);
    }
    this.objectIdCache.set(upn.toLowerCase(), data.id);
    return data.id;
  }

  /** Verifies the host exists + is resolvable by Graph. Used by Test Policy. */
  async resolveHost(upn: string): Promise<string> {
    const token = await this.getAccessToken();
    return this.resolveObjectId(upn, token);
  }

  async createMeeting(input: CreateTeamsMeetingInput): Promise<CreateTeamsMeetingResult> {
    const token = await this.getAccessToken();
    const objectId = await this.resolveObjectId(input.hostEmail, token);
    const url = `https://graph.microsoft.com/v1.0/users/${objectId}/onlineMeetings`;
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
      const hint =
        code === 'policy_missing'
          ? ` — assign a CsApplicationAccessPolicy to ${input.hostEmail} (PowerShell: Grant-CsApplicationAccessPolicy -PolicyName <name> -Identity ${input.hostEmail}).`
          : code === 'unauthorized'
            ? ' — verify OnlineMeetings.ReadWrite.All application permission is granted + admin-consented.'
            : code === 'user_not_found'
              ? ` — user ${input.hostEmail} (objectId=${objectId}) rejected by onlineMeetings endpoint. Likely missing Teams license or CsApplicationAccessPolicy propagation.`
              : '';
      throw new TeamsMeetingError(
        code,
        `Graph online-meeting create failed (${response.status}): ${body.substring(0, 200)}${hint}`,
        response.status,
      );
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

  /**
   * Lists recordings for a meeting. Returns an empty array when the recording
   * isn't ready yet (Teams usually takes a few minutes after the meeting ends
   * to process). Throws on actual errors (auth, network, unknown Graph faults).
   *
   * Requires `OnlineMeetingRecording.Read.All` on the Azure app.
   */
  async listRecordings(meetingId: string, hostUpn: string): Promise<TeamsRecording[]> {
    const token = await this.getAccessToken();
    const objectId = await this.resolveObjectId(hostUpn, token);
    const url = `https://graph.microsoft.com/v1.0/users/${objectId}/onlineMeetings/${encodeURIComponent(meetingId)}/recordings`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new TeamsMeetingError('network', `Graph recordings list failed: ${(err as Error).message}`);
    }

    // 404 is a soft "not ready" — Teams processes recordings asynchronously.
    if (response.status === 404) {
      return [];
    }
    if (response.status === 401 || response.status === 403) {
      throw new TeamsMeetingError(
        'unauthorized',
        `Graph recordings list rejected (${response.status}) — verify OnlineMeetingRecording.Read.All is granted + admin-consented.`,
        response.status,
      );
    }
    if (!response.ok) {
      const body = await response.text();
      throw new TeamsMeetingError(
        'unknown',
        `Graph recordings list failed (${response.status}): ${body.substring(0, 200)}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      value?: Array<{
        id?: string;
        meetingId?: string;
        contentUrl?: string;
        createdDateTime?: string;
      }>;
    };

    return (data.value ?? [])
      .map((r) => ({
        recordingId: r.id ?? '',
        meetingId: r.meetingId ?? meetingId,
        contentUrl: r.contentUrl ?? '',
        createdDateTime: r.createdDateTime ?? '',
      }))
      .filter((r) => r.recordingId !== '' && r.contentUrl !== '');
  }

  /**
   * Opens a streaming download for a recording's contentUrl. The caller owns
   * the returned ReadableStream and is responsible for consuming / closing it.
   *
   * Use this to pipe MP4 bytes into object storage without buffering in memory.
   */
  async downloadRecording(contentUrl: string): Promise<TeamsRecordingStream> {
    const token = await this.getAccessToken();

    let response: Response;
    try {
      response = await this.fetchImpl(contentUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new TeamsMeetingError('network', `Recording download failed: ${(err as Error).message}`);
    }

    if (!response.ok || !response.body) {
      const text = response.body ? await response.text() : '';
      throw new TeamsMeetingError(
        'unknown',
        `Recording download failed (${response.status}): ${text.substring(0, 200)}`,
        response.status,
      );
    }

    const lenHeader = response.headers.get('content-length');
    const contentLength = lenHeader !== null && !Number.isNaN(Number(lenHeader)) ? Number(lenHeader) : null;

    return {
      body: response.body,
      contentLength,
      contentType: response.headers.get('content-type') ?? 'video/mp4',
    };
  }

  /**
   * Fetches attendance reports for a meeting and expands each report's
   * per-participant records. Returns empty array when reports aren't ready yet.
   *
   * Requires `OnlineMeetingArtifact.Read.All` on the Azure app.
   */
  async getAttendanceReports(meetingId: string, hostUpn: string): Promise<TeamsAttendanceReport[]> {
    const token = await this.getAccessToken();
    const objectId = await this.resolveObjectId(hostUpn, token);
    const reportsUrl = `https://graph.microsoft.com/v1.0/users/${objectId}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports`;

    let reportsRes: Response;
    try {
      reportsRes = await this.fetchImpl(reportsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new TeamsMeetingError('network', `Graph attendanceReports list failed: ${(err as Error).message}`);
    }

    if (reportsRes.status === 404) {
      return [];
    }
    if (reportsRes.status === 401 || reportsRes.status === 403) {
      throw new TeamsMeetingError(
        'unauthorized',
        `Graph attendanceReports rejected (${reportsRes.status}) — verify OnlineMeetingArtifact.Read.All is granted + admin-consented.`,
        reportsRes.status,
      );
    }
    if (!reportsRes.ok) {
      const body = await reportsRes.text();
      throw new TeamsMeetingError(
        'unknown',
        `Graph attendanceReports list failed (${reportsRes.status}): ${body.substring(0, 200)}`,
        reportsRes.status,
      );
    }

    const reportsData = (await reportsRes.json()) as {
      value?: Array<{
        id?: string;
        meetingStartDateTime?: string;
        meetingEndDateTime?: string;
      }>;
    };

    const reports: TeamsAttendanceReport[] = [];

    for (const report of reportsData.value ?? []) {
      if (!report.id) continue;

      const recordsUrl = `${reportsUrl}/${encodeURIComponent(report.id)}/attendanceRecords`;
      let recordsRes: Response;
      try {
        recordsRes = await this.fetchImpl(recordsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        continue; // network blip on one report; skip, sync job will retry
      }
      if (!recordsRes.ok) continue;

      const recordsData = (await recordsRes.json()) as {
        value?: Array<{
          emailAddress?: string;
          totalAttendanceInSeconds?: number;
          role?: string;
          identity?: { displayName?: string };
          attendanceIntervals?: Array<{
            joinDateTime?: string;
            leaveDateTime?: string;
            durationInSeconds?: number;
          }>;
        }>;
      };

      const records: TeamsAttendanceRecord[] = (recordsData.value ?? [])
        .map((rec) => ({
          email: rec.emailAddress ?? '',
          displayName: rec.identity?.displayName ?? '',
          role: rec.role ?? 'Attendee',
          totalSeconds: rec.totalAttendanceInSeconds ?? 0,
          intervals: (rec.attendanceIntervals ?? []).map((iv) => ({
            joinDateTime: iv.joinDateTime ?? '',
            leaveDateTime: iv.leaveDateTime ?? '',
            durationInSeconds: iv.durationInSeconds ?? 0,
          })),
        }))
        .filter((r) => r.email !== '');

      reports.push({
        reportId: report.id,
        meetingStartDateTime: report.meetingStartDateTime ?? '',
        meetingEndDateTime: report.meetingEndDateTime ?? '',
        records,
      });
    }

    return reports;
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
