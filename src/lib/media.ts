import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True when a file referenced from content data exists in /public (checked at build time). */
export function inPublic(path: string | null | undefined): path is string {
  return Boolean(path) && existsSync(join(process.cwd(), 'public', path!));
}

/** Use a video only when all of its files are present; otherwise the card falls back to its placeholder. */
export function usableVideo<T extends { webm: string; mp4: string; poster: string } | null>(video: T): T | null {
  return video && inPublic(video.webm) && inPublic(video.mp4) && inPublic(video.poster) ? video : null;
}
