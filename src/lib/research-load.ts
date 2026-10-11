import snapshot from "@/data/research.json";
import { shapeResearch, type ResearchView } from "./research";

/** Server-side view of the single static research export. No network fetch. */
export function loadResearch(): ResearchView {
  return shapeResearch(snapshot);
}
