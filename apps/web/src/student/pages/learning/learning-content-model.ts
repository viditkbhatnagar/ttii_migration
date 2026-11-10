// Pure view-model helpers for the student course player (no React).

interface ContentLike {
  id: string;
  type: string;
}

// Content-library mirrors carry ids offset by 1e9 and have no lesson_files row.
const CONTENT_ASSET_ID_OFFSET = 1_000_000_000;

// Documents / articles complete when opened; the API records it per lesson file.
export function isTrackableMaterial(content: ContentLike): boolean {
  if (content.type !== 'pdf' && content.type !== 'article') return false;
  if (!/^\d+$/.test(content.id)) return false;
  return Number(content.id) < CONTENT_ASSET_ID_OFFSET;
}

// Documents and quizzes need room: they may take over the right sidebar and,
// via the Expand toggle, the lesson list too.
export function wantsWideLayout(content: ContentLike | null): boolean {
  return content !== null && (content.type === 'pdf' || content.type === 'quiz');
}

export type PlayerColumns = 'three' | 'two' | 'one';

// Right sidebar hides for wide content; Expand also hides the lesson list.
export function playerColumns(content: ContentLike | null, expanded: boolean): PlayerColumns {
  if (!wantsWideLayout(content)) return 'three';
  return expanded ? 'one' : 'two';
}
