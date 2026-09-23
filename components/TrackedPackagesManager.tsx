"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Package as PackageIcon,
} from "lucide-react";

interface TrackedPackagesManagerProps {
  initialPackages?: string[];
}

export default function TrackedPackagesManager({
  initialPackages,
}: TrackedPackagesManagerProps) {
  const [packages, setPackages] = useState<string[]>(initialPackages || []);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [newPkg, setNewPkg] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/tracked-packages");
      const data = await res.json();
      if (data.packages) {
        setPackages(data.packages);
        setAvailablePackages(data.available_packages || []);
        const isLocalHost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1" ||
            window.location.hostname.endsWith(".local"));
        setIsLocal(isLocalHost && data.is_local);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load tracked packages configuration" });
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleAdd = async (pkgToAdd: string) => {
    const target = pkgToAdd.trim().toLowerCase();
    if (!target) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/tracked-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: target }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setPackages(data.packages);
        setNewPkg("");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to add package to radar",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network request failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (pkgToRemove: string) => {
    if (packages.length <= 1) {
      alert("You must keep at least one tracked package.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/tracked-packages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkgToRemove }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setPackages(data.packages);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to remove package from radar",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network request failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Reset tracked packages to the author's example configuration (omarchy, hyprland, quickshell, linux-wallpaperengine-git)?"
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/tracked-packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_defaults: true }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setPackages(data.packages);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to reset default packages",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network request failed" });
    } finally {
      setLoading(false);
    }
  };

  // Quick suggestions: filtered from detected catalog packages that are not yet tracked
  const suggestions = availablePackages
    .filter((p) => !packages.includes(p.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Standard Tracked Packages (Radar Rules)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                {packages.length} active
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Core dependencies monitored for upstream version releases and host compatibility
            </p>
          </div>
        </div>

        {isLocal && (
          <button
            onClick={handleResetDefaults}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-950/60 border border-gray-800 hover:border-gray-700 transition"
            title="Reset to author's example defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        )}
      </div>

      {/* Cloud Demo Notice */}
      {!isLocal && (
        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-300 flex items-start space-x-3">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-purple-200">
              Populated with Author Example Configuration
            </p>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              This dashboard is pre-configured with the author&apos;s Omarchy desktop stack as an example.
              When running locally (<code className="text-purple-300 bg-purple-900/30 px-1 py-0.5 rounded">bun run dev</code>),
              anyone can add, remove, and track their own system or AUR packages through this interface.
            </p>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add Package Form (Local Only) */}
      {isLocal && (
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd(newPkg);
            }}
            className="flex items-center space-x-2"
          >
            <div className="relative flex-1">
              <PackageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={newPkg}
                onChange={(e) => setNewPkg(e.target.value)}
                placeholder="Add package to track (e.g. hyprland, waybar, neovim, react)..."
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 font-mono transition"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newPkg.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Package</span>
            </button>
          </form>

          {/* Quick-add chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-gray-500 mr-1">Detected in catalog:</span>
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleAdd(name)}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center space-x-1"
                >
                  <span>+ {name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Package List */}
      <div className="space-y-2">
        {packages.map((pkg) => (
          <div
            key={pkg}
            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-gray-800/60 hover:border-gray-700/80 transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 group-hover:text-purple-400 transition">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-mono text-xs font-semibold text-gray-200">
                  {pkg}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Radar Active
              </span>

              {isLocal && (
                <button
                  onClick={() => handleRemove(pkg)}
                  disabled={loading}
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                  title={`Remove ${pkg} from radar`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <p className="text-xs text-gray-500 italic p-4 text-center">
            No tracked packages configured.
          </p>
        )}
      </div>
    </div>
  );
}
