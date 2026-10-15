import snapshot from "@/data/research.json";
import { shapeResearch, type ResearchView } from "./research";
import { loadRemoteSnapshot, RESEARCH_SNAPSHOT_URL } from "./snapshot-fetch";

/**
 * Shaped research view. The full export stays on the server.
 * Uses the published snapshot, then the bundled file.
 */
export async function loadResearch(): Promise<ResearchView> {
  const raw = await loadRemoteSnapshot(RESEARCH_SNAPSHOT_URL, snapshot);
  return shapeResearch(raw);
}
