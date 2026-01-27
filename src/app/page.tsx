import { Dashboard } from "@/components/Dashboard";
import { SUBNET_NAME, SUBNET_ID } from "@/lib/config";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {SUBNET_NAME} Dashboard
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Bittensor Subnet {SUBNET_ID} - Financial Overview
              </p>
            </div>
            <a
              href="https://taostats.io/subnets/37"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Taostats
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            {SUBNET_NAME} Subnet {SUBNET_ID} - CFO Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}
