"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import { GitBranch, GitCommit, Check, AlertCircle, RefreshCw, Box, ExternalLink } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onSyncComplete?: () => void;
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
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "rust":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "node":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "cpp":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "go":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "python":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-800 text-gray-300 border-gray-700";
    }
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 hover:border-gray-700 transition flex flex-col justify-between backdrop-blur-sm">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base tracking-tight">{project.name}</h3>
              <span
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md border ${getEcoColor(
                  project.ecosystem
                )}`}
              >
                {project.ecosystem}
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-500 mt-1 truncate max-w-xs">
              {project.path}
            </p>
          </div>

          {/* Drift Status Badge */}
          <div>
            {project.is_drifted ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>Drifted</span>
              </span>
            ) : !project.is_pinned && project.pkgbuild_path ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span>Unpinned</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Check className="w-3 h-3" />
                <span>Synced</span>
              </span>
            )}
          </div>
        </div>

        {/* Plugin Metadata if applicable */}
        {project.manifest_id && (
          <div className="mt-3 p-2 rounded-xl bg-gray-950/40 border border-gray-800/40 text-xs">
            <div className="flex justify-between text-gray-400 text-[11px]">
              <span>Quattro Plugin:</span>
              <span className="font-mono text-blue-400">{project.manifest_id}</span>
            </div>
            {project.manifest_version && (
              <div className="flex justify-between text-gray-400 text-[11px] mt-1">
                <span>Version:</span>
                <span className="text-gray-200">{project.manifest_version}</span>
              </div>
            )}
          </div>
        )}

        {/* Git & Packaging State */}
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="flex items-center space-x-1 text-[11px]">
              <GitBranch className="w-3.5 h-3.5" />
              <span>HEAD</span>
            </span>
            <span className="font-mono text-[11px] text-gray-200">
              {project.git_head ? project.git_head.slice(0, 8) : "None"}
            </span>
          </div>

          {project.pkgbuild_path && (
            <div className="flex items-center justify-between text-gray-400">
              <span className="flex items-center space-x-1 text-[11px]">
                <GitCommit className="w-3.5 h-3.5" />
                <span>PKGBUILD Pin</span>
              </span>
              <span
                className={`font-mono text-[11px] ${
                  project.is_drifted ? "text-red-400 font-semibold" : "text-gray-200"
                }`}
              >
                {project.commit_pin ? project.commit_pin.slice(0, 8) : "Not pinned"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center space-x-1">
          <Box className="w-3.5 h-3.5 text-gray-500" />
          <span>{project.depends.length + project.makedepends.length} deps</span>
        </span>

        {project.is_drifted && isLocal && (
          <button
            onClick={handleSync}
            disabled={syncing || syncDone}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm shadow-blue-500/20 disabled:opacity-50"
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
