/**
 * Published snapshots on the `x-pulse-data` branch.
 * A daily refresh commits JSON there. The site revalidates; it does not redeploy.
 * No token is sent. If the request fails, callers keep the bundled file.
 */

export const X_PULSE_SNAPSHOT_URL =
  "https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/x-pulse.json";

export const RESEARCH_SNAPSHOT_URL =
  "https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/research.json";

/** About 15 minutes. */
export const SNAPSHOT_REVALIDATE_SECONDS = 900;

export type SnapshotFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export async function loadRemoteSnapshot(
  url: string,
  fallback: unknown,
  fetchImpl: SnapshotFetch = fetch,
): Promise<unknown> {
  try {
    const response = await fetchImpl(url, {
      next: { revalidate: SNAPSHOT_REVALIDATE_SECONDS },
    } as RequestInit);
    if (!response.ok) return fallback;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return fallback;
    return body;
  } catch {
    return fallback;
  }
}
