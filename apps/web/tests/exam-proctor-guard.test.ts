import { describe, expect, test } from 'vitest';

import {
  PROCTOR_GRACE_MS,
  PROCTOR_MAX_WARNINGS,
  acknowledgeWarning,
  initialProctorState,
  proctorReport,
  recordLeave,
  type ProctorEventKind,
  type ProctorGuardState,
} from '../src/student/components/exam-proctor-guard';

// TTII 2026-11-17 (Risha, exam 38) — a student was auto-submitted 60 seconds
// into a paper with 0 answers. One slip fires several browser events (blur,
// visibilitychange, fullscreenchange after the OS animation), and the old guard
// counted each as its own warning.

const T0 = 1_000_000;
const afterGrace = T0 + PROCTOR_GRACE_MS + 1;

function leaveAll(state: ProctorGuardState, events: Array<[ProctorEventKind, number]>) {
  let s = state;
  let limit = false;
  for (const [kind, at] of events) {
    const out = recordLeave(s, kind, at);
    s = out.state;
    limit = limit || out.limitReached;
  }
  return { state: s, limit };
}

describe('the exam-screen guard counts one warning per slip', () => {
  test('one Esc press firing blur, hidden and a late fullscreen exit is ONE warning', () => {
    const { state, limit } = leaveAll(initialProctorState(T0), [
      ['window', afterGrace],
      ['tab', afterGrace + 300],
      ['fullscreen', afterGrace + 1200],
    ]);
    expect(state.warnings).toBe(1);
    expect(limit).toBe(false);
    expect(state.events).toEqual([{ at: new Date(afterGrace).toISOString(), kind: 'window' }]);
  });

  test('the full-screen re-entry after "Return to Exam" cannot add a warning', () => {
    const first = leaveAll(initialProctorState(T0), [['fullscreen', afterGrace]]).state;
    const back = acknowledgeWarning(first, afterGrace + 5000);
    const out = recordLeave(back, 'window', afterGrace + 5800);
    expect(out.counted).toBe(false);
    expect(out.state.warnings).toBe(1);
  });

  test('events while full screen animates in on Start are ignored', () => {
    const out = recordLeave(initialProctorState(T0), 'window', T0 + 900);
    expect(out.counted).toBe(false);
  });

  test('three separate, acknowledged slips still reach the limit', () => {
    let s = initialProctorState(T0);
    let at = afterGrace;
    let limit = false;
    for (let i = 0; i < PROCTOR_MAX_WARNINGS; i += 1) {
      const out = recordLeave(s, 'tab', at);
      expect(out.counted).toBe(true);
      limit = out.limitReached;
      s = acknowledgeWarning(out.state, at + 10_000);
      at += 10_000 + PROCTOR_GRACE_MS + 1;
    }
    expect(limit).toBe(true);
    expect(proctorReport(s).warnings).toBe(PROCTOR_MAX_WARNINGS);
    expect(proctorReport(s).events).toHaveLength(PROCTOR_MAX_WARNINGS);
  });

  test('nothing counts past the limit', () => {
    const s: ProctorGuardState = { warnings: PROCTOR_MAX_WARNINGS, away: false, graceUntil: 0, events: [] };
    expect(recordLeave(s, 'tab', afterGrace).counted).toBe(false);
  });
});
