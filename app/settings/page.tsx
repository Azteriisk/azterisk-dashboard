"use client";

import DirectoryManager from "@/components/DirectoryManager";
import { Settings, Sliders, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>Workspace Settings</span>
        </h1>
        <p className="text-xs text-gray-400">
          Configure scanned directory roots and automated dependency tracking thresholds
        </p>
      </div>

      <DirectoryManager />

      {/* Critical Watch Configuration card */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Critical Package Radar Rules</h2>
            <p className="text-xs text-gray-400">
              Core system packages automatically monitored for upstream releases
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {["omarchy", "hyprland", "quickshell", "linux-wallpaperengine-git"].map((pkg) => (
            <div
              key={pkg}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/60"
            >
              <span className="font-mono text-xs text-gray-200">{pkg}</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Shield Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
