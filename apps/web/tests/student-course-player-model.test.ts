import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import {
  isTrackableMaterial,
  playerColumns,
  wantsWideLayout,
} from '../src/student/pages/learning/learning-content-model';
import { parseLastAttempt, summarizeResult } from '../src/student/lib/quiz-result-model';

// TTII 2026-11-10 - AI Educator trainer report: course progress not shown,
// quiz scores not shown, live classes 0, PPT and quiz rendered phone-sized.

describe('documents complete on open', () => {
  test('pdf and article lesson files are tracked; video, quiz and library mirrors are not', () => {
    expect(isTrackableMaterial({ id: '412', type: 'pdf' })).toBe(true);
    expect(isTrackableMaterial({ id: '412', type: 'article' })).toBe(true);
    expect(isTrackableMaterial({ id: '412', type: 'video' })).toBe(false);
    expect(isTrackableMaterial({ id: '412', type: 'quiz' })).toBe(false);
    expect(isTrackableMaterial({ id: 'live-3', type: 'pdf' })).toBe(false);
    expect(isTrackableMaterial({ id: '1000000007', type: 'pdf' })).toBe(false);
  });
});

describe('player columns', () => {
  const pdf = { id: '1', type: 'pdf' };
  const quiz = { id: '2', type: 'quiz' };
  const video = { id: '3', type: 'video' };

  test('documents and quizzes drop the right sidebar; Expand also drops the lesson list', () => {
    expect(playerColumns(pdf, false)).toBe('two');
    expect(playerColumns(quiz, false)).toBe('two');
    expect(playerColumns(pdf, true)).toBe('one');
    expect(playerColumns(quiz, true)).toBe('one');
  });

  test('other content and the empty state keep the three-column layout', () => {
    expect(playerColumns(video, false)).toBe('three');
    expect(playerColumns(video, true)).toBe('three');
    expect(playerColumns(null, true)).toBe('three');
    expect(wantsWideLayout(null)).toBe(false);
  });
});

describe('quiz result view model', () => {
  test('summarises a graded submit', () => {
    expect(summarizeResult({ total_questions: 10, correct: 7, incorrect: 2, skip: 1, score: 70, total_marks: 10 })).toEqual({
      total: 10, correct: 7, incorrect: 2, skipped: 1, percentage: 70, marksLabel: '7 / 10',
    });
  });

  test('clamps the percentage', () => {
    expect(summarizeResult({ total_questions: 1, correct: 1, incorrect: 0, skip: 0, score: 140 }).percentage).toBe(100);
  });

  test('parses the latest attempt, graded or legacy', () => {
    expect(parseLastAttempt(null)).toBeNull();
    expect(parseLastAttempt({ attempt_id: 4, submitted_at: '2026-10-20T10:00:00.000Z', graded: false })).toMatchObject({ graded: false, attemptId: 4 });
    expect(parseLastAttempt({ attempt_id: 5, graded: true, correct: 1, incorrect: 1, skip: 0, score: 50, total_questions: 2 })).toMatchObject({
      graded: true, correct: 1, incorrect: 1, score: 50, totalQuestions: 2,
    });
  });
});

describe('wiring guards', () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
  const page = read('../src/student/pages/learning/StudentLearningPage.tsx');

  test('live classes load for the open course, not only when the Live tab is chosen', () => {
    expect(page).not.toMatch(/leftTab !== 'live'/);
    expect(page).toMatch(/if \(activeCourseId === null\) return;\s*let cancelled = false;\s*setLiveClassesLoading\(true\)/);
  });

  test('the PDF viewer uses the tall @supports class and the toggle exists', () => {
    expect(page).toContain('pdf-viewer-h');
    expect(page).toContain('Exit full view');
    expect(read('../src/app.css')).toMatch(/@supports \(height: 1dvh\)\s*\{\s*\.pdf-viewer-h\s*\{\s*height: 80dvh/);
  });
});
