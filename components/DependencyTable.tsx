"use client";

import { useState, useEffect } from "react";
import { Package } from "@/lib/types";
import {
  Search,
  Box,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Globe,
  HardDrive,
  Layers,
  Sparkles,
} from "lucide-react";

interface DependencyTableProps {
  packages: Package[];
  initialStatus?: string;
  onRefresh?: () => void;
}

export default function DependencyTable({
  packages,
  initialStatus = "all",
  onRefresh,
}: DependencyTableProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "missing" | "installed" | "shared">(
    initialStatus === "missing" || initialStatus === "shared" || initialStatus === "installed"
      ? (initialStatus as "all" | "missing" | "installed" | "shared")
      : "all"
  );
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const [installingPkg, setInstallingPkg] = useState<string | null>(null);
  const [installingGlobalPkg, setInstallingGlobalPkg] = useState<string | null>(null);
  const [installingAll, setInstallingAll] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (
      initialStatus === "missing" ||
      initialStatus === "installed" ||
      initialStatus === "shared" ||
      initialStatus === "all"
    ) {
      setSelectedStatus(initialStatus as "all" | "missing" | "installed" | "shared");
    }
  }, [initialStatus]);

  const types = ["all", "pacman", "aur", "npm", "cargo", "pip", "go", "inter-project"];

  const missingPackages = packages.filter((p) => !p.installed);
  const installedPackages = packages.filter((p) => p.installed);
  const sharedPackages = packages.filter((p) => p.required_by && p.required_by.length >= 2);

  const filtered = packages.filter((pkg) => {
    const matchesType =
      selectedType === "all" || pkg.pkg_type.toLowerCase() === selectedType.toLowerCase();
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "missing" && !pkg.installed) ||
      (selectedStatus === "installed" && pkg.installed) ||
      (selectedStatus === "shared" && pkg.required_by && pkg.required_by.length >= 2);
    const matchesQuery =
      pkg.name.toLowerCase().includes(query.toLowerCase()) ||
      pkg.required_by.some((req) => req.toLowerCase().includes(query.toLowerCase()));
    return matchesType && matchesStatus && matchesQuery;
  });

  if (selectedStatus === "shared") {
    filtered.sort((a, b) => (b.required_by?.length || 0) - (a.required_by?.length || 0));
  }

  const handleCopy = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleInstall = async (pkgNames: string[]) => {
    const isBatch = pkgNames.length > 1;
    if (isBatch) {
      setInstallingAll(true);
    } else {
      setInstallingPkg(pkgNames[0]);
    }
    setFeedback(null);

    try {
      const res = await fetch("/api/dependencies/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: pkgNames }),
      });
      const data = await res.json();

      if (data.success) {
        setFeedback({ type: "success", text: data.message || "Installed successfully!" });
        if (onRefresh) onRefresh();
      } else if (data.requires_sudo) {
        handleCopy(data.command || `yay -S --needed ${pkgNames.join(" ")}`, "banner");
        setFeedback({
          type: "warn",
          text: "Root authorization required — command copied to clipboard for your terminal!",
        });
      } else {
        setFeedback({ type: "error", text: data.message || "Installation failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Network request failed." });
    } finally {
      setInstallingPkg(null);
      setInstallingAll(false);
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 6000);
    }
  };

  const handleGlobalInstall = async (pkg: Package) => {
    setInstallingGlobalPkg(pkg.name);
    setFeedback(null);
    try {
      const res = await fetch("/api/dependencies/install-global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_name: pkg.name, ecosystem: pkg.pkg_type }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", text: data.message || `Installed ${pkg.name} globally!` });
        if (onRefresh) onRefresh();
      } else {
        if (data.command) handleCopy(data.command, pkg.name);
        setFeedback({ type: "warn", text: data.message || "Manual install required — command copied!" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Global install failed." });
    } finally {
      setInstallingGlobalPkg(null);
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 6000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Missing Dependencies Action Banner */}
      {missingPackages.length > 0 && (
        <div className="bg-[#32302f] border border-[#fb4934]/40 rounded-xl p-4 sm:p-5 bg-gradient-to-r from-[#fb4934]/10 via-[#32302f] to-[#32302f] shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-[#fb4934]/20 border border-[#fb4934]/40 flex items-center justify-center shrink-0 text-[#fb4934] mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-[#fbf1c7] text-sm">
                    {missingPackages.length} Missing System {missingPackages.length === 1 ? "Dependency" : "Dependencies"} Detected
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#fb4934]/20 text-[#fb4934] border border-[#fb4934]/30 font-semibold">
                    ACTION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-[#a89984] mt-1">
                  Required by:{" "}
                  {missingPackages.map((p) => (
                    <span key={p.name} className="text-[#ebdbb2] font-mono mr-2">
                      <strong className="text-[#fabd2f]">{p.name}</strong> ({p.required_by.join(", ")})
                    </span>
                  ))}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-[#1d2021] border border-[#504945] rounded-lg px-3 py-1.5 font-mono text-xs text-[#b8bb26] flex items-center space-x-2">
                <span>yay -S --needed {missingPackages.map((p) => p.name).join(" ")}</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `yay -S --needed ${missingPackages.map((p) => p.name).join(" ")}`,
                      "banner"
                    )
                  }
                  className="text-[#a89984] hover:text-[#fbf1c7] cursor-pointer ml-1 p-0.5 rounded hover:bg-[#282828] transition"
                  title="Copy command to clipboard"
                >
                  {copiedCmd === "banner" ? (
                    <Check className="w-3.5 h-3.5 text-[#b8bb26]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <button
                onClick={() => handleInstall(missingPackages.map((p) => p.name))}
                disabled={installingAll}
                className="px-3.5 py-1.5 rounded-lg bg-[#fb4934] hover:bg-[#fb4934]/90 text-[#1d2021] font-mono font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {installingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Install All Missing</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-3 p-2.5 rounded-lg text-xs font-mono border flex items-center justify-between ${
                feedback.type === "success"
                  ? "bg-[#b8bb26]/15 border-[#b8bb26]/30 text-[#b8bb26]"
                  : feedback.type === "warn"
                  ? "bg-[#fabd2f]/15 border-[#fabd2f]/30 text-[#fabd2f]"
                  : "bg-[#fb4934]/15 border-[#fb4934]/30 text-[#fb4934]"
              }`}
            >
              <span>{feedback.text}</span>
              {feedback.type === "warn" && (
                <button
                  onClick={() =>
                    handleCopy(
                      `yay -S --needed ${missingPackages.map((p) => p.name).join(" ")}`,
                      "banner"
                    )
                  }
                  className="text-[11px] text-[#ebdbb2] underline cursor-pointer ml-2 hover:text-[#fbf1c7]"
                >
                  Re-copy Command
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Space Saver & Global Hosting Banner */}
      {selectedStatus === "shared" && (
        <div className="p-5 rounded-xl border border-[#83a598]/40 bg-[#32302f] space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#83a598]/15 border border-[#83a598]/30 text-[#83a598] text-xs font-mono font-medium">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Drive Space Optimizer &amp; Global Host</span>
              </div>
              <h3 className="text-base font-bold text-[#fbf1c7] tracking-tight">
                Migrate Repeated Dependencies &amp; Host 1 Copy Globally
              </h3>
              <p className="text-xs text-[#a89984] max-w-2xl leading-relaxed">
                Found <strong className="text-[#ebdbb2]">{sharedPackages.length} packages</strong> duplicated across separate workspace project directories. You can host 1 global copy to reclaim drive space using the workflows below:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs font-mono">
            {/* Strategy 1: Global Tooling */}
            <div className="p-3.5 rounded-lg bg-[#282828] border border-[#3c3836] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[#83a598] font-bold">
                <Globe className="w-4 h-4" />
                <span>1. Global CLI Tools</span>
              </div>
              <p className="text-[11px] text-[#a89984] leading-relaxed">
                Install shared devtools (<code className="text-[#ebdbb2]">typescript</code>, <code className="text-[#ebdbb2]">next</code>, <code className="text-[#ebdbb2]">eslint</code>) on the host system to run across any workspace without local duplicate copies.
              </p>
              <div className="pt-1">
                <code className="text-[10px] text-[#b8bb26] bg-[#1d2021] px-2 py-1 rounded block truncate">
                  bun add -g &lt;package&gt;
                </code>
              </div>
            </div>

            {/* Strategy 2: Global Linking */}
            <div className="p-3.5 rounded-lg bg-[#282828] border border-[#3c3836] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[#fabd2f] font-bold">
                <Layers className="w-4 h-4" />
                <span>2. Global Symlinking</span>
              </div>
              <p className="text-[11px] text-[#a89984] leading-relaxed">
                Link a single global package install into individual project <code className="text-[#ebdbb2]">node_modules</code> via symlinks, keeping 1 true copy on your drive.
              </p>
              <div className="pt-1">
                <code className="text-[10px] text-[#fabd2f] bg-[#1d2021] px-2 py-1 rounded block truncate">
                  bun link &lt;package&gt;
                </code>
              </div>
            </div>

            {/* Strategy 3: Central Store (pnpm / uv) */}
            <div className="p-3.5 rounded-lg bg-[#282828] border border-[#3c3836] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[#b8bb26] font-bold">
                <Sparkles className="w-4 h-4" />
                <span>3. Content-Addressed Store</span>
              </div>
              <p className="text-[11px] text-[#a89984] leading-relaxed">
                Using <code className="text-[#ebdbb2]">pnpm</code> or Python <code className="text-[#ebdbb2]">uv</code> stores 1 immutable copy in <code className="text-[#ebdbb2]">~/.local/share/pnpm/store</code> and hardlinks to all projects (0 duplicated bytes!).
              </p>
              <div className="pt-1">
                <code className="text-[10px] text-[#b8bb26] bg-[#1d2021] px-2 py-1 rounded block truncate">
                  pnpm import / uv sync
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-[#32302f] border border-[#504945] rounded-xl overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#504945] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#7c6f64] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packages or dependent projects..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#282828] border border-[#504945] text-xs text-[#ebdbb2] placeholder-[#7c6f64] focus:outline-none focus:border-[#fe8019] font-mono transition"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 shrink-0 flex-wrap gap-y-1">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-[#ebdbb2] text-[#1d2021] font-bold"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] hover:bg-[#3c3836] border border-[#3c3836]"
              }`}
            >
              ALL ({packages.length})
            </button>
            <button
              onClick={() => setSelectedStatus("shared")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                selectedStatus === "shared"
                  ? "bg-[#83a598] text-[#1d2021] font-bold"
                  : "bg-[#83a598]/15 text-[#83a598] border border-[#83a598]/40 hover:bg-[#83a598]/25"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>SHARED / SPACE SAVER</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  selectedStatus === "shared"
                    ? "bg-[#1d2021] text-[#83a598]"
                    : "bg-[#83a598] text-[#1d2021]"
                }`}
              >
                {sharedPackages.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedStatus("missing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                selectedStatus === "missing"
                  ? "bg-[#fb4934] text-[#1d2021] font-bold"
                  : missingPackages.length > 0
                  ? "bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/40 hover:bg-[#fb4934]/25"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] hover:bg-[#3c3836] border border-[#3c3836]"
              }`}
            >
              <span>MISSING</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  selectedStatus === "missing"
                    ? "bg-[#1d2021] text-[#fb4934]"
                    : "bg-[#fb4934] text-[#1d2021]"
                }`}
              >
                {missingPackages.length}
              </span>
            </button>
            <button
              onClick={() => setSelectedStatus("installed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                selectedStatus === "installed"
                  ? "bg-[#b8bb26] text-[#1d2021] font-bold"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] hover:bg-[#3c3836] border border-[#3c3836]"
              }`}
            >
              INSTALLED ({installedPackages.length})
            </button>
          </div>
        </div>

        {/* Type Filter Bar */}
        <div className="px-4 py-2 bg-[#282828] border-b border-[#3c3836] flex items-center space-x-1 overflow-x-auto">
          <span className="text-[11px] font-mono text-[#7c6f64] mr-2 shrink-0">ECOSYSTEM:</span>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase transition cursor-pointer ${
                selectedType === t
                  ? "bg-[#fe8019] text-[#1d2021] font-bold"
                  : "bg-[#32302f] text-[#a89984] hover:text-[#ebdbb2] border border-[#3c3836]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#282828] text-[#a89984] border-b border-[#504945] font-mono">
              <tr>
                <th className="py-3 px-4">Package</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Installed Version</th>
                <th className="py-3 px-4">Required By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c3836]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#a89984]">
                    No packages found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => {
                  const isExpanded = expandedPkg === pkg.name;
                  const isMissing = !pkg.installed;

                  return (
                    <tr
                      key={pkg.name}
                      className={`transition group cursor-pointer ${
                        isMissing
                          ? "bg-[#fb4934]/5 border-l-4 border-l-[#fb4934] hover:bg-[#fb4934]/10"
                          : "hover:bg-[#3c3836]/40"
                      }`}
                      onClick={() => setExpandedPkg(isExpanded ? null : pkg.name)}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[#fbf1c7] flex items-center space-x-2">
                        <Box
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isMissing ? "text-[#fb4934]" : "text-[#83a598]"
                          }`}
                        />
                        <span className={isMissing ? "text-[#fb4934] font-bold" : ""}>
                          {pkg.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#282828] text-[#d5c4a1] border border-[#3c3836] font-mono text-[10px] uppercase">
                          {pkg.pkg_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#ebdbb2]">
                        {pkg.installed_version ? (
                          pkg.installed_version
                        ) : pkg.installed ? (
                          <span className="text-[#a89984]">Available</span>
                        ) : (
                          <span className="text-[#fb4934] font-semibold">Not installed</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-[#ebdbb2]">
                            {pkg.required_by.length} project(s)
                          </span>
                          {pkg.required_by.length >= 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#83a598]/15 border border-[#83a598]/30 text-[#83a598] font-mono text-[9px] flex items-center space-x-1 shrink-0">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Shared</span>
                            </span>
                          )}
                          <span className="text-[10px] text-[#928374]">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {pkg.required_by.map((req) => (
                              <span
                                key={req}
                                className="px-2 py-0.5 rounded bg-[#282828] text-[#83a598] border border-[#3c3836] text-[10px] font-mono"
                              >
                                {req}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {pkg.installed ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Installed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30">
                            <AlertCircle className="w-3 h-3" />
                            <span>Missing</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isMissing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleInstall([pkg.name])}
                              disabled={installingPkg === pkg.name}
                              className="px-2.5 py-1 rounded bg-[#fb4934] hover:bg-[#fb4934]/90 text-[#1d2021] font-mono font-semibold text-[11px] flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                              title="Install dependency via yay"
                            >
                              {installingPkg === pkg.name ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              <span>Install</span>
                            </button>
                            <button
                              onClick={() => handleCopy(`yay -S --needed ${pkg.name}`, pkg.name)}
                              className="px-2 py-1 rounded bg-[#282828] hover:bg-[#3c3836] border border-[#504945] text-[#ebdbb2] hover:text-[#fbf1c7] font-mono text-[11px] flex items-center space-x-1 cursor-pointer transition"
                              title="Copy install command"
                            >
                              {copiedCmd === pkg.name ? (
                                <Check className="w-3 h-3 text-[#b8bb26]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedCmd === pkg.name ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            {pkg.required_by.length >= 2 && (
                              <button
                                onClick={() => handleGlobalInstall(pkg)}
                                disabled={installingGlobalPkg === pkg.name}
                                className="px-2 py-0.5 rounded bg-[#282828] hover:bg-[#3c3836] border border-[#83a598]/40 text-[#83a598] hover:text-[#ebdbb2] font-mono text-[10px] flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                                title={`Install ${pkg.name} globally on host`}
                              >
                                {installingGlobalPkg === pkg.name ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#83a598]" />
                                ) : (
                                  <Globe className="w-2.5 h-2.5" />
                                )}
                                <span>Install Global</span>
                              </button>
                            )}
                            <span className="text-[#7c6f64] font-mono text-[11px]">Ready</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#282828] border-t border-[#504945] text-[11px] text-[#a89984] flex justify-between">
          <span>
            Showing <strong className="text-[#ebdbb2]">{filtered.length}</strong> of{" "}
            <strong className="text-[#ebdbb2]">{packages.length}</strong> tracked packages
          </span>
          <span className="text-[#928374]">Click any row to view dependent projects</span>
        </div>
      </div>
    </div>
  );
}

