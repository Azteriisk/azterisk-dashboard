"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import { GitBranch, GitCommit, Check, AlertCircle, RefreshCw, Box, Clock } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onSyncComplete?: () => void;
}

function formatCommitTime(timestamp?: number | null, dateStr?: string | null): string {
  if (!timestamp && !dateStr) return "";
  const time = timestamp ? timestamp * 1000 : new Date(dateStr!).getTime();
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 86400 * 365) return `${Math.floor(diffSec / (86400 * 30))}mo ago`;
  return `${Math.floor(diffSec / (86400 * 365))}y ago`;
}

export default function ProjectCard({ project, onSyncComplete }: ProjectCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local");
      setIsLocal(isLocalHost);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: project.name }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncDone(true);
        if (onSyncComplete) onSyncComplete();
      } else {
        alert(data.error || "Sync failed");
      }
    } catch {
      alert("Failed to sync project");
    } finally {
      setSyncing(false);
    }
  };

  const getEcoColor = (eco: string) => {
    switch (eco.toLowerCase()) {
      case "arch":
        return "bg-[#83a598]/15 text-[#83a598] border-[#83a598]/30";
      case "rust":
        return "bg-[#fe8019]/15 text-[#fe8019] border-[#fe8019]/30";
      case "node":
        return "bg-[#b8bb26]/15 text-[#b8bb26] border-[#b8bb26]/30";
      case "web":
        return "bg-[#8ec07c]/15 text-[#8ec07c] border-[#8ec07c]/30";
      case "cpp":
        return "bg-[#d3869b]/15 text-[#d3869b] border-[#d3869b]/30";
      case "go":
        return "bg-[#83a598]/15 text-[#83a598] border-[#83a598]/30";
      case "python":
        return "bg-[#fabd2f]/15 text-[#fabd2f] border-[#fabd2f]/30";
      case "dotnet":
        return "bg-[#d3869b]/15 text-[#d3869b] border-[#d3869b]/30";
      case "kotlin":
        return "bg-[#fe8019]/15 text-[#fe8019] border-[#fe8019]/30";
      case "lua":
        return "bg-[#83a598]/15 text-[#83a598] border-[#83a598]/30";
      case "odin":
        return "bg-[#8ec07c]/15 text-[#8ec07c] border-[#8ec07c]/30";
      case "unreal":
        return "bg-[#d5c4a1]/15 text-[#d5c4a1] border-[#d5c4a1]/30";
      case "docs":
        return "bg-[#a89984]/15 text-[#a89984] border-[#a89984]/30";
      default:
        return "bg-[#3c3836] text-[#ebdbb2] border-[#504945]";
    }
  };

  return (
    <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5 hover:border-[#665c54] transition flex flex-col justify-between overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3
                className="font-bold text-[#fbf1c7] text-base tracking-tight break-words min-w-0"
                title={project.name}
              >
                {project.name}
              </h3>
              <span
                className={`text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${getEcoColor(
                  project.ecosystem
                )}`}
              >
                {project.ecosystem}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#a89984] mt-1 truncate" title={project.path}>
              {project.path}
            </p>
          </div>

          {/* Drift Status Badge */}
          <div className="shrink-0 pt-0.5">
            {project.is_drifted ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30 whitespace-nowrap">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Drifted</span>
              </span>
            ) : !project.is_pinned && project.pkgbuild_path ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#fabd2f]/15 text-[#fabd2f] border border-[#fabd2f]/30 whitespace-nowrap">
                <span>Unpinned</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30 whitespace-nowrap">
                <Check className="w-3 h-3 shrink-0" />
                <span>Synced</span>
              </span>
            )}
          </div>
        </div>

        {/* Plugin Metadata if applicable */}
        {project.manifest_id && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#282828] border border-[#3c3836] text-xs">
            <div className="flex items-center justify-between text-[#a89984] text-[11px] gap-2">
              <span className="shrink-0">Quattro Plugin:</span>
              <span
                className="font-mono text-[#83a598] truncate text-right"
                title={project.manifest_id}
              >
                {project.manifest_id}
              </span>
            </div>
            {project.manifest_version && (
              <div className="flex items-center justify-between text-[#a89984] text-[11px] mt-1 gap-2">
                <span className="shrink-0">Version:</span>
                <span className="text-[#ebdbb2] font-mono text-right">{project.manifest_version}</span>
              </div>
            )}
          </div>
        )}

        {/* Git & Packaging State */}
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[#a89984]">
            <span className="flex items-center space-x-1 text-[11px]">
              <GitBranch className="w-3.5 h-3.5 text-[#928374]" />
              <span>HEAD</span>
            </span>
            <span className="font-mono text-[11px] text-[#ebdbb2]">
              {project.git_head ? project.git_head.slice(0, 8) : "None"}
            </span>
          </div>

          {project.pkgbuild_path && (
            <div className="flex items-center justify-between text-[#a89984]">
              <span className="flex items-center space-x-1 text-[11px]">
                <GitCommit className="w-3.5 h-3.5 text-[#928374]" />
                <span>PKGBUILD Pin</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  project.is_drifted ? "text-[#fb4934] font-semibold" : "text-[#ebdbb2]"
                }`}
              >
                {project.commit_pin ? project.commit_pin.slice(0, 8) : "Not pinned"}
              </span>
            </div>
          )}

          {project.git_commit_timestamp ? (
            <div className="flex items-center justify-between text-[#a89984]">
              <span className="flex items-center space-x-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#928374]" />
                <span>Last Commit</span>
              </span>
              <span
                className="font-mono text-[11px] text-[#fabd2f] truncate max-w-[170px] text-right"
                title={project.git_commit_message || project.git_commit_date || undefined}
              >
                {formatCommitTime(project.git_commit_timestamp, project.git_commit_date)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-[#3c3836] flex items-center justify-between">
        <span className="text-xs text-[#a89984] flex items-center space-x-1 font-mono">
          <Box className="w-3.5 h-3.5 text-[#928374]" />
          <span>{project.depends.length + project.makedepends.length} deps</span>
        </span>

        {project.is_drifted && isLocal && (
          <button
            onClick={handleSync}
            disabled={syncing || syncDone}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#d65d0e] hover:bg-[#fe8019] text-[#fbf1c7] text-xs font-medium transition disabled:opacity-50 cursor-pointer"
          >
            {syncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : syncDone ? (
              <Check className="w-3 h-3" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            <span>{syncDone ? "Synced!" : syncing ? "Pinning..." : "Sync to HEAD"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
