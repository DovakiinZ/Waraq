// The Android app's download source of truth: GitHub Releases.
//
// Every app update ships as a NEW release with the APK attached, and old
// releases are never deleted (see "Android Release Policy" in CLAUDE.md). So
// the site never hard-codes a version or a file URL: it asks the GitHub API
// which releases carry an .apk and treats the newest as current. Publishing a
// release is the only step needed for /download to offer it.
//
// Releases are picked by "has an .apk asset", not by tag pattern or the
// "Latest" marker: tags have not been consistent (`v1.0.3-android`,
// `design/arcade-green-v1`), and the Latest marker could move to a release
// that carries no APK.
//
// Unauthenticated GitHub API calls are limited to 60/hour per visitor IP; the
// 5 minute stale time keeps one visitor well under that. When the API fails,
// callers fall back to RELEASES_LATEST_URL, which GitHub always resolves.
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export const GITHUB_REPO = 'DovakiinZ/Waraq';
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const RELEASES_LATEST_URL = `${RELEASES_URL}/latest`;

export interface AndroidRelease {
  tag: string;
  name: string;
  /** Semver pulled from the APK file name or tag, e.g. "1.1.0". */
  version: string | null;
  publishedAt: string;
  notes: string;
  pageUrl: string;
  apkUrl: string;
  apkName: string;
  apkBytes: number;
  prerelease: boolean;
}

interface GhAsset {
  name: string;
  size: number;
  browser_download_url: string;
}
interface GhRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GhAsset[];
}

const versionOf = (...candidates: string[]) => {
  for (const c of candidates) {
    const m = c.match(/v?(\d+\.\d+\.\d+)/);
    if (m) return m[1];
  }
  return null;
};

async function fetchAndroidReleases(): Promise<AndroidRelease[]> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const releases: GhRelease[] = await res.json();

  return releases
    .filter((r) => !r.draft)
    .map((r) => {
      const apk = r.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
      if (!apk) return null;
      return {
        tag: r.tag_name,
        name: r.name || r.tag_name,
        version: versionOf(apk.name, r.tag_name, r.name ?? ''),
        publishedAt: r.published_at,
        notes: (r.body ?? '').trim(),
        pageUrl: r.html_url,
        apkUrl: apk.browser_download_url,
        apkName: apk.name,
        apkBytes: apk.size,
        prerelease: r.prerelease,
      } satisfies AndroidRelease;
    })
    .filter((r): r is AndroidRelease => r !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * `latest` is the newest non-prerelease build with an APK; `all` keeps every
 * APK release, newest first, for the older-versions list.
 */
export function useAndroidRelease() {
  const query = useQuery({
    queryKey: queryKeys.app.androidReleases,
    queryFn: fetchAndroidReleases,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const all = query.data ?? [];
  const latest = all.find((r) => !r.prerelease) ?? all[0] ?? null;
  return { ...query, all, latest };
}

export const formatBytes = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} MB`;
