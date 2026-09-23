"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Layers,
  FolderGit2,
  Package,
  Settings,
  RefreshCw,
  Server,
  Cloud,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local");
      setIsLocal(isLocalHost);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScanMessage("Scan complete!");
        setTimeout(() => window.location.reload(), 800);
      } else {
        setScanMessage(data.error || "Scan failed");
      }
    } catch {
      setScanMessage("Network error");
    } finally {
      setScanning(false);
    }
  };

  const navItems = [
    { href: "/", label: "Overview", icon: Layers },
    { href: "/projects", label: "Projects", icon: FolderGit2 },
    { href: "/dependencies", label: "Dependencies", icon: Package },
    { href: "/security", label: "Security", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090d16]/80 border-b border-gray-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">
                Azterisk<span className="text-blue-400 font-semibold">Dashboard</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                dashboard.azterisk.net
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Workspace Projects & Dependency Radar</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-blue-600/90 text-white shadow-sm shadow-blue-500/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status & Actions */}
        <div className="flex items-center space-x-3">
          {isLocal ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>Local Machine</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
              <Cloud className="w-3.5 h-3.5" />
              <span>Vercel Cloud</span>
            </div>
          )}

          {isLocal && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition border border-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              <span>{scanning ? "Scanning..." : "Re-scan"}</span>
            </button>
          )}

          {scanMessage && (
            <span className="text-xs text-blue-400 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{scanMessage}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
