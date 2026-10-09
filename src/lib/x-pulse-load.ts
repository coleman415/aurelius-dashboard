import snapshot from "@/data/x-pulse.json";
import { shapeXPulse, type XPulseView } from "./x-pulse";

/** Server-side view of the single static snapshot. No network fetch. */
export function loadXPulse(): XPulseView {
  return shapeXPulse(snapshot);
}
