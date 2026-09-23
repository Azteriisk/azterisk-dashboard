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
      className={`rounded-xl p-5 border transition-colors ${
        isUpdateAvailable
          ? "bg-[#32302f] border-[#fabd2f]/50 hover:border-[#fabd2f]"
          : isUpToDate
          ? "bg-[#32302f] border-[#504945] hover:border-[#665c54]"
          : "bg-[#32302f] border-[#fb4934]/50 hover:border-[#fb4934]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
              isUpdateAvailable
                ? "bg-[#fabd2f]/15 text-[#fabd2f] border-[#fabd2f]/30"
                : isUpToDate
                ? "bg-[#b8bb26]/15 text-[#b8bb26] border-[#b8bb26]/30"
                : "bg-[#fb4934]/15 text-[#fb4934] border-[#fb4934]/30"
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
              <h3 className="font-bold text-[#fbf1c7] text-base tracking-tight">{watch.name}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#282828] text-[#d5c4a1] border border-[#3c3836] font-mono">
                {watch.installed_version}
              </span>
            </div>
            <p className="text-xs text-[#a89984] mt-0.5 line-clamp-1">{watch.description}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isUpToDate ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compatible</span>
            </span>
          ) : isUpdateAvailable ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#fabd2f]/15 text-[#fabd2f] border border-[#fabd2f]/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Update Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Attention</span>
            </span>
          )}
        </div>
      </div>

      {/* Version Comparison Bar */}
      <div className="mt-4 pt-3 border-t border-[#3c3836] grid grid-cols-3 gap-2 text-xs">
        <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
          <span className="text-[#a89984] block text-[11px] font-mono">INSTALLED</span>
          <span className="font-mono font-semibold text-[#ebdbb2]">{watch.installed_version}</span>
        </div>
        <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
          <span className="text-[#a89984] block text-[11px] font-mono">UPSTREAM</span>
          <span
            className={`font-mono font-semibold ${
              isUpdateAvailable ? "text-[#fabd2f]" : "text-[#ebdbb2]"
            }`}
          >
            {watch.upstream_version}
          </span>
        </div>
        <div className="bg-[#282828] p-2.5 rounded-lg border border-[#3c3836]">
          <span className="text-[#a89984] block text-[11px] flex items-center space-x-1 font-mono">
            <Clock className="w-3 h-3" />
            <span>AGE</span>
          </span>
          <span className="font-medium text-[#d5c4a1]">
            {watch.age_days > 0 ? `${watch.age_days}d ago` : "Recent"}
          </span>
        </div>
      </div>

      {/* Dependents footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#a89984]">
        <span className="flex items-center space-x-1.5">
          <Box className="w-3.5 h-3.5 text-[#83a598]" />
          <span>
            Required by <strong className="text-[#ebdbb2]">{watch.dependents_count}</strong>{" "}
            workspace project(s)
          </span>
        </span>
        {isUpdateAvailable && (
          <span className="text-[#fabd2f] font-mono text-[10px]">Test plugins before updating</span>
        )}
      </div>
    </div>
  );
}
