import Link from "next/link";
import { getCatalogData, computeWorkspaceStats, getSecurityData } from "@/lib/catalog";
import { getCriticalWatchList } from "@/lib/updates-checker";
import CriticalWatchCard from "@/components/CriticalWatchCard";
import {
  FolderGit2,
  Package,
  AlertTriangle,
  GitCommit,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Sliders,
} from "lucide-react";

export const revalidate = 0;

export default async function DashboardPage() {
  const catalog = await getCatalogData();
  const stats = await computeWorkspaceStats(catalog);
  const criticalWatch = await getCriticalWatchList(catalog);
  const security = await getSecurityData();
  const vulnCount = security.summary.total_vulnerabilities;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-2xl p-6 sm:p-7 border border-[#504945] bg-[#32302f] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#3c3836] border border-[#504945] text-[#fe8019] text-xs font-mono font-medium">
              <span>● Workspace Dependency Radar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#fbf1c7] tracking-tight">
              Ecosystem Health & Package Radar
            </h1>
            <p className="text-xs sm:text-sm text-[#a89984] max-w-2xl leading-relaxed">
              Monitoring <strong className="text-[#ebdbb2] font-semibold">{stats.total_projects} projects</strong> and{" "}
              <strong className="text-[#ebdbb2] font-semibold">{stats.total_packages} unique packages</strong> across all indexed workspace directories.
            </p>
          </div>

          {/* Health Score Pill */}
          <div className="flex items-center space-x-4 bg-[#282828] p-4 rounded-xl border border-[#504945] shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#3c3836]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={stats.health_score > 80 ? "text-[#b8bb26]" : stats.health_score > 60 ? "text-[#fabd2f]" : "text-[#fb4934]"}
                  strokeDasharray={`${stats.health_score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-bold text-lg text-[#fbf1c7] font-mono">
                {stats.health_score}%
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#a89984] block font-mono">WORKSPACE HEALTH</span>
              <span className="text-sm font-bold text-[#ebdbb2]">
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
            <h2 className="text-lg font-bold text-[#fbf1c7] tracking-tight flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-[#fabd2f]" />
              <span>Tracked Package Radar</span>
            </h2>
            <p className="text-xs text-[#a89984]">
              Actively inspected core frameworks and dependencies to prevent compatibility faults
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center space-x-1.5 text-xs text-[#ebdbb2] hover:text-[#fbf1c7] font-medium px-3 py-1.5 rounded-lg bg-[#3c3836] border border-[#504945] hover:border-[#665c54] hover:bg-[#504945] transition w-fit"
          >
            <Sliders className="w-3.5 h-3.5 text-[#fe8019]" />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Link
          href="/projects"
          className="bg-[#32302f] border border-[#504945] hover:border-[#665c54] rounded-xl p-5 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#a89984]">Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-[#83a598] group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fbf1c7] font-mono">{stats.total_projects}</div>
          <span className="text-[11px] text-[#928374] mt-1 block">Indexed & tracked</span>
        </Link>

        <Link
          href="/projects?status=drifted"
          className="bg-[#32302f] border border-[#504945] hover:border-[#665c54] rounded-xl p-5 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#a89984]">Commit Pin Drifts</span>
            <GitCommit className="w-4 h-4 text-[#fabd2f] group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fabd2f] font-mono">
            {stats.drifted_projects}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">PKGBUILD != HEAD</span>
        </Link>

        <Link
          href="/dependencies"
          className="bg-[#32302f] border border-[#504945] hover:border-[#665c54] rounded-xl p-5 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#a89984]">Unique Packages</span>
            <Package className="w-4 h-4 text-[#d3869b] group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fbf1c7] font-mono">{stats.total_packages}</div>
          <span className="text-[11px] text-[#928374] mt-1 block">Indexed packages</span>
        </Link>

        <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#a89984]">Missing Packages</span>
            <AlertTriangle className="w-4 h-4 text-[#fb4934]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fb4934] font-mono">
            {stats.missing_packages}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">Uninstalled dependencies</span>
        </div>

        <Link
          href="/security"
          className="bg-[#32302f] border border-[#504945] hover:border-[#665c54] rounded-xl p-5 transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#a89984]">Security Advisories</span>
            {vulnCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-[#fb4934] group-hover:translate-x-0.5 transition" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#b8bb26] group-hover:translate-x-0.5 transition" />
            )}
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${vulnCount > 0 ? "text-[#fb4934]" : "text-[#b8bb26]"}`}>
            {vulnCount}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">
            {vulnCount > 0 ? "Advisories flagged" : "0 reported CVEs"}
          </span>
        </Link>
      </div>

      {/* Ecosystem Distribution Bar */}
      <div className="bg-[#32302f] border border-[#504945] rounded-xl p-6">
        <h3 className="text-sm font-bold text-[#fbf1c7] mb-3 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#83a598]" />
          <span>Ecosystem Distribution</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(stats.ecosystem_counts).map(([eco, count]) => (
            <Link
              key={eco}
              href={`/projects?ecosystem=${eco}`}
              className="p-3 rounded-lg bg-[#282828] border border-[#3c3836] hover:border-[#504945] hover:bg-[#3c3836]/40 transition block"
            >
              <span className="text-[11px] uppercase font-mono font-semibold text-[#fe8019] block">{eco}</span>
              <span className="text-lg font-bold text-[#fbf1c7] font-mono">{count}</span>
              <span className="text-[10px] text-[#928374] block">projects</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
