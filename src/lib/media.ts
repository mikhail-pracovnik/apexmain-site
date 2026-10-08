import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True when a file referenced from content data exists in /public (checked at build time). */
export function inPublic(path: string | null | undefined): path is string {
  return Boolean(path) && existsSync(join(process.cwd(), 'public', path!));
}
