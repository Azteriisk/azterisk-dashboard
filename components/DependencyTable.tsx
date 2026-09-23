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
    <div className="bg-[#32302f] border border-[#504945] rounded-xl overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-[#504945] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#7c6f64] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages or dependent projects..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#282828] border border-[#504945] text-xs text-[#ebdbb2] placeholder-[#7c6f64] focus:outline-none focus:border-[#fe8019] font-mono transition"
          />
        </div>

        {/* Type Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium uppercase transition cursor-pointer ${
                selectedType === t
                  ? "bg-[#fe8019] text-[#1d2021] font-semibold"
                  : "bg-[#282828] text-[#a89984] hover:text-[#ebdbb2] hover:bg-[#3c3836] border border-[#3c3836]"
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
          <thead className="bg-[#282828] text-[#a89984] border-b border-[#504945] font-mono">
            <tr>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Installed Version</th>
              <th className="py-3 px-4">Required By</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3c3836]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#a89984]">
                  No packages found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((pkg) => {
                const isExpanded = expandedPkg === pkg.name;
                return (
                  <tr
                    key={pkg.name}
                    className="hover:bg-[#3c3836]/40 transition group cursor-pointer"
                    onClick={() => setExpandedPkg(isExpanded ? null : pkg.name)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-[#fbf1c7] flex items-center space-x-2">
                      <Box className="w-3.5 h-3.5 text-[#83a598] flex-shrink-0" />
                      <span>{pkg.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#282828] text-[#d5c4a1] border border-[#3c3836] font-mono text-[10px] uppercase">
                        {pkg.pkg_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#ebdbb2]">
                      {pkg.installed_version ? (
                        pkg.installed_version
                      ) : pkg.installed ? (
                        <span className="text-[#a89984]">Available</span>
                      ) : (
                        <span className="text-[#fb4934] font-semibold">Not installed</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-[#ebdbb2]">
                          {pkg.required_by.length} project(s)
                        </span>
                        <span className="text-[10px] text-[#928374]">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pkg.required_by.map((req) => (
                            <span
                              key={req}
                              className="px-2 py-0.5 rounded bg-[#282828] text-[#83a598] border border-[#3c3836] text-[10px] font-mono"
                            >
                              {req}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {pkg.installed ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#b8bb26]/15 text-[#b8bb26] border border-[#b8bb26]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-[#fb4934]/15 text-[#fb4934] border border-[#fb4934]/30">
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

      <div className="p-3 bg-[#282828] border-t border-[#504945] text-[11px] text-[#a89984] flex justify-between">
        <span>
          Showing <strong className="text-[#ebdbb2]">{filtered.length}</strong> of <strong className="text-[#ebdbb2]">{packages.length}</strong> tracked
          packages
        </span>
        <span className="text-[#928374]">Click any row to view dependent projects</span>
      </div>
    </div>
  );
}
