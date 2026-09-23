"use client";

import { useState } from "react";
import { Package } from "@/lib/types";
import { Search, Box, AlertCircle, CheckCircle2, ArrowUpCircle } from "lucide-react";

interface DependencyTableProps {
  packages: Package[];
}

export default function DependencyTable({ packages }: DependencyTableProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const types = ["all", "pacman", "aur", "npm", "cargo", "pip", "go", "inter-project"];

  const filtered = packages.filter((pkg) => {
    const matchesType = selectedType === "all" || pkg.pkg_type.toLowerCase() === selectedType.toLowerCase();
    const matchesQuery =
      pkg.name.toLowerCase().includes(query.toLowerCase()) ||
      pkg.required_by.some((req) => req.toLowerCase().includes(query.toLowerCase()));
    return matchesType && matchesQuery;
  });

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages or dependent projects..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
          />
        </div>

        {/* Type Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium uppercase transition ${
                selectedType === t
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-gray-950/40 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-950/40 text-gray-400 border-b border-gray-800 font-medium">
            <tr>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Installed Version</th>
              <th className="py-3 px-4">Required By</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No packages found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((pkg) => {
                const isExpanded = expandedPkg === pkg.name;
                return (
                  <tr
                    key={pkg.name}
                    className="hover:bg-gray-800/30 transition group cursor-pointer"
                    onClick={() => setExpandedPkg(isExpanded ? null : pkg.name)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-white flex items-center space-x-2">
                      <Box className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span>{pkg.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono text-[10px] uppercase">
                        {pkg.pkg_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      {pkg.installed_version ? (
                        pkg.installed_version
                      ) : pkg.installed ? (
                        <span className="text-gray-400">Available</span>
                      ) : (
                        <span className="text-red-400 font-semibold">Not installed</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-gray-200">
                          {pkg.required_by.length} project(s)
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pkg.required_by.map((req) => (
                            <span
                              key={req}
                              className="px-2 py-0.5 rounded bg-gray-950 text-blue-300 border border-gray-800 text-[10px]"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {pkg.installed ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-gray-950/40 border-t border-gray-800 text-[11px] text-gray-400 flex justify-between">
        <span>
          Showing <strong>{filtered.length}</strong> of <strong>{packages.length}</strong> tracked
          packages
        </span>
        <span>Click any row to view dependent projects</span>
      </div>
    </div>
  );
}
