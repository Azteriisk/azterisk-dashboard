import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { isLocalEnvironment, getCatalogData, triggerRescan } from "@/lib/catalog";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`du -sb "${dirPath}" 2>/dev/null`);
    const size = parseInt(stdout.split("\t")[0], 10);
    return isNaN(size) ? 0 : size;
  } catch {
    return 0;
  }
}

function getGlobalNodeModulesPath(): string {
  const possiblePaths = [
    path.join(process.env.HOME || "/home/azterisk", ".cache", ".bun", "install", "global", "node_modules"),
    path.join(process.env.HOME || "/home/azterisk", ".bun", "install", "global", "node_modules"),
    "/usr/lib/node_modules",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return possiblePaths[0];
}

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { success: false, error: "Dependency deduplication is only available in the local Linux environment." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const catalog = await getCatalogData();
    const globalModulesDir = getGlobalNodeModulesPath();

    let targetPackageNames: string[] = [];

    if (body.all_shared) {
      targetPackageNames = Object.values(catalog.packages)
        .filter((p) => p.required_by && p.required_by.length >= 2)
        .map((p) => p.name);
    } else if (Array.isArray(body.packages) && body.packages.length > 0) {
      targetPackageNames = body.packages.map((p: any) =>
        typeof p === "string" ? p.trim() : (p.name || p.package_name || "").trim()
      ).filter(Boolean);
    } else if (body.package_name) {
      targetPackageNames = [body.package_name.trim()];
    }

    if (targetPackageNames.length === 0) {
      return NextResponse.json(
        { success: false, error: "No package(s) specified for deduplication." },
        { status: 400 }
      );
    }

    const packagesToProcess = targetPackageNames
      .map((name) => catalog.packages[name])
      .filter(Boolean);

    let totalBytesReclaimed = 0;
    let totalProjectsLinked = 0;
    const details: Array<{
      package: string;
      ecosystem: string;
      projects_linked: string[];
      bytes_reclaimed: number;
      formatted_space: string;
    }> = [];
    const authRequiredCommands: string[] = [];

    // Group packages by ecosystem
    const npmPackages = packagesToProcess.filter(
      (p) => (p.pkg_type || "npm").toLowerCase() === "npm" || (p.pkg_type || "").toLowerCase() === "node"
    );
    const pacmanPackages = packagesToProcess.filter(
      (p) => ["pacman", "arch", "aur"].includes((p.pkg_type || "").toLowerCase())
    );

    // 1. Ensure NPM packages exist globally via Bun
    if (npmPackages.length > 0) {
      const missingGlobalNpm = npmPackages.filter(
        (p) => !fs.existsSync(path.join(globalModulesDir, p.name))
      );

      if (missingGlobalNpm.length > 0) {
        const batchAddCmd = `bun add -g ${missingGlobalNpm.map((p) => p.name).join(" ")}`;
        try {
          await execAsync(batchAddCmd, { timeout: 90000 });
        } catch {
          // Fallback: try individual installs
          for (const pkg of missingGlobalNpm) {
            try {
              await execAsync(`bun add -g ${pkg.name}`, { timeout: 45000 });
            } catch {
              try {
                await execAsync(`npm install -g ${pkg.name}`, { timeout: 45000 });
              } catch {
                // Ignore individual global install error
              }
            }
          }
        }
      }
    }

    // 2. Pacman packages: verify system-wide installation (or request sudo)
    if (pacmanPackages.length > 0) {
      const uninstalledPacman = pacmanPackages.filter((p) => !p.installed);
      if (uninstalledPacman.length > 0) {
        const pkgsStr = uninstalledPacman.map((p) => p.name).join(" ");
        const pacmanCmd = `sudo -n pacman -S --needed --noconfirm ${pkgsStr}`;
        const userCmd = `yay -S --needed ${pkgsStr}`;

        try {
          await execAsync("sudo -n true", { timeout: 3000 });
          await execAsync(pacmanCmd, { timeout: 60000 });
        } catch {
          authRequiredCommands.push(userCmd);
        }
      }
    }

    // 3. For each NPM package: link projects and remove duplicates to reclaim disk space
    for (const pkg of npmPackages) {
      const globalPkgPath = path.join(globalModulesDir, pkg.name);
      if (!fs.existsSync(globalPkgPath)) {
        continue;
      }

      let pkgBytesReclaimed = 0;
      const linkedProjects: string[] = [];

      for (const projName of pkg.required_by || []) {
        const project = catalog.projects[projName];
        if (!project || !project.path || !fs.existsSync(project.path)) {
          continue;
        }

        const projectNodeModules = path.join(project.path, "node_modules");
        const targetLinkPath = path.join(projectNodeModules, pkg.name);

        try {
          // If node_modules folder exists in project
          if (!fs.existsSync(projectNodeModules)) {
            await fs.promises.mkdir(projectNodeModules, { recursive: true });
          }

          let isAlreadyLinked = false;
          if (fs.existsSync(targetLinkPath) || fs.lstatSync(targetLinkPath, { throwIfNoEntry: false })) {
            const stat = fs.lstatSync(targetLinkPath, { throwIfNoEntry: false });
            if (stat && stat.isSymbolicLink()) {
              const currentTarget = await fs.promises.readlink(targetLinkPath).catch(() => "");
              if (currentTarget === globalPkgPath || path.resolve(path.dirname(targetLinkPath), currentTarget) === globalPkgPath) {
                isAlreadyLinked = true;
              } else {
                await fs.promises.unlink(targetLinkPath);
              }
            } else if (stat && stat.isDirectory()) {
              // Measure size before removing duplicate directory
              const dirSize = await getDirectorySize(targetLinkPath);
              pkgBytesReclaimed += dirSize;
              totalBytesReclaimed += dirSize;

              // Remove the duplicate directory completely
              await fs.promises.rm(targetLinkPath, { recursive: true, force: true });
            }
          }

          if (!isAlreadyLinked) {
            // Ensure parent directory exists (for scoped packages like @types/...)
            await fs.promises.mkdir(path.dirname(targetLinkPath), { recursive: true });
            // Create symlink to global copy
            await fs.promises.symlink(globalPkgPath, targetLinkPath, "dir");
            linkedProjects.push(projName);
            totalProjectsLinked++;
          }
        } catch (linkErr: any) {
          console.error(`Failed to link ${pkg.name} in project ${projName}:`, linkErr);
        }
      }

      details.push({
        package: pkg.name,
        ecosystem: pkg.pkg_type,
        projects_linked: linkedProjects,
        bytes_reclaimed: pkgBytesReclaimed,
        formatted_space: formatBytes(pkgBytesReclaimed),
      });
    }

    // Trigger workspace catalog rescan in the background
    try {
      await triggerRescan();
    } catch {
      // Ignore background rescan error
    }

    const formattedSpace = formatBytes(totalBytesReclaimed);

    let message = `Deduplication complete: linked ${totalProjectsLinked} project instance(s) and freed ${formattedSpace} of disk space!`;
    if (authRequiredCommands.length > 0) {
      message += ` Root authorization needed for Arch packages ('${authRequiredCommands.join(" && ")}' copied to clipboard).`;
    }

    return NextResponse.json({
      success: true,
      packages_processed: packagesToProcess.length,
      projects_linked: totalProjectsLinked,
      bytes_reclaimed: totalBytesReclaimed,
      formatted_space: formattedSpace,
      requires_auth: authRequiredCommands.length > 0,
      command: authRequiredCommands.join(" && ") || undefined,
      details,
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
