"use client";

import { useState, useEffect } from "react";
import { Vulnerability, SecuritySummary } from "@/lib/types";
import VulnerabilityCard from "@/components/VulnerabilityCard";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";

export default function SecurityPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [summary, setSummary] = useState<SecuritySummary>({
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
  const [notification, setNotification] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security");
      const data = await res.json();
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
      const data = await res.json();
      if (res.ok) {
        setVulnerabilities(data.vulnerabilities || []);
        if (data.summary) setSummary(data.summary);
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

  const filteredVulns = vulnerabilities.filter((v) => {
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

  const bySev = summary.by_severity || {};
  const hasCriticalOrHigh =
    (bySev.CRITICAL || 0) > 0 || (bySev.HIGH || 0) > 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl border border-[#504945] bg-[#32302f] shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#3c3836] border border-[#504945] text-[#fe8019] text-xs font-mono font-medium">
            {hasCriticalOrHigh ? (
              <ShieldAlert className="w-3.5 h-3.5 text-[#fb4934]" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#b8bb26]" />
            )}
            <span>Security & Advisory Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#fbf1c7] tracking-tight">
            Security & Advisory Radar
          </h1>
          <p className="text-xs sm:text-sm text-[#a89984] max-w-2xl leading-relaxed">
            Vulnerability auditing across your tracked projects and dependencies.
            Correlates local package versions with official advisories from the{" "}
            <strong className="text-[#ebdbb2] font-semibold">Arch Linux Security Tracker</strong> and{" "}
            <strong className="text-[#ebdbb2] font-semibold">Open Source Vulnerabilities (OSV.dev)</strong>.
          </p>
        </div>

        {/* Scan Button */}
        {isLocal && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#d65d0e] hover:bg-[#fe8019] disabled:opacity-50 text-[#fbf1c7] font-semibold text-xs transition cursor-pointer w-fit shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Auditing Dependencies..." : "Run Security Scan"}</span>
          </button>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 rounded-lg bg-[#3c3836] border border-[#504945] text-xs text-[#ebdbb2] flex items-center justify-between">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-[#a89984] hover:text-[#fbf1c7] text-xs ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Severity Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#a89984]">CRITICAL</span>
            <AlertOctagon className="w-4 h-4 text-[#fb4934]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fb4934] font-mono">
            {bySev.CRITICAL || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">Immediate action</span>
        </div>

        <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#a89984]">HIGH</span>
            <ShieldAlert className="w-4 h-4 text-[#fe8019]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fe8019] font-mono">
            {bySev.HIGH || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">Patch recommended</span>
        </div>

        <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#a89984]">MEDIUM</span>
            <AlertTriangle className="w-4 h-4 text-[#fabd2f]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#fabd2f] font-mono">
            {bySev.MEDIUM || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">Moderate risk</span>
        </div>

        <div className="bg-[#32302f] border border-[#504945] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#a89984]">LOW</span>
            <Info className="w-4 h-4 text-[#83a598]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#83a598] font-mono">
            {bySev.LOW || 0}
          </div>
          <span className="text-[11px] text-[#928374] mt-1 block">Minor severity</span>
        </div>
      </div>

      {/* Filters & Search */}
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

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition cursor-pointer shrink-0 ${
                selectedSeverity === sev
                  ? "bg-[#fe8019] text-[#1d2021] font-semibold"
                  : "bg-[#32302f] text-[#a89984] hover:text-[#ebdbb2] border border-[#504945]"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Vulnerabilities List */}
      <div className="space-y-4">
        {filteredVulns.length > 0 ? (
          filteredVulns.map((vuln) => (
            <VulnerabilityCard key={`${vuln.id}-${vuln.package}`} vuln={vuln} />
          ))
        ) : loading ? (
          <div className="p-12 text-center text-xs text-[#a89984]">
            <RefreshCw className="w-6 h-6 text-[#fe8019] animate-spin mx-auto mb-2" />
            <span>Auditing security advisories...</span>
          </div>
        ) : (
          /* Clean State Card */
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
        )}
      </div>
    </div>
  );
}
