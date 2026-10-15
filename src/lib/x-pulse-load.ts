import snapshot from "@/data/x-pulse.json";
import { shapeXPulse, type XPulseView } from "./x-pulse";
import { loadRemoteSnapshot, X_PULSE_SNAPSHOT_URL } from "./snapshot-fetch";

/** Shaped X Pulse view. Uses the published snapshot, then the bundled file. */
export async function loadXPulse(): Promise<XPulseView> {
  const raw = await loadRemoteSnapshot(X_PULSE_SNAPSHOT_URL, snapshot);
  return shapeXPulse(raw);
}
