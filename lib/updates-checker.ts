import { exec } from "child_process";
import { promisify } from "util";
import { CatalogData, CriticalWatch, Package } from "./types";
import { isLocalEnvironment, getCatalogConfig } from "./catalog";

const execAsync = promisify(exec);

interface AurResult {
  Name: string;
  Version: string;
  LastModified: number;
  Description: string;
}

export async function fetchAurInfo(pkgNames: string[]): Promise<Record<string, AurResult>> {
  if (pkgNames.length === 0) return {};
  try {
    const params = pkgNames.map((p) => `arg[]=${encodeURIComponent(p)}`).join("&");
    const res = await fetch(`https://aur.archlinux.org/rpc/v5/info?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, AurResult> = {};
    for (const r of data.results || []) {
      map[r.Name] = r;
    }
    return map;
  } catch (err) {
    console.error("AUR RPC query failed:", err);
    return {};
  }
}

export async function fetchArchOfficialPackage(pkgName: string): Promise<{ version: string; last_update?: string } | null> {
  try {
    const res = await fetch(`https://archlinux.org/packages/search/json/?name=${encodeURIComponent(pkgName)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const exact = (data.results || []).find((r: any) => r.pkgname === pkgName);
    if (exact) {
      return {
        version: `${exact.pkgver}-${exact.pkgrel}`,
        last_update: exact.last_update,
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function inspectPacmanLocal(pkgName: string): Promise<{
  repo?: string;
  version?: string;
  build_date?: string;
} | null> {
  if (!isLocalEnvironment()) return null;

  try {
    const { stdout } = await execAsync(`pacman -Si "${pkgName}" 2>/dev/null`);
    const lines = stdout.split("\n");
    let repo = "";
    let version = "";
    let build_date = "";

    for (const line of lines) {
      if (line.startsWith("Repository")) {
        repo = line.split(":")[1]?.trim() || "";
      } else if (line.startsWith("Version")) {
        version = line.split(":")[1]?.trim() || "";
      } else if (line.startsWith("Build Date")) {
        build_date = line.split(":").slice(1).join(":").trim();
      }
    }

    if (version) {
      return { repo, version, build_date };
    }
    return null;
  } catch {
    return null;
  }
}

export async function compareVersions(v1: string, v2: string): Promise<number> {
  if (v1 === v2) return 0;
  if (isLocalEnvironment()) {
    try {
      const { stdout } = await execAsync(`vercmp "${v1}" "${v2}" 2>/dev/null`);
      const val = parseInt(stdout.trim(), 10);
      if (!isNaN(val)) return val;
    } catch {
      // Fallback
    }
  }
  return v1.localeCompare(v2, undefined, { numeric: true });
}

export async function getCriticalWatchList(
  catalog: CatalogData,
  customWatchNames?: string[]
): Promise<CriticalWatch[]> {
  let watchNames = customWatchNames;
  if (!watchNames || watchNames.length === 0) {
    try {
      const config = await getCatalogConfig();
      if (config.critical_watch_packages && config.critical_watch_packages.length > 0) {
        watchNames = config.critical_watch_packages;
      }
    } catch {
      // fallback
    }
  }

  if (!watchNames || watchNames.length === 0) {
    watchNames = ["omarchy", "hyprland", "quickshell", "linux-wallpaperengine-git"];
  }

  const aurResults = await fetchAurInfo(watchNames);

  const results: CriticalWatch[] = [];

  for (const name of watchNames) {
    const pkg = catalog.packages[name];
    const dependents = pkg ? pkg.required_by.length : 0;
    const installedVer = pkg?.installed_version || "Not installed";

    let upstreamVer = installedVer;
    let buildDateStr: string | undefined = undefined;
    let ageDays = 0;

    // Try local pacman query if available
    const localInfo = await inspectPacmanLocal(name);
    if (localInfo && localInfo.version) {
      upstreamVer = localInfo.version;
      buildDateStr = localInfo.build_date;
    } else if (aurResults[name]) {
      upstreamVer = aurResults[name].Version;
      const modTime = aurResults[name].LastModified * 1000;
      buildDateStr = new Date(modTime).toLocaleDateString();
      ageDays = Math.floor((Date.now() - modTime) / (1000 * 60 * 60 * 24));
    } else {
      const archInfo = await fetchArchOfficialPackage(name);
      if (archInfo) {
        upstreamVer = archInfo.version;
        if (archInfo.last_update) {
          const updateTime = new Date(archInfo.last_update).getTime();
          buildDateStr = new Date(updateTime).toLocaleDateString();
          ageDays = Math.floor((Date.now() - updateTime) / (1000 * 60 * 60 * 24));
        }
      }
    }

    if (buildDateStr && ageDays === 0) {
      const parsedDate = new Date(buildDateStr);
      if (!isNaN(parsedDate.getTime())) {
        ageDays = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    let status: "up_to_date" | "update_available" | "diverged" = "up_to_date";
    let isAhead = false;
    let actionLabel: string | undefined = undefined;
    let actionCommand: string | undefined = undefined;

    if (installedVer === "Not installed") {
      status = "diverged";
      actionLabel = "Install Package";
      actionCommand = `yay -S --needed ${name}`;
    } else if (upstreamVer && installedVer !== upstreamVer) {
      const cmp = await compareVersions(installedVer, upstreamVer);
      if (cmp > 0) {
        // Installed is ahead of upstream (e.g. custom fork)
        status = "update_available";
        isAhead = true;
        if (name === "linux-wallpaperengine-git") {
          actionLabel = "Rebuild Local Fork";
          actionCommand = "cd ~/Projects/linux-wallpaperengine/packaging/archlinux && makepkg -si";
        } else {
          actionLabel = "Rebuild Local Fork";
          actionCommand = `yay -S --needed ${name}`;
        }
      } else if (cmp < 0) {
        status = "update_available";
        isAhead = false;
        actionLabel = aurResults[name] ? "Update via yay" : "Update via pacman";
        actionCommand = aurResults[name] ? `yay -S ${name}` : `sudo pacman -S ${name}`;
      } else {
        status = "up_to_date";
      }
    }

    let desc = "";
    if (name === "omarchy") {
      desc = "Omarchy Core Desktop Shell framework. Required for all Quattro plugins.";
    } else if (name === "hyprland") {
      desc = "Wayland Dynamic Tiling Compositor. Compositor protocol and layer shell foundation.";
    } else if (name === "quickshell") {
      desc = "QML Desktop Shell runtime engine for widgets, panels, and services.";
    } else if (name === "linux-wallpaperengine-git") {
      desc = "Wayland-native Wallpaper Engine fork backend rendering engine.";
    } else if (pkg?.description) {
      desc = pkg.description;
    } else if (aurResults[name]?.Description) {
      desc = aurResults[name].Description;
    } else {
      desc = "Monitored workspace dependency";
    }

    results.push({
      name,
      installed_version: installedVer,
      upstream_version: upstreamVer,
      build_date: buildDateStr,
      age_days: Math.max(0, ageDays),
      status,
      description: desc,
      dependents_count: dependents,
      is_critical: true,
      action_command: actionCommand,
      action_label: actionLabel,
      is_ahead: isAhead,
    });
  }

  return results;
}
