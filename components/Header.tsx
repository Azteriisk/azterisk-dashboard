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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#1d2021]/95 border-b border-[#3c3836] px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#d65d0e] border border-[#fe8019]/40 flex items-center justify-center">
            <Package className="w-4 h-4 text-[#fbf1c7]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-[#fbf1c7]">
                Azterisk<span className="text-[#fe8019] font-semibold">Dashboard</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#3c3836] text-[#fabd2f] border border-[#504945] font-mono">
                dashboard.azterisk.net
              </span>
            </div>
            <p className="text-[11px] text-[#a89984]">Workspace Projects & Dependency Radar</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 bg-[#282828] p-1 rounded-xl border border-[#3c3836]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-[#3c3836] text-[#fbf1c7] border border-[#504945] shadow-xs"
                    : "text-[#a89984] hover:text-[#ebdbb2] hover:bg-[#32302f]"
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
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#b8bb26]/15 border border-[#b8bb26]/30 text-[#b8bb26] text-xs font-medium font-mono">
              <Server className="w-3.5 h-3.5" />
              <span>Local Machine</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#d3869b]/15 border border-[#d3869b]/30 text-[#d3869b] text-xs font-medium font-mono">
              <Cloud className="w-3.5 h-3.5" />
              <span>Vercel Cloud</span>
            </div>
          )}

          {isLocal && (
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#3c3836] hover:bg-[#504945] text-[#ebdbb2] text-xs font-medium transition border border-[#504945] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              <span>{scanning ? "Scanning..." : "Re-scan"}</span>
            </button>
          )}

          {scanMessage && (
            <span className="text-xs text-[#b8bb26] flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{scanMessage}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
