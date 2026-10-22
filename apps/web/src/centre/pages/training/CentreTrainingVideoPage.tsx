import { useMemo } from 'react';
import { ChevronLeft, ExternalLink, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { fmtDay } from '../kit/format.js';
import { CentrePageHeader, NoticeCard } from '../kit/page-kit.js';
import { Thumb } from './TrainingThumb.js';
import { relatedVideos, toTrainingVideos, videoEmbed } from './training-model.js';

function videoIdFromPath(): string {
  const parts = window.location.pathname.replace(/\/$/, '').split('/');
  return decodeURIComponent(parts[parts.length - 1] ?? '');
}

/** A training video with its player, description and more videos from the library. */
export default function CentreTrainingVideoPage({ api, session, onNavigate }: CentrePageProps) {
  const videoId = useMemo(videoIdFromPath, []);
  const { data, loading, error } = useAdminPageData(async () => toTrainingVideos(await api.loadTrainingVideos(session.token)), [api, session.token]);
  const back = <Button variant="outline" className="gap-1.5" onClick={() => onNavigate('/centre/training')}><ChevronLeft className="h-4 w-4" />Back to Training Center</Button>;

  if (loading) return <PageLoader label="Loading video..." />;
  const videos = data ?? [];
  const v = videos.find((x) => x.id === videoId);
  if (error || !v) return <div className="space-y-5"><CentrePageHeader title="Training Center" actions={back} /><NoticeCard tone={error ? 'error' : 'muted'}>{error || 'Video not found.'}</NoticeCard></div>;

  const embed = videoEmbed(v.videoUrl);
  const related = relatedVideos(videos, v);

  return (
    <div className="space-y-5">
      <CentrePageHeader title="Training Center" actions={back} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card className="overflow-hidden border-border/70 p-0 shadow-[var(--shadow-elegant)]">
            {embed?.kind === 'file' && <video key={embed.src} src={embed.src} controls preload="metadata" className="aspect-video w-full bg-black" />}
            {embed?.kind === 'iframe' && (
              <iframe key={embed.src} src={embed.src} title={v.title} className="aspect-video w-full bg-black" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            )}
            {!embed && (
              <Thumb v={v} className="aspect-video">
                <div className="absolute inset-0 bg-black/30" />
                <p className="relative max-w-sm px-6 text-center text-sm text-white">
                  {v.videoUrl ? 'This video opens on its own page.' : 'No video link has been added for this training yet.'}
                </p>
              </Thumb>
            )}
          </Card>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{v.category}</Badge>
              {v.addedYmd && <span className="text-xs text-muted-foreground">Added {fmtDay(v.addedYmd)}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-bold leading-tight">{v.title}</h1>
            {v.videoUrl && (
              <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5 rounded-full">
                <a href={v.videoUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Open in a new tab</a>
              </Button>
            )}
          </div>
          <Card className="space-y-2 border-border/70 p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{v.description || 'No description was added for this video.'}</p>
          </Card>
        </div>
        <aside aria-label="More training videos" className="space-y-3">
          <h2 className="text-sm font-semibold">More training videos</h2>
          {related.length === 0 && <p className="text-sm text-muted-foreground">This is the only video in the library.</p>}
          {related.map((r) => (
            <button key={r.id} type="button" onClick={() => onNavigate(`/centre/training/view/${r.id}`)} className="group block w-full text-left focus-visible:outline-none">
              <Card className="flex-row gap-3 border-border/70 p-3 shadow-[var(--shadow-soft)] transition group-hover:shadow-[var(--shadow-elegant)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <Thumb v={r} className="h-16 w-28 shrink-0 rounded-lg"><Play className="relative h-5 w-5 fill-white text-white" /></Thumb>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.category}</p>
                </div>
              </Card>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
