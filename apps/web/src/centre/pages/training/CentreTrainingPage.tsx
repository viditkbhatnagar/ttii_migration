// Centre / Associate Training Center (Naji 2026-06-30). Mirrors the counsellor
// Training page (Lovable design: most-recent video featured on top, then a
// "Browse by Category" filter + video grid). Reads /centre/training_videos —
// the SAME training_videos table admin uploads to — so the library stays in
// sync across admin, counsellor, centre and associate. Uses standard portal
// tokens (the counsellor-theme CSS vars are scoped to that subtree only).

import { useMemo, useState } from 'react';
import { Search, Play, Filter, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  videoType: string;
  videoUrl: string;
  thumbnail: string;
  thumbGradient: string;
  initials: string;
}

const GRADS = [
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-sky-500 via-cyan-500 to-emerald-500',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-blue-600 via-indigo-600 to-violet-700',
  'from-yellow-500 via-amber-500 to-orange-600',
  'from-teal-500 via-emerald-600 to-green-600',
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  admission: '🎓',
  product: '📦',
  lms: '💻',
  sales: '📈',
  communication: '💬',
  compliance: '🛡️',
};

// Training video descriptions are authored as rich text (HTML). Render as plain
// text here so raw tags never leak into the card UI.
function stripHtmlToText(html: string): string {
  return html
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function gradientFor(index: number): string {
  return GRADS[index % GRADS.length] ?? GRADS[0];
}

function emojiFor(category: string): string {
  const key = category.toLowerCase();
  for (const [needle, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (key.includes(needle)) return emoji;
  }
  return '';
}

function initialsFor(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const a = words[0]?.charAt(0) ?? '';
  const b = words[1]?.charAt(0) ?? '';
  return (a + b).toUpperCase() || 'TV';
}

function isUsableThumb(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function openVideo(url: string): void {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

export default function CentreTrainingPage({ api, session }: CentrePageProps) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<string>('All');

  const { data, loading, error } = useAdminPageData(
    () => api.loadTrainingVideos(session.token),
    [api, session.token],
  );

  const videos = useMemo<TrainingVideo[]>(
    () =>
      toRecords(data).map((v, i) => {
        const title = asString(v.title) || 'Untitled';
        return {
          id: asString(v.id) || `v-${i}`,
          title,
          description: stripHtmlToText(asString(v.description)),
          category: asString(v.category) || 'General',
          videoType: asString(v.video_type),
          videoUrl: asString(v.video_url),
          thumbnail: asString(v.thumbnail),
          thumbGradient: gradientFor(i),
          initials: initialsFor(title),
        };
      }),
    [data],
  );

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const v of videos) seen.set(v.category, (seen.get(v.category) ?? 0) + 1);
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count }));
  }, [videos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (active === 'All' || v.category === active) &&
        (v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)),
    );
  }, [videos, search, active]);

  // Most-recent video (the API returns newest first) shown as the hero.
  const featured = videos[0];

  if (loading) {
    return <PageLoader label="Loading training videos..." />;
  }

  if (error) {
    return (
      <main className="space-y-6">
        <Card className="border-border/70 p-12 text-center shadow-sm">
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header + Search */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Level up with curated courses, masterclasses, and certifications.
          </p>
        </div>
        <div className="relative w-full sm:w-[380px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search videos, instructors, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-full pl-9"
          />
        </div>
      </div>

      {/* Featured hero (most-recent video) */}
      {featured && (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <button
            type="button"
            onClick={() => openVideo(featured.videoUrl)}
            className="group grid w-full text-left md:grid-cols-2"
            aria-label={`Watch ${featured.title}`}
          >
            <div
              className={cn(
                'relative flex h-56 min-h-[240px] items-center justify-center bg-gradient-to-br md:h-full',
                featured.thumbGradient,
              )}
            >
              {isUsableThumb(featured.thumbnail) && (
                <img
                  src={featured.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-2xl backdrop-blur transition group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-foreground text-foreground" />
              </div>
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge className="border-0 bg-white/90 text-foreground hover:bg-white">
                  <Sparkles className="mr-1 h-3 w-3" /> Featured
                </Badge>
                <Badge className="border-0 bg-black/40 text-white backdrop-blur">{featured.category}</Badge>
              </div>
              {featured.videoType ? (
                <div className="absolute bottom-4 right-4">
                  <Badge className="border-0 bg-black/60 text-white backdrop-blur">{featured.videoType}</Badge>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col justify-center p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New This Week</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">{featured.title}</h2>
              {featured.description && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{featured.description}</p>
              )}
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {featured.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">TTII Training</p>
                  <p className="text-xs text-muted-foreground">{featured.category}</p>
                </div>
              </div>
              {/* Visual CTA only — the whole hero is the clickable control,
                  so this stays a span (no nested <button>). */}
              <div className="mt-6">
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition group-hover:bg-primary/90">
                  <Play className="h-4 w-4" /> Watch Now
                </span>
              </div>
            </div>
          </button>
        </Card>
      )}

      {/* Browse by Category */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Browse by Category</h3>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <CategoryPill label="All" active={active === 'All'} onClick={() => setActive('All')} count={videos.length} />
          {categories.map((c) => (
            <CategoryPill
              key={c.name}
              label={c.name}
              icon={emojiFor(c.name)}
              count={c.count}
              active={active === c.name}
              onClick={() => setActive(c.name)}
            />
          ))}
        </div>
      </div>

      {/* Video grid */}
      {filtered.length === 0 ? (
        <Card className="border-border/70 p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No training videos found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} v={v} onWatch={() => openVideo(v.videoUrl)} />
          ))}
        </div>
      )}
    </main>
  );
}

function CategoryPill({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted',
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
      {typeof count === 'number' && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px]',
            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function VideoCard({ v, onWatch }: { v: TrainingVideo; onWatch: () => void }) {
  return (
    <button type="button" onClick={onWatch} className="group text-left" aria-label={`Watch ${v.title}`}>
      <Card className="overflow-hidden border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className={cn('relative flex aspect-video items-center justify-center bg-gradient-to-br', v.thumbGradient)}>
          {isUsableThumb(v.thumbnail) && (
            <img src={v.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-foreground text-foreground" />
          </div>
          {v.videoType ? (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {v.videoType}
            </span>
          ) : null}
        </div>
        <div className="p-3.5">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {v.initials}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-primary">
                {v.title}
              </p>
              {/* videoType only — the category already shows in the badge below,
                  so don't echo it here when videoType is empty. */}
              {v.videoType ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">{v.videoType}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-medium">
              {v.category}
            </Badge>
          </div>
        </div>
      </Card>
    </button>
  );
}
