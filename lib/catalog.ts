import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { CatalogData, CatalogConfig, WorkspaceStats } from "./types";

const execAsync = promisify(exec);

const LOCAL_CATALOG_PATH = "/home/azterisk/Projects/omarchy-catalog/catalog.json";
const LOCAL_CONFIG_PATH = "/home/azterisk/Projects/omarchy-catalog/catalog-config.json";
const BUNDLED_CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");
const BUNDLED_CONFIG_PATH = path.join(process.cwd(), "data", "catalog-config.json");

export function isLocalEnvironment(): boolean {
  if (process.env.VERCEL === "1" || process.env.NOW_REGION) {
    return false;
  }
  try {
    return fs.existsSync("/home/azterisk/Projects");
  } catch {
    return false;
  }
}

export async function getCatalogData(): Promise<CatalogData> {
  let targetPath = BUNDLED_CATALOG_PATH;

  if (isLocalEnvironment() && fs.existsSync(LOCAL_CATALOG_PATH)) {
    targetPath = LOCAL_CATALOG_PATH;
  }

  if (!fs.existsSync(targetPath)) {
    return {
      version: 1,
      updated_at: new Date().toISOString(),
      projects: {},
      packages: {},
      profiles: {},
    };
  }

  const raw = await fs.promises.readFile(targetPath, "utf-8");
  return JSON.parse(raw);
}

export async function getCatalogConfig(): Promise<CatalogConfig> {
  let targetPath = BUNDLED_CONFIG_PATH;

  if (isLocalEnvironment() && fs.existsSync(LOCAL_CONFIG_PATH)) {
    targetPath = LOCAL_CONFIG_PATH;
  }

  if (!fs.existsSync(targetPath)) {
    return {
      indexed_directories: ["/home/azterisk/Projects", "/home/azterisk/code"],
      critical_watch_packages: [
        "omarchy",
        "hyprland",
        "quickshell",
        "linux-wallpaperengine-git",
      ],
      staleness_threshold_days: 30,
      auto_scan: true,
    };
  }

  const raw = await fs.promises.readFile(targetPath, "utf-8");
  return JSON.parse(raw);
}

export async function saveCatalogConfig(config: CatalogConfig): Promise<boolean> {
  const jsonStr = JSON.stringify(config, null, 2);

  try {
    if (isLocalEnvironment()) {
      await fs.promises.writeFile(LOCAL_CONFIG_PATH, jsonStr, "utf-8");
    }
    // Also save to bundled path if writable
    if (fs.existsSync(path.dirname(BUNDLED_CONFIG_PATH))) {
      await fs.promises.writeFile(BUNDLED_CONFIG_PATH, jsonStr, "utf-8");
    }
    return true;
  } catch (err) {
    console.error("Failed to save catalog config:", err);
    return false;
  }
}

export async function computeWorkspaceStats(catalog: CatalogData): Promise<WorkspaceStats> {
  const projects = Object.values(catalog.projects);
  const packages = Object.values(catalog.packages);

  const drifted = projects.filter((p) => p.is_drifted).length;
  const unpinned = projects.filter((p) => !p.is_pinned && p.pkgbuild_path).length;
  const missing = packages.filter((p) => !p.installed).length;
  const clean = projects.filter((p) => !p.is_drifted && (p.is_pinned || !p.pkgbuild_path)).length;

  const ecosystem_counts: Record<string, number> = {};
  for (const p of projects) {
    const eco = p.ecosystem || "other";
    ecosystem_counts[eco] = (ecosystem_counts[eco] || 0) + 1;
  }

  // Calculate health score (0 - 100)
  const total = projects.length || 1;
  const penalty = (drifted * 5) + (unpinned * 3) + (missing * 4);
  const health_score = Math.max(0, Math.min(100, Math.round(100 - (penalty / total) * 20)));

  return {
    total_projects: projects.length,
    total_packages: packages.length,
    drifted_projects: drifted,
    unpinned_projects: unpinned,
    missing_packages: missing,
    clean_projects: clean,
    ecosystem_counts,
    health_score,
    is_local_environment: isLocalEnvironment(),
    last_updated: catalog.updated_at,
  };
}

export async function triggerRescan(): Promise<{ success: boolean; message: string }> {
  if (!isLocalEnvironment()) {
    return {
      success: false,
      message: "Workspace re-scan is only available in local Linux environment.",
    };
  }

  try {
    const config = await getCatalogConfig();
    const dirsArg = config.indexed_directories.join(",");
    const { stdout, stderr } = await execAsync(
      `omarchy-catalog scan --projects-dir="${dirsArg}"`
    );
    return { success: true, message: stdout.trim() || stderr.trim() };
  } catch (err: any) {
    return { success: false, message: err.message || "Scan failed" };
  }
}

export async function triggerSync(projectName?: string): Promise<{ success: boolean; message: string }> {
  if (!isLocalEnvironment()) {
    return {
      success: false,
      message: "PKGBUILD commit sync is only available in local Linux environment.",
    };
  }

  try {
    const cmd = projectName ? `omarchy-catalog sync "${projectName}"` : `omarchy-catalog sync --all`;
    const { stdout, stderr } = await execAsync(cmd);
    return { success: true, message: stdout.trim() || stderr.trim() };
  } catch (err: any) {
    return { success: false, message: err.message || "Sync failed" };
  }
}
