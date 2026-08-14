import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, toRecords } from '../utils/admin-data-utils.js';
import { stripPreviewHtml } from '../utils/quiz-csv.js';

/**
 * Unified shape for a content row, whether it comes from lesson_files
 * ('lesson') or the Content Library / content_asset ('library').
 *
 * `id` MUST be the bare numeric id, never the source-prefixed `item_key`: the
 * two tables have colliding ids, so sending a lesson_files id to the library
 * endpoint returns a DIFFERENT, valid row rather than failing. `source` is what
 * picks the endpoint.
 */
export interface ContentPreviewRow {
  id: string;
  title: string;
  type: string;
  source: 'lesson' | 'library';
  summary: string;
}

/**
 * Preview for an article body or a quiz's questions.
 *
 * Extracted from LessonContentManagerDialog (Risha UAT 2026-08-14) so the
 * Subject Detail page can offer the same "View" on quizzes — it previously had
 * no preview for them at all, because its only view actions were "open the
 * attachment/video URL" and "render the article summary", and a quiz has
 * neither.
 */
export function ContentPreviewDialog({
  api, token, item, onClose,
}: {
  api: AdminPageProps['api'];
  token: string;
  item: ContentPreviewRow | null;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const isQuiz = item?.type.toLowerCase() === 'quiz';
  const isArticle = item?.type.toLowerCase() === 'article';

  useEffect(() => {
    if (!item || !isQuiz) { setQuestions([]); return; }
    let cancelled = false;
    setLoading(true);
    setQuestions([]);
    // Quizzes split across the two stores exactly as their content does:
    // content_asset quizzes carry their questions inline, lesson_files quizzes
    // live in the `quiz` table.
    const load = item.source === 'library'
      ? api.getContentAsset(token, item.id).then((a) => toRecords((a as { questions?: unknown } | null)?.questions))
      : api.listLessonQuizQuestions(token, item.id);
    void load
      .then((rows) => { if (!cancelled) setQuestions(rows); })
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, token, item, isQuiz]);

  return (
    <Dialog open={item !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto"
        style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>{asString(item?.title) || 'Preview'}</DialogTitle>
        </DialogHeader>
        {isArticle ? (
          <div
            className="prose max-w-none text-sm text-slate-800"
            dangerouslySetInnerHTML={{ __html: asString(item?.summary) || '<em>No content</em>' }}
          />
        ) : loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading questions…</p>
        ) : questions.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-slate-500">No questions added to this quiz yet.</p>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, idx) => {
              const correct = asString(q.correct_answer).toUpperCase();
              return (
                <li key={asString(q.id) || idx} className="rounded border p-3">
                  <div className="mb-2 text-sm font-semibold text-slate-900">Q{idx + 1}. {stripPreviewHtml(asString(q.question))}</div>
                  <ul className="space-y-1">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const text = stripPreviewHtml(asString(q[`option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d']));
                      if (!text) return null;
                      const isCorrect = letter === correct;
                      return (
                        <li key={letter} className={`flex items-start gap-2 text-sm ${isCorrect ? 'font-medium text-green-700' : 'text-slate-600'}`}>
                          {isCorrect ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <span className="w-4 shrink-0" />}
                          <span className="w-4 shrink-0 font-semibold">{letter}.</span>
                          <span className="min-w-0">{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
