import { useMemo, useState } from 'react';
import { Search, Play, Filter, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

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

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// Training video descriptions are authored in a rich-text editor and stored as
// HTML (e.g. "<p>test</p><p><i>abcfeg</i></p>"). Render as plain text here so
// raw tags never leak into the card UI. (Scoped to this read-only view — the
// admin edit form still needs the original HTML, so the API is left untouched.)
function stripHtmlToText(html: string): string {
  return html
    // Only real tags (open/close starting with a letter) — leaves stray
    // "<" / ">" in prose (e.g. "score < 5 > grade") intact.
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

export default function CounsellorTrainingPage({ api, session }: CounsellorPageProps) {
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

  const featured = videos[0];

  if (loading) {
    return <DashboardLoader label="training" tone="theme" />;
  }

  if (error) {
    return (
      <main className="space-y-6">
        <Card className="border-border/70 shadow-[var(--shadow-soft)] p-12 text-center">
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
          <p className="text-sm text-muted-foreground mt-1">
            Level up with curated courses, masterclasses, and certifications.
          </p>
        </div>
        <div className="relative w-full sm:w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos, instructors, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full"
          />
        </div>
      </div>

      {/* Featured hero */}
      {featured && (
        <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)]">
          <button
            type="button"
            onClick={() => openVideo(featured.videoUrl)}
            className="group grid md:grid-cols-2 w-full text-left"
            aria-label={`Watch ${featured.title}`}
          >
            <div
              className={cx(
                'relative h-56 md:h-full min-h-[240px] bg-gradient-to-br flex items-center justify-center',
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
              <div className="relative h-16 w-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-2xl group-hover:scale-110 transition">
                <Play className="h-7 w-7 ml-1 text-foreground fill-foreground" />
              </div>
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-white/90 text-foreground border-0 hover:bg-white">
                  <Sparkles className="h-3 w-3 mr-1" /> Featured
                </Badge>
                <Badge className="bg-black/40 text-white border-0 backdrop-blur">{featured.category}</Badge>
              </div>
              <div className="absolute bottom-4 right-4">
                <Badge className="bg-black/60 text-white border-0 backdrop-blur">
                  {featured.videoType || featured.category}
                </Badge>
              </div>
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">New This Week</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">{featured.title}</h2>
              {featured.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
              )}
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {featured.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">TTII Training</p>
                  <p className="text-xs text-muted-foreground">{featured.category}</p>
                </div>
              </div>
              <div className="mt-6">
                <Button size="lg" className="rounded-full">
                  <Play className="h-4 w-4" /> Resume Watching
                </Button>
              </div>
            </div>
          </button>
        </Card>
      )}

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Browse by Category</h3>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
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
        <Card className="border-border/70 shadow-[var(--shadow-soft)] p-12 text-center">
          <p className="text-sm text-muted-foreground">No training videos found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
      className={cx(
        'shrink-0 inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium border transition-all',
        active
          ? 'bg-foreground text-background border-foreground shadow'
          : 'bg-card text-foreground border-border hover:border-foreground/40 hover:bg-muted',
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
      {typeof count === 'number' && (
        <span
          className={cx(
            'text-[10px] px-1.5 py-0.5 rounded-full',
            active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground',
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
      <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition-all">
        <div className={cx('relative aspect-video bg-gradient-to-br flex items-center justify-center', v.thumbGradient)}>
          {isUsableThumb(v.thumbnail) && (
            <img src={v.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition" />
          <div className="relative h-12 w-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition">
            <Play className="h-5 w-5 ml-0.5 text-foreground fill-foreground" />
          </div>
          <span className="absolute bottom-2 right-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white">
            {v.videoType || v.category}
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary-soft text-accent-foreground flex items-center justify-center text-xs font-semibold">
              {v.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition">
                {v.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {v.videoType || v.category}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-medium">
              {v.category}
            </Badge>
            {v.videoType && (
              <span className="text-[11px] text-muted-foreground">{v.videoType}</span>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}
