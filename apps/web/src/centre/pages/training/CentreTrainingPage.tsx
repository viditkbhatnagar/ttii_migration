import { useMemo, useState } from 'react';
import { Play, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { fmtDay } from '../kit/format.js';
import { CentrePageHeader, NoticeCard, PillTabs } from '../kit/page-kit.js';
import { Thumb } from './TrainingThumb.js';
import { filterVideos, toTrainingVideos, trainingCategories, type TrainingVideo } from './training-model.js';

export default function CentreTrainingPage({ api, session, onNavigate }: CentrePageProps) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('all');
  const { data, loading, error } = useAdminPageData(async () => toTrainingVideos(await api.loadTrainingVideos(session.token)), [api, session.token]);

  const videos = useMemo(() => data ?? [], [data]);
  const categories = useMemo(() => trainingCategories(videos), [videos]);
  const filtered = useMemo(() => filterVideos(videos, active, search), [videos, active, search]);
  const featured = videos[0];
  const open = (v: TrainingVideo) => onNavigate(`/centre/training/view/${v.id}`);

  if (loading) return <PageLoader label="Loading training videos..." />;
  if (error) return <div className="space-y-5"><CentrePageHeader title="Training Center" /><NoticeCard tone="error">{error}</NoticeCard></div>;

  return (
    <div className="space-y-6">
      <CentrePageHeader
        title="Training Center"
        subtitle="Training videos from TTII for your centre team"
        actions={
          <div className="relative w-full sm:w-80">
            <label htmlFor="training-search" className="sr-only">Search videos</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="training-search" placeholder="Search videos and topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-full pl-9" />
          </div>
        }
      />

      {featured && (
        <Card className="overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <button type="button" onClick={() => open(featured)} aria-label={`Watch ${featured.title}`} className="group grid w-full text-left md:grid-cols-2">
            <Thumb v={featured} className="h-56 min-h-[240px] md:h-full">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-2xl transition group-hover:scale-110"><Play className="ml-1 h-7 w-7 fill-foreground text-foreground" /></div>
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge className="border-0 bg-white/90 text-foreground hover:bg-white"><Sparkles className="mr-1 h-3 w-3" /> Latest</Badge>
                <Badge className="border-0 bg-black/40 text-white">{featured.category}</Badge>
              </div>
            </Thumb>
            <div className="flex flex-col justify-center p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Newest in the library</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight">{featured.title}</h2>
              {featured.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{featured.description}</p>}
              <div className="mt-6">
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition group-hover:bg-primary/90"><Play className="h-4 w-4" /> Watch Now</span>
              </div>
            </div>
          </button>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Browse by Category</h3>
        <PillTabs label="Training category" value={active} onChange={setActive}
          options={[{ value: 'all', label: 'All', count: videos.length }, ...categories.map((c) => ({ value: c.name, label: c.name, count: c.count }))]} />
      </div>

      {filtered.length === 0 ? (
        <NoticeCard>{videos.length === 0 ? 'No training videos have been published yet.' : 'No training videos found.'}</NoticeCard>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <button key={v.id} type="button" onClick={() => open(v)} aria-label={`Watch ${v.title}`} className="group text-left focus-visible:outline-none">
              <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-elegant)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <Thumb v={v} className="aspect-video">
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition group-hover:opacity-100"><Play className="ml-0.5 h-5 w-5 fill-foreground text-foreground" /></div>
                </Thumb>
                <div className="p-3.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-primary">{v.title}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-medium">{v.category}</Badge>
                    {v.addedYmd && <span className="text-[11px] text-muted-foreground">{fmtDay(v.addedYmd)}</span>}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
