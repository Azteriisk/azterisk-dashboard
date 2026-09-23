"use client";

import { useState, useEffect } from "react";
import { Package } from "@/lib/types";
import DependencyTable from "@/components/DependencyTable";
import { Package as PackageIcon, RefreshCw } from "lucide-react";

export default function DependenciesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dependencies");
      const data = await res.json();
      if (data.packages) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <PackageIcon className="w-6 h-6 text-blue-400" />
            <span>Dependency Staleness & Age Inspector</span>
          </h1>
          <p className="text-xs text-gray-400">
            Inspect all tracked packages across Pacman, AUR, npm, Cargo, Pip, and Go ecosystems
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-xs">Loading dependency catalog...</span>
        </div>
      ) : (
        <DependencyTable packages={packages} />
      )}
    </div>
  );
}
