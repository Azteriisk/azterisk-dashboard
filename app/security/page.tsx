"use client";

import { useState, useEffect, useMemo } from "react";
import { Vulnerability, SecuritySummary } from "@/lib/types";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import GroupedVulnerabilityCard, { GroupedPackageVulnerability } from "@/components/GroupedVulnerabilityCard";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Search,
  Layers,
  List,
  Wrench,
  Zap,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  FolderGit2,
  Box,
} from "lucide-react";

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  UNKNOWN: 4,
};

export default function SecurityPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [summary, setSummary] = useState<SecuritySummary>({
    total_packages_tracked: 0,
    total_vulnerabilities: 0,
    by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
    affected_packages_count: 0,
    affected_projects_count: 0,
  });
  const [isLocal, setIsLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grouped" | "individual">("grouped");
  const [notification, setNotification] = useState<string | null>(null);

  // Multi-select & Batch Remediation State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [remediatedPackages, setRemediatedPackages] = useState<Set<string>>(new Set());
  const [hideRemediated, setHideRemediated] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security");
      if (!res.ok) {
        setNotification(`Failed to fetch security advisory data (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.vulnerabilities) {
        setVulnerabilities(data.vulnerabilities);
      }
      if (data.summary) {
        setSummary(data.summary);
      }
      const isLocalHost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname.endsWith(".local"));
      setIsLocal(isLocalHost && data.is_local);
    } catch {
      setNotification("Failed to fetch security advisory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      setNotification(null);
      const res = await fetch("/api/security", { method: "POST" });
      const data = await res.json().catch(() => ({ error: `Server returned HTTP ${res.status}` }));
      if (res.ok) {
        setVulnerabilities(data.vulnerabilities || []);
        if (data.summary) setSummary(data.summary);
        setRemediatedPackages(new Set());
        setSelectedKeys(new Set());
        setNotification("Security audit completed.");
      } else {
        setNotification(data.error || "Security scan failed.");
      }
    } catch {
      setNotification("Network error during security scan.");
    } finally {
      setScanning(false);
    }
  };

  // Group all raw vulnerabilities into unified package summaries FIRST to determine true highest severity
  const allGroupedVulns = useMemo(() => {
    const list: GroupedPackageVulnerability[] = [];
    const map = new Map<string, GroupedPackageVulnerability>();

    for (const v of vulnerabilities) {
      const key = `${v.package}-${v.ecosystem}`;
      if (!map.has(key)) {
        const g: GroupedPackageVulnerability = {
          package: v.package,
          ecosystem: v.ecosystem,
          installed_version: v.installed_version,
          highest_severity: v.severity,
          fixed_version: v.fixed_version,
          affected_projects: [...(v.affected_projects || [])],
          advisories: [v],
          remediation: v.remediation,
        };
        map.set(key, g);
        list.push(g);
      } else {
        const g = map.get(key)!;
        g.advisories.push(v);
        const currentRank = SEVERITY_RANK[g.highest_severity] ?? 99;
        const newRank = SEVERITY_RANK[v.severity] ?? 99;
        if (newRank < currentRank) {
          g.highest_severity = v.severity;
        }
        if (v.fixed_version && (!g.fixed_version || v.fixed_version > g.fixed_version)) {
          g.fixed_version = v.fixed_version;
        }
        for (const p of v.affected_projects || []) {
          if (!g.affected_projects.includes(p)) {
            g.affected_projects.push(p);
          }
        }
      }
    }

    list.sort((a, b) => {
      const rankA = SEVERITY_RANK[a.highest_severity] ?? 99;
      const rankB = SEVERITY_RANK[b.highest_severity] ?? 99;
      return rankA - rankB;
    });

    return list;
  }, [vulnerabilities]);

  // Filter grouped packages (by package name, ecosystem, and true highest severity)
  const filteredGrouped = useMemo(() => {
    return allGroupedVulns.filter((g) => {
      const matchesSearch =
        g.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.advisories.some(
          (adv) =>
            adv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (adv.title && adv.title.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchesSeverity =
        selectedSeverity === "ALL" || g.highest_severity === selectedSeverity;

      const matchesEcosystem =
        selectedEcosystem === "ALL" ||
        g.ecosystem.toLowerCase() === selectedEcosystem.toLowerCase();

      return matchesSearch && matchesSeverity && matchesEcosystem;
    });
  }, [allGroupedVulns, searchTerm, selectedSeverity, selectedEcosystem]);

  // Filter individual raw advisories (by package name, CVE id, advisory severity)
  const filteredIndividual = useMemo(() => {
    return vulnerabilities.filter((v) => {
      const matchesSearch =
        v.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.title && v.title.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeverity =
        selectedSeverity === "ALL" || v.severity === selectedSeverity;

      const matchesEcosystem =
        selectedEcosystem === "ALL" ||
        v.ecosystem.toLowerCase() === selectedEcosystem.toLowerCase();

      return matchesSearch && matchesSeverity && matchesEcosystem;
    });
  }, [vulnerabilities, searchTerm, selectedSeverity, selectedEcosystem]);

  // Taking into account "Hide Remediated" toggle
  const visibleGrouped = useMemo(() => {
    if (!hideRemediated) return filteredGrouped;
    return filteredGrouped.filter((g) => !remediatedPackages.has(g.package));
  }, [filteredGrouped, hideRemediated, remediatedPackages]);

  const visibleIndividual = useMemo(() => {
    if (!hideRemediated) return filteredIndividual;
    return filteredIndividual.filter((v) => !remediatedPackages.has(v.package));
  }, [filteredIndividual, hideRemediated, remediatedPackages]);

  // Active un-remediated PACKAGE counts by highest severity
  const activePackageCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const g of allGroupedVulns) {
      if (!remediatedPackages.has(g.package)) {
        counts[g.highest_severity as keyof typeof counts] =
          (counts[g.highest_severity as keyof typeof counts] || 0) + 1;
      }
    }
    return counts;
  }, [allGroupedVulns, remediatedPackages]);

  // Active un-remediated ADVISORY counts by individual CVE severity
  const activeAdvisoryCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const v of vulnerabilities) {
      if (!remediatedPackages.has(v.package)) {
        counts[v.severity as keyof typeof counts] =
          (counts[v.severity as keyof typeof counts] || 0) + 1;
      }
    }
    return counts;
  }, [vulnerabilities, remediatedPackages]);

  const totalActivePackages = Object.values(activePackageCounts).reduce((a, b) => a + b, 0);
  const totalActiveAdvisories = Object.values(activeAdvisoryCounts).reduce((a, b) => a + b, 0);

  const hasCriticalOrHigh =
    (activePackageCounts.CRITICAL || 0) > 0 || (activePackageCounts.HIGH || 0) > 0;

  const hasActionableFix = (fixed_version?: string | null, remediation?: string | null) => {
    return (
      Boolean(fixed_version) ||
      Boolean(
        remediation &&
          /^(bun|npm|pnpm|yarn|cargo|pip|pip3|go|paru|pacman)\b/.test(
            remediation.replace(/^[^:]+:\s*/, "")
          )
      )
    );
  };

  // Multi-select helpers
  const selectableKeys = useMemo(() => {
    if (viewMode === "grouped") {
      return visibleGrouped
        .filter((g) => !remediatedPackages.has(g.package) && hasActionableFix(g.fixed_version, g.remediation))
        .map((g) => `${g.package}-${g.ecosystem}`);
    } else {
      return visibleIndividual
        .filter((v) => !remediatedPackages.has(v.package) && hasActionableFix(v.fixed_version, v.remediation))
        .map((v) => `${v.id}-${v.package}`);
    }
  }, [viewMode, visibleGrouped, visibleIndividual, remediatedPackages]);

  const isAllSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selectedKeys.has(k));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(selectableKeys));
    }
  };

  const toggleItemSelect = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handlePackageRemediated = (packageName: string) => {
    setRemediatedPackages((prev) => new Set(prev).add(packageName));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const k of next) {
        if (k.includes(packageName)) next.delete(k);
      }
      return next;
    });
    fetchSecurityData();
  };

  // Batch Remediation Execution
  const runBatchRemediation = async (
    items: Array<{
      package_name: string;
      affected_projects?: string[];
      ecosystem: string;
      fixed_version?: string | null;
      command?: string | null;
    }>
  ) => {
    if (items.length === 0) return;

    setBatchProcessing(true);
    setBatchProgress({
      current: 0,
      total: items.length,
      message: `Initiating batch remediation for ${items.length} package(s)...`,
    });

    try {
      const res = await fetch("/api/security/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: `Server error (${res.status}): Failed to parse response.`,
      }));

      if (res.ok && data.results) {
        const newlyRemediated = new Set(remediatedPackages);
        for (const r of data.results) {
          if (r.success) {
            newlyRemediated.add(r.package_name);
          }
        }
        setRemediatedPackages(newlyRemediated);
        setSelectedKeys(new Set());
        setNotification(
          data.message ||
            `Batch remediation finished: ${data.succeeded || 0} succeeded, ${data.failed || 0} failed.`
        );
      } else if (res.ok && data.success) {
        items.forEach((i) => setRemediatedPackages((prev) => new Set(prev).add(i.package_name)));
        setSelectedKeys(new Set());
        setNotification(data.message || "Successfully applied fixes.");
      } else {
        setNotification(data.message || data.error || "Batch remediation completed with issues.");
      }

      await fetchSecurityData();
    } catch (err: any) {
      setNotification(`Batch remediation failed: ${err.message}`);
    } finally {
      setBatchProcessing(false);
      setBatchProgress(null);
    }
  };

  const handleApplySelected = () => {
    if (viewMode === "grouped") {
      const itemsToFix = allGroupedVulns
        .filter((g) => selectedKeys.has(`${g.package}-${g.ecosystem}`) && !remediatedPackages.has(g.package))
        .map((g) => ({
          package_name: g.package,
          affected_projects: g.affected_projects,
          ecosystem: g.ecosystem,
          fixed_version: g.fixed_version,
          command: g.remediation?.includes(": ") ? g.remediation.split(": ").slice(1).join(": ").trim() : g.remediation,
        }));
      runBatchRemediation(itemsToFix);
    } else {
      const itemsToFix = vulnerabilities
        .filter((v) => selectedKeys.has(`${v.id}-${v.package}`) && !remediatedPackages.has(v.package))
        .map((v) => ({
          package_name: v.package,
          affected_projects: v.affected_projects,
          ecosystem: v.ecosystem,
          fixed_version: v.fixed_version,
          command: v.remediation?.includes(": ") ? v.remediation.split(": ").slice(1).join(": ").trim() : v.remediation,
        }));
      runBatchRemediation(itemsToFix);
    }
  };

  const handleApplyAll = () => {
    const itemsToFix = allGroupedVulns
      .filter((g) => !remediatedPackages.has(g.package) && hasActionableFix(g.fixed_version, g.remediation))
      .map((g) => ({
        package_name: g.package,
        affected_projects: g.affected_projects,
        ecosystem: g.ecosystem,
        fixed_version: g.fixed_version,
        command: g.remediation?.includes(": ") ? g.remediation.split(": ").slice(1).join(": ").trim() : g.remediation,
      }));

    const noFixCount = allGroupedVulns.filter(
      (g) => !remediatedPackages.has(g.package) && !hasActionableFix(g.fixed_version, g.remediation)
    ).length;
    const note = noFixCount > 0 ? ` (${noFixCount} package(s) have no upstream fix available yet and will be skipped)` : "";

    if (
      window.confirm(
        `Apply updates across all ${itemsToFix.length} fixable package(s) in their respective workspace projects?${note}`
      )
    ) {
      runBatchRemediation(itemsToFix);
    }
  };

  const unremediatedCount = selectableKeys.length;
  const selectedCount = selectedKeys.size;
  const remediatedCount = remediatedPackages.size;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl border border-[#504945] bg-[#32302f] shadow-xs">
        <div className="space-y-2.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#3c3836] border border-[#504945] text-[#fe8019] text-xs font-mono font-medium">
            {hasCriticalOrHigh ? (
              <ShieldAlert className="w-3.5 h-3.5 text-[#fb4934]" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#b8bb26]" />
            )}
            <span>Security &amp; Advisory Audit</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#fbf1c7] tracking-tight">
            Security &amp; Advisory Radar
          </h1>

          <p className="text-xs sm:text-sm text-[#a89984] max-w-2xl leading-relaxed">
            Vulnerability auditing across your tracked workspace projects and dependencies.
            Correlates local versions with the{" "}
            <strong className="text-[#ebdbb2] font-semibold">Arch Linux Security Tracker</strong> and{" "}
            <strong className="text-[#ebdbb2] font-semibold">Open Source Vulnerabilities (OSV.dev)</strong>.
          </p>

          {/* High-level breakdown pills */}
          <div className="flex items-center flex-wrap gap-2 pt-1 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-[#282828] border border-[#3c3836] text-[#ebdbb2] flex items-center space-x-1.5">
              <Box className="w-3.5 h-3.5 text-[#fe8019]" />
              <span>
                <strong className="text-[#fbf1c7]">
                  {loading ? "..." : (summary.total_packages_tracked || totalActivePackages)}
                </strong> Packages Tracked
              </span>
            </span>

            <span className="px-2.5 py-1 rounded-md bg-[#282828] border border-[#3c3836] text-[#ebdbb2] flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#fabd2f]" />
              <span>
                <strong className="text-[#fbf1c7]">
                  {loading ? "..." : totalActiveAdvisories}
                </strong> Advisories (CVEs/GHSAs)
              </span>
            </span>

            <span className="px-2.5 py-1 rounded-md bg-[#282828] border border-[#3c3836] text-[#ebdbb2] flex items-center space-x-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#83a598]" />
              <span>
                <strong className="text-[#fbf1c7]">
                  {loading ? "..." : (summary.affected_projects_count || 0)}
                </strong> Impacted Projects
              </span>
            </span>
          </div>
        </div>

        {/* Scan Button */}
        {isLocal && (
          <button
            onClick={handleScan}
            disabled={scanning || batchProcessing}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#d65d0e] hover:bg-[#fe8019] disabled:opacity-50 text-[#fbf1c7] font-semibold text-xs transition cursor-pointer w-fit shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Auditing Dependencies..." : "Run Security Scan"}</span>
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-[#32302f] border border-[#504945] text-xs text-[#ebdbb2] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#b8bb26] shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#a89984] hover:text-[#fbf1c7] text-xs font-mono ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Severity Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CRITICAL */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "CRITICAL" ? "ALL" : "CRITICAL")}
          className={`bg-[#32302f] border rounded-xl p-5 cursor-pointer transition select-none ${
            selectedSeverity === "CRITICAL"
              ? "border-[#fb4934] ring-2 ring-[#fb4934]/40 shadow-xs"
              : "border-[#504945] hover:border-[#fb4934]/60"
          }`}
          title="Click to filter by CRITICAL severity"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#fb4934]">CRITICAL</span>
            <AlertOctagon className="w-4 h-4 text-[#fb4934]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fb4934] font-mono">
            {viewMode === "grouped" ? activePackageCounts.CRITICAL || 0 : activeAdvisoryCounts.CRITICAL || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">
            {viewMode === "grouped"
              ? `${activePackageCounts.CRITICAL || 0} package(s) (${activeAdvisoryCounts.CRITICAL} CVEs)`
              : `${activeAdvisoryCounts.CRITICAL || 0} critical advisories`}
          </span>
        </div>

        {/* HIGH */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "HIGH" ? "ALL" : "HIGH")}
          className={`bg-[#32302f] border rounded-xl p-5 cursor-pointer transition select-none ${
            selectedSeverity === "HIGH"
              ? "border-[#fe8019] ring-2 ring-[#fe8019]/40 shadow-xs"
              : "border-[#504945] hover:border-[#fe8019]/60"
          }`}
          title="Click to filter by HIGH severity"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#fe8019]">HIGH</span>
            <ShieldAlert className="w-4 h-4 text-[#fe8019]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fe8019] font-mono">
            {viewMode === "grouped" ? activePackageCounts.HIGH || 0 : activeAdvisoryCounts.HIGH || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">
            {viewMode === "grouped"
              ? `${activePackageCounts.HIGH || 0} package(s) (${activeAdvisoryCounts.HIGH} CVEs)`
              : `${activeAdvisoryCounts.HIGH || 0} high risk CVEs`}
          </span>
        </div>

        {/* MEDIUM */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "MEDIUM" ? "ALL" : "MEDIUM")}
          className={`bg-[#32302f] border rounded-xl p-5 cursor-pointer transition select-none ${
            selectedSeverity === "MEDIUM"
              ? "border-[#fabd2f] ring-2 ring-[#fabd2f]/40 shadow-xs"
              : "border-[#504945] hover:border-[#fabd2f]/60"
          }`}
          title="Click to filter by MEDIUM severity"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#fabd2f]">MEDIUM</span>
            <AlertTriangle className="w-4 h-4 text-[#fabd2f]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fabd2f] font-mono">
            {viewMode === "grouped" ? activePackageCounts.MEDIUM || 0 : activeAdvisoryCounts.MEDIUM || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">
            {viewMode === "grouped"
              ? `${activePackageCounts.MEDIUM || 0} package(s) (${activeAdvisoryCounts.MEDIUM} CVEs)`
              : `${activeAdvisoryCounts.MEDIUM || 0} moderate CVEs`}
          </span>
        </div>

        {/* LOW */}
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === "LOW" ? "ALL" : "LOW")}
          className={`bg-[#32302f] border rounded-xl p-5 cursor-pointer transition select-none ${
            selectedSeverity === "LOW"
              ? "border-[#83a598] ring-2 ring-[#83a598]/40 shadow-xs"
              : "border-[#504945] hover:border-[#83a598]/60"
          }`}
          title="Click to filter by LOW severity"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#83a598]">LOW</span>
            <Info className="w-4 h-4 text-[#83a598]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#83a598] font-mono">
            {viewMode === "grouped" ? activePackageCounts.LOW || 0 : activeAdvisoryCounts.LOW || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">
            {viewMode === "grouped"
              ? `${activePackageCounts.LOW || 0} package(s) (${activeAdvisoryCounts.LOW} CVEs)`
              : `${activeAdvisoryCounts.LOW || 0} low severity CVEs`}
          </span>
        </div>
      </div>

      {/* Batch Remediation Action Toolbar */}
      {isLocal && unremediatedCount > 0 && (
        <div className="p-4 rounded-xl border border-[#fe8019]/40 bg-[#32302f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSelectAll}
              disabled={batchProcessing}
              className="inline-flex items-center space-x-2 text-xs font-mono text-[#ebdbb2] hover:text-[#fbf1c7] cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#fe8019]" />
              ) : (
                <Square className="w-4 h-4 text-[#7c6f64]" />
              )}
              <span>
                {isAllSelected ? "Deselect All" : `Select All (${unremediatedCount})`}
              </span>
            </button>

            <span className="text-[#504945]">•</span>

            <span className="text-xs font-mono text-[#a89984]">
              <strong className="text-[#fbf1c7]">{selectedCount}</strong> selected
            </span>

            {remediatedCount > 0 && (
              <>
                <span className="text-[#504945]">•</span>
                <button
                  onClick={() => setHideRemediated(!hideRemediated)}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#83a598] hover:text-[#fbf1c7] cursor-pointer"
                >
                  {hideRemediated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hideRemediated ? "Show Remediated" : `Hide Remediated (${remediatedCount})`}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Apply Selected Button */}
            <button
              onClick={handleApplySelected}
              disabled={selectedCount === 0 || batchProcessing}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#fe8019] hover:bg-[#fe8019]/90 disabled:opacity-40 disabled:cursor-not-allowed text-[#1d2021] font-mono font-bold text-xs transition cursor-pointer"
              title="Apply fix to all checked packages"
            >
              {batchProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              <span>Apply Fix to Selected ({selectedCount})</span>
            </button>

            {/* Apply All Button */}
            <button
              onClick={handleApplyAll}
              disabled={unremediatedCount === 0 || batchProcessing}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#fabd2f] hover:bg-[#fabd2f]/90 disabled:opacity-40 disabled:cursor-not-allowed text-[#1d2021] font-mono font-bold text-xs transition cursor-pointer"
              title="Apply updates to all vulnerable packages across all projects"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply All ({unremediatedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Processing Progress Banner */}
      {batchProcessing && (
        <div className="p-4 rounded-xl border border-[#fe8019] bg-[#282828] space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center space-x-2 text-[#fe8019]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <strong className="font-semibold">Executing batch remediation across workspaces...</strong>
            </span>
            <span className="text-[#a89984]">Please wait</span>
          </div>
          <div className="w-full bg-[#1d2021] h-2 rounded-full overflow-hidden border border-[#3c3836]">
            <div className="h-full bg-linear-to-r from-[#fe8019] to-[#b8bb26] w-full animate-indeterminate" />
          </div>
          <p className="text-[11px] font-mono text-[#a89984]">
            Updating project manifests, executing package managers, and synchronizing security audit.
          </p>
        </div>
      )}

      {/* Filters, View Toggle & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c6f64]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by package name or CVE/GHSA identifier..."
              className="w-full bg-[#282828] border border-[#504945] rounded-lg pl-10 pr-4 py-2 text-xs text-[#ebdbb2] placeholder-[#7c6f64] focus:outline-none focus:border-[#fe8019] font-mono transition"
            />
          </div>

          {/* Severity Filter Pills with Accurate Dynamic Counters */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              {
                id: "ALL",
                label: "ALL",
                count: viewMode === "grouped" ? totalActivePackages : totalActiveAdvisories,
              },
              {
                id: "CRITICAL",
                label: "CRITICAL",
                count: viewMode === "grouped" ? activePackageCounts.CRITICAL : activeAdvisoryCounts.CRITICAL,
              },
              {
                id: "HIGH",
                label: "HIGH",
                count: viewMode === "grouped" ? activePackageCounts.HIGH : activeAdvisoryCounts.HIGH,
              },
              {
                id: "MEDIUM",
                label: "MEDIUM",
                count: viewMode === "grouped" ? activePackageCounts.MEDIUM : activeAdvisoryCounts.MEDIUM,
              },
              {
                id: "LOW",
                label: "LOW",
                count: viewMode === "grouped" ? activePackageCounts.LOW : activeAdvisoryCounts.LOW,
              },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setSelectedSeverity(id)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                  selectedSeverity === id
                    ? "bg-[#fe8019] text-[#1d2021] font-semibold"
                    : "bg-[#32302f] text-[#a89984] hover:text-[#ebdbb2] border border-[#504945]"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    selectedSeverity === id
                      ? "bg-[#1d2021] text-[#fe8019]"
                      : "bg-[#282828] text-[#d5c4a1]"
                  }`}
                >
                  {count || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#3c3836]">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setViewMode("grouped");
                setSelectedKeys(new Set());
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-[#ebdbb2] text-[#1d2021] font-bold"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] border border-[#3c3836]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Group by Package ({totalActivePackages})</span>
            </button>

            <button
              onClick={() => {
                setViewMode("individual");
                setSelectedKeys(new Set());
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                viewMode === "individual"
                  ? "bg-[#ebdbb2] text-[#1d2021] font-bold"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] border border-[#3c3836]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>All Advisories ({totalActiveAdvisories})</span>
            </button>
          </div>

          <span className="text-[#928374] font-mono text-[11px] hidden sm:inline">
            {viewMode === "grouped"
              ? "Aggregated by package with highest severity classification"
              : "Showing each individual CVE / GHSA advisory"}
          </span>
        </div>
      </div>

      {/* Vulnerabilities List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#a89984]">
            <RefreshCw className="w-6 h-6 text-[#fe8019] animate-spin mx-auto mb-2" />
            <span>Auditing security advisories...</span>
          </div>
        ) : viewMode === "grouped" ? (
          visibleGrouped.length > 0 ? (
            visibleGrouped.map((group) => {
              const key = `${group.package}-${group.ecosystem}`;
              const isRemediated = remediatedPackages.has(group.package);
              return (
                <GroupedVulnerabilityCard
                  key={key}
                  group={group}
                  selected={selectedKeys.has(key)}
                  onToggleSelect={(checked) => toggleItemSelect(key, checked)}
                  isRemediated={isRemediated}
                  onRemediated={handlePackageRemediated}
                  disabled={batchProcessing}
                />
              );
            })
          ) : (
            <CleanStateCard />
          )
        ) : visibleIndividual.length > 0 ? (
          visibleIndividual.map((vuln) => {
            const key = `${vuln.id}-${vuln.package}`;
            const isRemediated = remediatedPackages.has(vuln.package);
            return (
              <VulnerabilityCard
                key={key}
                vuln={vuln}
                selected={selectedKeys.has(key)}
                onToggleSelect={(checked) => toggleItemSelect(key, checked)}
                isRemediated={isRemediated}
                onRemediated={handlePackageRemediated}
                disabled={batchProcessing}
              />
            );
          })
        ) : (
          <CleanStateCard />
        )}
      </div>
    </div>
  );
}

function CleanStateCard() {
  return (
    <div className="rounded-xl p-10 border border-[#504945] bg-[#32302f] text-center space-y-4">
      <div className="w-14 h-14 rounded-xl bg-[#b8bb26]/15 border border-[#b8bb26]/30 text-[#b8bb26] flex items-center justify-center mx-auto">
        <ShieldCheck className="w-7 h-7" />
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-bold text-[#fbf1c7] tracking-tight">
          No Security Vulnerabilities Detected
        </h3>
        <p className="text-xs text-[#a89984] leading-relaxed">
          All tracked package versions across your workspace projects match clean, non-vulnerable upstream releases in the Arch Linux Security Tracker and OSV database.
        </p>
      </div>
      <div className="pt-2 flex justify-center items-center space-x-4 text-[11px] text-[#928374]">
        <span className="flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#b8bb26]" />
          <span>Arch Linux Security Tracker</span>
        </span>
        <span>•</span>
        <span className="flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#b8bb26]" />
          <span>OSV.dev Vulnerabilities</span>
        </span>
      </div>
    </div>
  );
}
