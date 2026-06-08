// Converts a "watch page" video URL into an embeddable player URL for <iframe>.
//
//   Vimeo:         https://vimeo.com/{id}            -> https://player.vimeo.com/video/{id}
//   YouTube watch: https://youtube.com/watch?v={id} -> https://www.youtube.com/embed/{id}
//   YouTube short: https://youtu.be/{id}            -> https://www.youtube.com/embed/{id}
//
// URLs already pointing at an embed path — and direct media URLs such as the
// signed MP4s served from DigitalOcean Spaces — are returned unchanged.
export function toEmbeddableVideoUrl(url: string): string {
  if (!url) return '';
  if (
    url.includes('player.vimeo.com') ||
    url.includes('youtube.com/embed') ||
    url.includes('youtube-nocookie.com/embed')
  ) {
    return url;
  }

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  const ytWatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;

  return url;
}
