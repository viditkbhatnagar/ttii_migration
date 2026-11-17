// The formal-exam screen guard (proctoring) — the counting rules, no DOM.
//
// TTII 2026-11-17 (Risha) — a student who scored 69-70/70 on five papers was
// auto-submitted on the sixth 60 seconds in, with 0 answers. The old guard
// counted EVERY browser event as its own warning, de-duplicated only within
// 800 ms. One slip fires several events: pressing Esc or a notification steals
// focus (`blur`), the tab may hide (`visibilitychange`), and full screen exits
// (`fullscreenchange`) after the OS animation, often more than 800 ms later.
// Pressing "Return to Exam" re-enters full screen, whose animation can fire yet
// another blur. Three warnings, and the paper was gone, without the student
// ever choosing to leave three times.
//
// The rules now:
//   - One slip = one warning. After a warning nothing more counts until the
//     student acknowledges it ("Return to Exam"), however many events fire.
//   - A short grace after Start and after every acknowledgement absorbs the
//     events full screen itself fires while it animates in.
//   - Every counted warning is logged with its time and kind, and the report
//     goes to the server with each autosave and with the submit, so staff can
//     see exactly why a paper ended.

export type ProctorEventKind = 'tab' | 'window' | 'fullscreen';

export interface ProctorEvent {
  at: string;
  kind: ProctorEventKind;
}

export interface ProctorGuardState {
  warnings: number;
  /** True from a counted warning until the student acknowledges it. */
  away: boolean;
  /** Events before this instant (ms) are the guard's own full-screen transition. */
  graceUntil: number;
  events: ProctorEvent[];
}

export interface ProctorReport {
  warnings: number;
  events: ProctorEvent[];
}

export const PROCTOR_MAX_WARNINGS = 3;
/** Long enough for a macOS full-screen animation (~1 s) with room to spare. */
export const PROCTOR_GRACE_MS = 2500;
const MAX_EVENTS = 20;

export function initialProctorState(now: number): ProctorGuardState {
  return { warnings: 0, away: false, graceUntil: now + PROCTOR_GRACE_MS, events: [] };
}

export interface LeaveOutcome {
  state: ProctorGuardState;
  counted: boolean;
  limitReached: boolean;
}

/** The student left the exam screen (tab hidden, window blurred, full screen exited). */
export function recordLeave(state: ProctorGuardState, kind: ProctorEventKind, now: number): LeaveOutcome {
  if (state.away || now < state.graceUntil || state.warnings >= PROCTOR_MAX_WARNINGS) {
    return { state, counted: false, limitReached: false };
  }
  const warnings = state.warnings + 1;
  const events = [...state.events, { at: new Date(now).toISOString(), kind }].slice(-MAX_EVENTS);
  return {
    state: { ...state, warnings, away: true, events },
    counted: true,
    limitReached: warnings >= PROCTOR_MAX_WARNINGS,
  };
}

/** The student pressed "Return to Exam": the slip is closed and full screen is re-entering. */
export function acknowledgeWarning(state: ProctorGuardState, now: number): ProctorGuardState {
  return { ...state, away: false, graceUntil: now + PROCTOR_GRACE_MS };
}

export function proctorReport(state: ProctorGuardState): ProctorReport {
  return { warnings: state.warnings, events: state.events };
}
