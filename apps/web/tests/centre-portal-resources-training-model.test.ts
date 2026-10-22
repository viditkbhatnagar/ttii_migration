import { describe, expect, it } from 'vitest';
import { fileSize, filterFiles, formatOf, kindOf, safeResourceHref, toResourceListing } from '../src/centre/pages/resources/resources-model';
import { filterVideos, plainText, relatedVideos, toTrainingVideos, trainingCategories, videoEmbed } from '../src/centre/pages/training/training-model';

describe('resources model', () => {
  it('formats sizes and extensions', () => {
    expect(fileSize(0)).toBe('—');
    expect(fileSize(500)).toBe('500 B');
    expect(fileSize(2048)).toBe('2 KB');
    expect(fileSize(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatOf('a/b.Pdf?x=1')).toBe('PDF');
    expect(formatOf('noext')).toBe('');
    expect(kindOf('PNG')).toBe('image');
    expect(kindOf('ZIP')).toBe('archive');
    expect(kindOf('PDF')).toBe('document');
  });
  it('only allows http(s) or site-relative download links', () => {
    expect(safeResourceHref('https://x/y.pdf')).toBe('https://x/y.pdf');
    expect(safeResourceHref('/uploads/a.pdf')).toBe('/uploads/a.pdf');
    expect(safeResourceHref('javascript:alert(1)')).toBe('');
    expect(safeResourceHref('//evil.com/a')).toBe('');
  });
  it('parses a listing and searches files', () => {
    const l = toResourceListing({
      current_folder: { name: 'Brochures' },
      folders: [{ id: 1, name: 'Flyers' }, { id: 2, name: '' }],
      files: [{ id: 7, name: 'Admission Brochure', type: 'pdf', size: 2048, path: 'https://x/a.pdf', created_at: '2026-10-21T20:00:00.000Z' }],
    });
    expect(l.folderName).toBe('Brochures');
    expect(l.folders).toHaveLength(1);
    expect(l.files[0]).toMatchObject({ format: 'PDF', href: 'https://x/a.pdf', addedYmd: '2026-10-22' });
    expect(filterFiles(l.files, 'brochure')).toHaveLength(1);
    expect(filterFiles(l.files, 'zzz')).toHaveLength(0);
  });
});

describe('training model', () => {
  const videos = toTrainingVideos([
    { id: 3, title: 'Admissions 101', description: '<p>How to <b>enrol</b>&nbsp;students</p>', category: 'Admission', video_url: 'https://vimeo.com/123456', created_at: '2026-10-20T00:00:00.000Z' },
    { id: 2, title: 'LMS tour', category: 'LMS', video_url: 'javascript:alert(1)' },
    { id: 1, title: 'Sales tips', category: 'Admission', video_url: 'https://cdn.x/v.mp4' },
  ]);
  it('strips html and drops unsafe links', () => {
    expect(plainText('<p>a&amp;b</p>')).toBe('a&b');
    expect(videos[0]?.description).toBe('How to enrol students');
    expect(videos[1]?.videoUrl).toBe('');
  });
  it('picks the right player', () => {
    expect(videoEmbed('https://vimeo.com/123456')).toEqual({ kind: 'iframe', src: 'https://player.vimeo.com/video/123456' });
    expect(videoEmbed('https://youtu.be/abc_1')).toEqual({ kind: 'iframe', src: 'https://www.youtube.com/embed/abc_1' });
    expect(videoEmbed('https://cdn.x/v.mp4?sig=1')).toEqual({ kind: 'file', src: 'https://cdn.x/v.mp4?sig=1' });
    expect(videoEmbed('https://example.com/page')).toBeNull();
    expect(videoEmbed('javascript:alert(1)')).toBeNull();
  });
  it('groups, filters and relates', () => {
    expect(trainingCategories(videos)).toEqual([{ name: 'Admission', count: 2 }, { name: 'LMS', count: 1 }]);
    expect(filterVideos(videos, 'Admission', 'enrol').map((v) => v.id)).toEqual(['3']);
    expect(filterVideos(videos, 'all', '').length).toBe(3);
    const current = videos[0];
    expect(current && relatedVideos(videos, current).map((v) => v.id)).toEqual(['1', '2']);
  });
});
