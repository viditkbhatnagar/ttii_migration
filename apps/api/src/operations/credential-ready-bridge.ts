import { CredentialEligibilityService } from './credential-eligibility-service.js';
import { registerReadyProvider, type ReadyCandidate } from './credential-insights-data.js';

// Connects the eligibility engine (Ready to Issue) to the Dashboard / Reports
// dataset: only learners currently "Ready" count as ready to issue.

export function connectCredentialReadyProvider(service: CredentialEligibilityService = new CredentialEligibilityService()): void {
  registerReadyProvider(async (): Promise<ReadyCandidate[]> => {
    const result = await service.list();
    if (result.status !== 1 || !result.data) return [];
    return result.data.rows
      .filter((r) => r.status === 'Ready')
      .map((r) => ({
        enrolId: r.enrolId, enrolmentNo: r.enrolmentNo, learner: r.learner, course: r.course, batch: r.batch,
        centreId: r.centreId, centre: r.centre, completionDate: r.completionDate, daysWaiting: r.daysWaiting,
        holdReasons: r.holdReason ? [r.holdReason] : [],
      }));
  });
}
