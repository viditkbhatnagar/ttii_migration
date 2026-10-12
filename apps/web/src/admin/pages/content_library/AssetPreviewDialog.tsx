import { Check, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { dialogStyle } from '../course/catalog-list-model.js';
import { DIALOG_CLASS } from '../course/catalog-ui.js';
import { ANSWER_LETTERS, documentInline, videoEmbed } from './content-library-model.js';

// Content Library preview: plays a video / audio, shows a document inline (or
// offers open / download), lists a quiz's questions with the answer ticked,
// and renders an article in a SANDBOXED frame — the article body is admin-
// authored HTML, so it never goes into this page's DOM (no scripts, no forms).

function articleDoc(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
body{font-family:Poppins,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;margin:0;padding:4px 2px;word-wrap:break-word}
img,video,iframe{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:4px 8px}
</style></head><body>${html || '<p><em>No content</em></p>'}</body></html>`;
}

function VideoPreview({ url }: { url: string }) {
  const embed = videoEmbed(url);
  if (!embed) return <p className="py-6 text-center text-sm text-muted-foreground">No video URL set.</p>;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      {embed.kind === 'file'
        ? <video src={embed.src} controls className="size-full" />
        : <iframe title="Video preview" src={embed.src} className="size-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />}
    </div>
  );
}

function DocumentPreview({ url }: { url: string }) {
  if (!url) return <p className="py-6 text-center text-sm text-muted-foreground">No file uploaded.</p>;
  // The upload often strips the .pdf suffix, so only Office formats skip the
  // inline viewer. Always offer "Open in new tab" since some hosts force-download.
  return (
    <div className="space-y-3">
      {documentInline(url)
        ? <iframe src={url} title="Document preview" className="h-[60vh] w-full rounded-lg border border-border" />
        : <p className="py-6 text-center text-sm text-muted-foreground">Inline preview isn&apos;t available for this format — open or download below.</p>}
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" className="mr-2 size-4" /> Open in new tab</a>
        </Button>
        <Button asChild size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer" download><Download aria-hidden="true" className="mr-2 size-4" /> Download</a>
        </Button>
      </div>
    </div>
  );
}

function QuizPreview({ asset }: { asset: Record<string, unknown> }) {
  const questions = Array.isArray(asset.questions) ? (asset.questions as Record<string, unknown>[]) : [];
  const seconds = Number(asset.time_limit_seconds ?? 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {seconds > 0 ? <Pill tone="slate">Time: {Math.floor(seconds / 60)}m</Pill> : null}
        <Pill tone="slate">Attempts: {asString(asset.attempts_allowed) || '—'}</Pill>
        <Pill tone="slate">Pass Marks: {asString(asset.pass_marks) || '—'}</Pill>
        <Pill tone="slate">Shuffle: {asset.shuffle_questions ? 'Yes' : 'No'}</Pill>
        <Pill tone="primary">{questions.length} question{questions.length === 1 ? '' : 's'}</Pill>
      </div>
      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">No questions added.</p>
      ) : (
        <ol className="space-y-3">
          {questions.map((q, idx) => {
            const correct = asString(q.correct_answer).toUpperCase();
            return (
              <li key={idx} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-semibold">Q{idx + 1}. {asString(q.question)}</p>
                <ul className="space-y-1">
                  {ANSWER_LETTERS.map((letter) => {
                    const text = asString(q[`option_${letter.toLowerCase()}`]);
                    if (!text) return null;
                    const isCorrect = letter === correct;
                    return (
                      <li key={letter} className={`flex items-start gap-2 text-sm ${isCorrect ? 'font-medium text-emerald-700' : ''}`}>
                        {isCorrect ? <Check aria-label="Correct answer" className="mt-0.5 size-4" /> : <span className="w-4" />}
                        <span className="w-4 font-semibold">{letter}.</span>
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function AssetPreviewDialog({ asset, onClose }: { asset: Record<string, unknown> | null; onClose: () => void }) {
  const type = asset ? asString(asset.asset_type) : '';
  return (
    <Dialog open={asset !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={DIALOG_CLASS} style={dialogStyle(768)}>
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
          <DialogTitle>{asString(asset?.title) || 'Preview'}</DialogTitle>
          <DialogDescription className="capitalize">{type || 'Content'} preview</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {asset && type === 'video' ? <VideoPreview url={asString(asset.video_url)} /> : null}
          {asset && type === 'audio' ? (
            asString(asset.audio_file)
              ? <audio src={asString(asset.audio_file)} controls className="w-full" />
              : <p className="text-center text-sm text-muted-foreground">No audio file uploaded.</p>
          ) : null}
          {asset && type === 'document' ? <DocumentPreview url={asString(asset.attachment) || asString(asset.download_url)} /> : null}
          {asset && type === 'article' ? (
            <iframe title="Article preview" sandbox="allow-popups" srcDoc={articleDoc(asString(asset.summary))} className="h-[60vh] w-full rounded-lg border border-border bg-white" />
          ) : null}
          {asset && type === 'quiz' ? <QuizPreview asset={asset} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
