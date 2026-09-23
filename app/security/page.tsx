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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl border border-gray-800 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-purple-950/30 backdrop-blur-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
            {hasCriticalOrHigh ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Vulnerability & CVE Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Security & Advisory Radar
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Real-time vulnerability auditing across your tracked projects and dependencies.
            Correlates local package versions with official advisories from the{" "}
            <strong className="text-gray-200">Arch Linux Security Tracker</strong> and{" "}
            <strong className="text-gray-200">Open Source Vulnerabilities (OSV.dev)</strong>.
          </p>
        </div>

        {/* Scan Button */}
        {isLocal && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-purple-900/20 transition cursor-pointer w-fit shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Auditing Dependencies..." : "Run Security Scan"}</span>
          </button>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 flex items-center justify-between">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-white text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Severity Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Critical</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-400 font-mono">
            {bySev.CRITICAL || 0}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Immediate action</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">High</span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400 font-mono">
            {bySev.HIGH || 0}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Patch recommended</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Medium</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
            {bySev.MEDIUM || 0}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Moderate risk</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Low / Informational</span>
            <Info className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400 font-mono">
            {bySev.LOW || 0}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Minor severity</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by package name or CVE/GHSA identifier..."
            className="w-full bg-gray-950/60 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                selectedSeverity === sev
                  ? "bg-purple-600 text-white"
                  : "bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800"
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
          <div className="p-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
            <span>Loading security advisory intelligence...</span>
          </div>
        ) : (
          /* Clean State Card */
          <div className="rounded-3xl p-12 border border-gray-800 bg-gray-900/40 backdrop-blur-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">
                No Security Vulnerabilities Detected
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                All tracked package versions across your workspace projects match clean, non-vulnerable upstream releases in the Arch Linux Security Tracker and OSV database.
              </p>
            </div>
            <div className="pt-2 flex justify-center items-center space-x-4 text-[11px] text-gray-500">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Arch Linux Security Tracker</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>OSV.dev Open Source Vulnerabilities</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
