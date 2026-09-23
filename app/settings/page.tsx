"use client";

import DirectoryManager from "@/components/DirectoryManager";
import TrackedPackagesManager from "@/components/TrackedPackagesManager";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#fbf1c7] tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-[#83a598]" />
          <span>Workspace Settings</span>
        </h1>
        <p className="text-xs text-[#a89984]">
          Configure scanned directory roots, active projects, and real-time dependency radar tracking
        </p>
      </div>

      <DirectoryManager />

      <TrackedPackagesManager />
    </div>
  );
}
