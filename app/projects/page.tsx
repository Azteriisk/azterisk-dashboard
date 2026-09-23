"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import ProjectCard from "@/components/ProjectCard";
import { Search, Filter, RefreshCw, CheckCircle2, GitCommit } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedEco, setSelectedEco] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncAllMsg, setSyncAllMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const ecosystems = ["all", "arch", "node", "rust", "cpp", "go", "python"];
  const statuses = ["all", "drifted", "unpinned", "synced"];

  const filtered = projects.filter((p) => {
    const matchesEco = selectedEco === "all" || p.ecosystem.toLowerCase() === selectedEco.toLowerCase();
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "drifted" && p.is_drifted) ||
      (selectedStatus === "unpinned" && !p.is_pinned && p.pkgbuild_path) ||
      (selectedStatus === "synced" && !p.is_drifted && (p.is_pinned || !p.pkgbuild_path));
    const matchesQuery =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.path.toLowerCase().includes(query.toLowerCase()) ||
      (p.manifest_id && p.manifest_id.toLowerCase().includes(query.toLowerCase()));

    return matchesEco && matchesStatus && matchesQuery;
  });

  const driftedCount = projects.filter((p) => p.is_drifted).length;

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncAllMsg(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncAllMsg("All drifted PKGBUILDs pinned to Git HEAD!");
        await fetchProjects();
      } else {
        setSyncAllMsg(data.error || "Sync failed");
      }
    } catch {
      setSyncAllMsg("Network error");
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Explorer</h1>
          <p className="text-xs text-gray-400">
            Tracked repositories, packaging pins, and commit states across all indexed folders
          </p>
        </div>

        {driftedCount > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
          >
            <GitCommit className={`w-4 h-4 ${syncingAll ? "animate-spin" : ""}`} />
            <span>{syncingAll ? "Syncing..." : `Sync All (${driftedCount} drifted)`}</span>
          </button>
        )}
      </div>

      {syncAllMsg && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncAllMsg}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or path..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
          />
        </div>

        {/* Ecosystem Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {ecosystems.map((eco) => (
            <button
              key={eco}
              onClick={() => setSelectedEco(eco)}
              className={`px-3 py-1 rounded-lg text-xs font-medium uppercase transition ${
                selectedEco === eco
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-gray-950/40 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {eco}
            </button>
          ))}
        </div>

        {/* Status Dropdown / Pills */}
        <div className="flex items-center space-x-1">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs capitalize transition ${
                selectedStatus === st
                  ? "bg-gray-800 text-white border border-gray-700 font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-xs">Loading workspace projects...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-gray-900/30 rounded-2xl border border-gray-800/40">
          No projects match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <ProjectCard
              key={proj.name}
              project={proj}
              onSyncComplete={fetchProjects}
            />
          ))}
        </div>
      )}
    </div>
  );
}
