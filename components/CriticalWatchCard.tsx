"use client";

import { CriticalWatch } from "@/lib/types";
import { ShieldAlert, ShieldCheck, ArrowUpCircle, AlertTriangle, Clock, Box } from "lucide-react";

interface CriticalWatchCardProps {
  watch: CriticalWatch;
}

export default function CriticalWatchCard({ watch }: CriticalWatchCardProps) {
  const isUpToDate = watch.status === "up_to_date";
  const isUpdateAvailable = watch.status === "update_available";

  return (
    <div
      className={`rounded-2xl p-5 border transition-all relative overflow-hidden backdrop-blur-sm ${
        isUpdateAvailable
          ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
          : isUpToDate
          ? "bg-gray-900/60 border-gray-800 hover:border-gray-700"
          : "bg-red-500/5 border-red-500/30 hover:border-red-500/50"
      }`}
    >
      {/* Background glow */}
      {isUpdateAvailable && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -z-10 rounded-full" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUpdateAvailable
                ? "bg-amber-500/20 text-amber-400"
                : isUpToDate
                ? "bg-blue-500/10 text-blue-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {isUpdateAvailable ? (
              <ArrowUpCircle className="w-5 h-5" />
            ) : isUpToDate ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base tracking-tight">{watch.name}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono">
                {watch.installed_version}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{watch.description}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isUpToDate ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compatible</span>
            </span>
          ) : isUpdateAvailable ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Update Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Attention</span>
            </span>
          )}
        </div>
      </div>

      {/* Version Comparison Bar */}
      <div className="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-950/40 p-2.5 rounded-xl border border-gray-800/40">
          <span className="text-gray-400 block text-[11px]">Installed</span>
          <span className="font-mono font-semibold text-gray-200">{watch.installed_version}</span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-xl border border-gray-800/40">
          <span className="text-gray-400 block text-[11px]">Upstream</span>
          <span
            className={`font-mono font-semibold ${
              isUpdateAvailable ? "text-amber-400" : "text-gray-200"
            }`}
          >
            {watch.upstream_version}
          </span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-xl border border-gray-800/40">
          <span className="text-gray-400 block text-[11px] flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Age</span>
          </span>
          <span className="font-medium text-gray-300">
            {watch.age_days > 0 ? `${watch.age_days}d ago` : "Recent"}
          </span>
        </div>
      </div>

      {/* Dependents footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center space-x-1.5">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span>
            Required by <strong className="text-gray-200">{watch.dependents_count}</strong>{" "}
            workspace project(s)
          </span>
        </span>
        {isUpdateAvailable && (
          <span className="text-amber-400 font-medium">Test plugins before updating</span>
        )}
      </div>
    </div>
  );
}
