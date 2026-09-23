"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
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
    <div className="bg-[#32302f] border border-[#504945] rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#fabd2f]/15 border border-[#fabd2f]/30 flex items-center justify-center text-[#fabd2f]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#fbf1c7] flex items-center space-x-2">
              <span>Standard Tracked Packages (Radar Rules)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#3c3836] text-[#fe8019] border border-[#504945] font-mono">
                {packages.length} active
              </span>
            </h2>
            <p className="text-xs text-[#a89984]">
              Core dependencies monitored for upstream releases and host compatibility
            </p>
          </div>
        </div>

        {isLocal && (
          <button
            onClick={handleResetDefaults}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 text-xs text-[#a89984] hover:text-[#fbf1c7] px-3 py-1.5 rounded-lg bg-[#282828] border border-[#504945] hover:border-[#665c54] transition cursor-pointer"
            title="Reset to author's example defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        )}
      </div>

      {/* Cloud Demo Notice */}
      {!isLocal && (
        <div className="p-3.5 rounded-lg bg-[#282828] border border-[#3c3836] text-xs text-[#ebdbb2] flex items-start space-x-3">
          <PackageIcon className="w-4 h-4 text-[#fe8019] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#fbf1c7]">
              Populated with Author Example Configuration
            </p>
            <p className="text-[#a89984] text-[11px] leading-relaxed">
              This dashboard is pre-configured with the author&apos;s Omarchy desktop stack as an example.
              When running locally (<code className="text-[#fabd2f] bg-[#3c3836] px-1 py-0.5 rounded font-mono">bun run dev</code>),
              anyone can add, remove, and track their own system or AUR packages through this interface.
            </p>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
            message.type === "success"
              ? "bg-[#b8bb26]/15 border-[#b8bb26]/30 text-[#b8bb26]"
              : "bg-[#fb4934]/15 border-[#fb4934]/30 text-[#fb4934]"
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
              <PackageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c6f64]" />
              <input
                type="text"
                value={newPkg}
                onChange={(e) => setNewPkg(e.target.value)}
                placeholder="Add package to track (e.g. hyprland, waybar, neovim, react)..."
                className="w-full bg-[#1d2021] border border-[#504945] rounded-lg pl-10 pr-4 py-2 text-xs text-[#ebdbb2] placeholder-[#7c6f64] focus:outline-none focus:border-[#fe8019] font-mono transition"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newPkg.trim()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#d65d0e] hover:bg-[#fe8019] disabled:opacity-50 text-[#fbf1c7] text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Package</span>
            </button>
          </form>

          {/* Quick-add chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[#7c6f64] mr-1 font-mono">Detected in catalog:</span>
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleAdd(name)}
                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#282828] hover:bg-[#3c3836] border border-[#3c3836] text-[#d5c4a1] hover:text-[#fbf1c7] transition flex items-center space-x-1 cursor-pointer"
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
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#282828] border border-[#3c3836] hover:border-[#504945] transition group overflow-hidden"
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-md bg-[#1d2021] border border-[#3c3836] flex items-center justify-center text-[#a89984] group-hover:text-[#fe8019] transition shrink-0">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-semibold text-[#fbf1c7] truncate block" title={pkg}>
                  {pkg}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30 whitespace-nowrap">
                Radar Active
              </span>

              {isLocal && (
                <button
                  onClick={() => handleRemove(pkg)}
                  disabled={loading}
                  className="text-[#928374] hover:text-[#fb4934] p-1.5 rounded-md hover:bg-[#fb4934]/15 transition cursor-pointer shrink-0"
                  title={`Remove ${pkg} from radar`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <p className="text-xs text-[#a89984] italic p-4 text-center">
            No tracked packages configured.
          </p>
        )}
      </div>
    </div>
  );
}
