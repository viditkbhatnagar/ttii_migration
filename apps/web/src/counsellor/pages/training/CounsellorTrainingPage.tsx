import { useMemo, useState } from 'react';
import { PlayCircle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
}

export default function CounsellorTrainingPage({ api, session }: CounsellorPageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const { data, loading, error } = useAdminPageData(
    () => api.loadTrainingVideos(session.token),
    [api, session.token],
  );

  const videos = useMemo<TrainingVideo[]>(
    () =>
      toRecords(data).map((v) => ({
        id: asString(v.id),
        title: asString(v.title) || 'Untitled',
        description: asString(v.description),
        category: asString(v.category) || 'General',
        videoUrl: asString(v.video_url),
      })),
    [data],
  );

  const categories = useMemo(() => ['all', ...Array.from(new Set(videos.map((v) => v.category)))], [videos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (category !== 'all' && v.category !== category) return false;
      if (q && !v.title.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, search, category]);

  if (loading) {
    return <DashboardLoader label="training" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Training" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Training" />
      <p className="-mt-4 text-sm text-gray-500">Onboarding and product training for counsellors</p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search training…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                (category === c
                  ? 'border-ttii-primary bg-ttii-primary text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-ttii-primary/40')
              }
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-400">No training videos found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
              <button
                type="button"
                onClick={() => v.videoUrl && window.open(v.videoUrl, '_blank', 'noopener,noreferrer')}
                className="group relative flex h-32 w-full items-center justify-center bg-gradient-to-br from-ttii-primary to-[#F06543]"
                aria-label={`Watch ${v.title}`}
              >
                <PlayCircle aria-hidden="true" className="size-12 text-white/90 transition-transform group-hover:scale-110" />
              </button>
              <div className="space-y-2 p-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {v.category}
                </span>
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-800" title={v.title}>
                  {v.title}
                </h3>
                {v.description ? <p className="line-clamp-2 text-xs text-slate-500">{v.description}</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
