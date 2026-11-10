// How a lesson file is tracked for completion. The legacy rows of the
// "Certification in Advanced Ai Educator" course (24) are all
// attachment_type NULL / lesson_provider '' and carry only lesson_type
// ('document' | 'quiz'), so the kind must fall back to lesson_type. Matching
// is case-insensitive ('Quiz' / 'quiz').

export type CompletionKind = 'video' | 'audio' | 'quiz' | 'document' | 'article' | 'other';

interface KindInput {
  lesson_type?: unknown;
  attachment_type?: unknown;
}

function norm(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function completionKind(file: KindInput): CompletionKind {
  const lessonType = norm(file.lesson_type);
  const attachmentType = norm(file.attachment_type);

  if (attachmentType === 'quiz' || lessonType === 'quiz') return 'quiz';
  if (attachmentType === 'audio' || lessonType === 'audio') return 'audio';
  if (lessonType === 'video' || attachmentType === 'url') return 'video';
  if (attachmentType === 'article' || lessonType === 'article' || lessonType === 'doc') return 'article';
  if (attachmentType === 'pdf' || attachmentType === 'document' || lessonType === 'document' || lessonType === 'pdf') {
    return 'document';
  }
  return 'other';
}

export function isMaterialKind(kind: CompletionKind): boolean {
  return kind === 'document' || kind === 'article';
}

export function isTimedKind(kind: CompletionKind): boolean {
  return kind === 'video' || kind === 'audio';
}
