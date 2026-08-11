// Naji UAT 2026-08-11 — "Link Existing Recorded Session" copies a past session's
// recording reference into a new cohort. The copy is marked by its `platform`,
// and that marker is load-bearing in three places that must agree:
//
//   * jobs/teams-artifacts-sync only sweeps platform='teams', so a copy must NOT
//     carry the source's platform or the sync would try to re-fetch a Graph
//     meeting it does not own and overwrite the recording.
//   * certificate-service counts platform='teams' sessions as the attendance
//     DENOMINATOR. Importing 18 past sessions into a cohort that ran 5 would
//     otherwise collapse every learner's attendance percentage and break
//     certificate eligibility — silently, and months later.
//   * the admin cohort page badges these rows as "Linked" so they can be told
//     apart from sessions the cohort actually ran.
//
// It first shipped declared separately on each side, and the two drifted
// immediately: the API wrote 'recorded' while the admin page tested for
// 'imported', so the badge never rendered and an imported session was
// indistinguishable from a real one. Hence one declaration, here, imported by
// both tiers.
export const IMPORTED_LIVE_SESSION_PLATFORM = 'recorded';

/** True when a live_class row is a linked copy of a past recorded session. */
export function isImportedLiveSessionPlatform(platform: unknown): boolean {
  return typeof platform === 'string'
    && platform.trim().toLowerCase() === IMPORTED_LIVE_SESSION_PLATFORM;
}
