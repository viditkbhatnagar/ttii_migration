import { istDayOf, matchesQuery } from '../kit/format.js';

// Centre portal → Training view model (Naji's centre login design, 2026-10-22).
// Real data only: the training_videos library (the same table admin uploads to)
// from GET /centre/training_videos/index. The design's progress, completed,
// views, ratings, durations, notes and chapters have no source and are not shown.

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  videoType: string;
  videoUrl: string;
  thumbnail: string;
  /** IST day it was added (YYYY-MM-DD) when the API sends a timestamp. */
  addedYmd: string;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/** Rich-text (HTML) descriptions as plain text, so raw tags never reach the UI. */
export function plainText(html: string): string {
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

/** Only https (or http) links are ever played or opened. */
export function safeVideoUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : '';
}

export function toTrainingVideos(rows: Record<string, unknown>[]): TrainingVideo[] {
  return rows.map((v, i) => {
    const created = str(v.created_at);
    return {
      id: str(v.id) || `v-${i}`,
      title: str(v.title) || 'Untitled',
      description: plainText(str(v.description)),
      category: str(v.category) || 'General',
      videoType: str(v.video_type),
      videoUrl: safeVideoUrl(str(v.video_url)),
      thumbnail: safeVideoUrl(str(v.thumbnail)),
      addedYmd: istDayOf(created),
    };
  });
}

export function trainingCategories(videos: TrainingVideo[]): { name: string; count: number }[] {
  const seen = new Map<string, number>();
  for (const v of videos) seen.set(v.category, (seen.get(v.category) ?? 0) + 1);
  return [...seen.entries()].map(([name, count]) => ({ name, count }));
}

export function filterVideos(videos: TrainingVideo[], category: string, query: string): TrainingVideo[] {
  return videos.filter((v) => (category === 'all' || v.category === category) && matchesQuery(query, [v.title, v.description, v.category]));
}

/** Other videos of the same category, then the rest, newest first (the list order), up to `limit`. */
export function relatedVideos(videos: TrainingVideo[], current: TrainingVideo, limit = 6): TrainingVideo[] {
  const others = videos.filter((v) => v.id !== current.id);
  return [...others.filter((v) => v.category === current.category), ...others.filter((v) => v.category !== current.category)].slice(0, limit);
}

export type VideoEmbed = { kind: 'file' | 'iframe'; src: string } | null;

/** How the player shows a video link: a direct file, a Vimeo / YouTube embed, or nothing playable inline. */
export function videoEmbed(url: string): VideoEmbed {
  const u = safeVideoUrl(url);
  if (!u) return null;
  if (/\.(mp4|webm|mov)($|\?)/i.test(u)) return { kind: 'file', src: u };
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  const yt = /youtu\.be\/([\w-]+)/.exec(u) || /youtube\.com\/watch\?v=([\w-]+)/.exec(u) || /youtube\.com\/embed\/([\w-]+)/.exec(u);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  return null;
}
