import Link from "next/link";
import { getCatalogData, computeWorkspaceStats } from "@/lib/catalog";
import { getCriticalWatchList } from "@/lib/updates-checker";
import CriticalWatchCard from "@/components/CriticalWatchCard";
import {
  FolderGit2,
  Package,
  AlertTriangle,
  GitCommit,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Sliders,
} from "lucide-react";

export const revalidate = 0;

export default async function DashboardPage() {
  const catalog = await getCatalogData();
  const stats = await computeWorkspaceStats(catalog);
  const criticalWatch = await getCriticalWatchList(catalog);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden p-8 border border-gray-800 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-blue-950/30 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Dependency Intelligence</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Ecosystem Health & Dependency Radar
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl">
              Real-time monitoring across <strong className="text-gray-200">{stats.total_projects} projects</strong> and{" "}
              <strong className="text-gray-200">{stats.total_packages} tracked packages</strong> in your workspace.
            </p>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center space-x-4 bg-gray-950/60 p-4 rounded-2xl border border-gray-800/80">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={stats.health_score > 80 ? "text-emerald-500" : stats.health_score > 60 ? "text-amber-500" : "text-red-500"}
                  strokeDasharray={`${stats.health_score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-bold text-lg text-white font-mono">
                {stats.health_score}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-medium">Workspace Health</span>
              <span className="text-sm font-bold text-white">
                {stats.health_score > 80 ? "Healthy" : stats.health_score > 60 ? "Needs Review" : "Attention"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Dependency Radar */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              <span>Tracked Package Radar</span>
            </h2>
            <p className="text-xs text-gray-400">
              Actively inspected core frameworks and dependencies to prevent compatibility faults
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center space-x-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition w-fit"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit Tracked Packages</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalWatch.map((watch) => (
            <CriticalWatchCard key={watch.name} watch={watch} />
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/projects"
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{stats.total_projects}</div>
          <span className="text-[11px] text-gray-500 mt-1 block">Indexed & tracked</span>
        </Link>

        <Link
          href="/projects?status=drifted"
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Commit Pin Drifts</span>
            <GitCommit className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
            {stats.drifted_projects}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">PKGBUILD != HEAD</span>
        </Link>

        <Link
          href="/dependencies"
          className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Unique Packages</span>
            <Package className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{stats.total_packages}</div>
          <span className="text-[11px] text-gray-500 mt-1 block">Across 6 ecosystems</span>
        </Link>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Missing Packages</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400 font-mono">
            {stats.missing_packages}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Uninstalled dependencies</span>
        </div>
      </div>

      {/* Ecosystem Distribution Bar */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Ecosystem Distribution</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(stats.ecosystem_counts).map(([eco, count]) => (
            <Link
              key={eco}
              href={`/projects?ecosystem=${eco}`}
              className="p-3 rounded-xl bg-gray-950/40 border border-gray-800/60 hover:border-gray-700 transition block"
            >
              <span className="text-[11px] uppercase font-semibold text-gray-400 block">{eco}</span>
              <span className="text-lg font-bold text-white font-mono">{count}</span>
              <span className="text-[10px] text-gray-500 block">projects</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
