import type { Metadata } from "next";
import Link from "next/link";
import { XPulse } from "@/components/XPulse";
import { loadXPulse } from "@/lib/x-pulse-load";

export const metadata: Metadata = {
  title: "X Pulse | Aurelius",
  description:
    "Public X pulse for alignment and mechanistic interpretability. A static snapshot, with no live fetch.",
};

export default function XPulsePage() {
  const view = loadXPulse();

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#f4f1ea]">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#e4b15a]">
            Aurelius
          </p>
          <Link
            href="/"
            className="text-sm text-zinc-300 underline underline-offset-4 decoration-white/20 hover:decoration-[#e4b15a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]"
          >
            Financial dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <XPulse view={view} variant="standalone" />
      </main>
    </div>
  );
}
