"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Package } from "@/lib/types";
import DependencyTable from "@/components/DependencyTable";
import { Package as PackageIcon, RefreshCw } from "lucide-react";

function DependenciesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);

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

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await fetch("/api/dependencies", { method: "POST" });
      await fetchPackages();
    } catch (err) {
      console.error(err);
    } finally {
      setRescanning(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#fbf1c7] tracking-tight flex items-center space-x-2">
            <PackageIcon className="w-6 h-6 text-[#83a598]" />
            <span>Dependency Staleness & Age Inspector</span>
          </h1>
          <p className="text-xs text-[#a89984]">
            Inspect all tracked packages across Arch, AUR, npm, Cargo, Pip, and Go ecosystems
          </p>
        </div>

        <button
          onClick={handleRescan}
          disabled={rescanning || loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#3c3836] hover:bg-[#504945] text-[#ebdbb2] border border-[#504945] text-xs font-mono transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${rescanning ? "animate-spin text-[#fe8019]" : ""}`} />
          <span>{rescanning ? "Scanning..." : "Rescan Workspace"}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#a89984] flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#fe8019]" />
          <span className="text-xs">Loading dependency catalog...</span>
        </div>
      ) : (
        <DependencyTable
          packages={packages}
          initialStatus={initialStatus}
          onRefresh={fetchPackages}
        />
      )}
    </div>
  );
}

export default function DependenciesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-[#a89984] flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#fe8019]" />
          <span className="text-xs">Loading dependencies...</span>
        </div>
      }
    >
      <DependenciesContent />
    </Suspense>
  );
}
