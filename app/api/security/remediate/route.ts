import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { getCatalogData, triggerSecurityScan, isLocalEnvironment } from "@/lib/catalog";

const execAsync = promisify(exec);

interface RemediationItem {
  package_name: string;
  project_name?: string;
  affected_projects?: string[];
  ecosystem: string;
  installed_version?: string | null;
  fixed_version?: string | null;
  command?: string | null;
}

interface ItemResult {
  package_name: string;
  success: boolean;
  message: string;
  executed_commands: string[];
  projects_updated: string[];
  updated_manifest: boolean;
}

async function isCommandAvailable(cmd: string): Promise<boolean> {
  try {
    await execAsync(`which ${cmd}`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function remediateSingleItem(
  item: RemediationItem,
  catalog: any
): Promise<ItemResult> {
  const packageName = item.package_name.trim();
  const ecosystem = (item.ecosystem || "").toLowerCase();
  const fixedVersion = item.fixed_version?.trim() || "";
  const customCommand = item.command?.trim();

  // Determine all target project names
  let targetProjects: string[] = [];
  if (item.affected_projects && item.affected_projects.length > 0) {
    targetProjects = [...item.affected_projects];
  } else if (item.project_name) {
    targetProjects = [item.project_name];
  } else {
    const pkgEntry = catalog.packages?.[packageName];
    if (pkgEntry?.required_by?.length) {
      targetProjects = [...pkgEntry.required_by];
    }
  }

  targetProjects = Array.from(new Set(targetProjects));

  const executedCommands: string[] = [];
  const projectsUpdated: string[] = [];
  let updatedManifestAny = false;
  let hadAnyFailure = false;
  let lastErrorMessage = "";

  if (targetProjects.length === 0) {
    if (customCommand) {
      try {
        await execAsync(customCommand, { timeout: 45000 });
        executedCommands.push(customCommand);
        return {
          package_name: packageName,
          success: true,
          message: `Executed custom command for ${packageName}.`,
          executed_commands: executedCommands,
          projects_updated: [],
          updated_manifest: false,
        };
      } catch (err: any) {
        return {
          package_name: packageName,
          success: false,
          message: err.stderr || err.message || "Failed to execute custom remediation command.",
          executed_commands: [customCommand],
          projects_updated: [],
          updated_manifest: false,
        };
      }
    }

    return {
      package_name: packageName,
      success: false,
      message: `No target project directories found for ${packageName}.`,
      executed_commands: [],
      projects_updated: [],
      updated_manifest: false,
    };
  }

  for (const projName of targetProjects) {
    const project = catalog.projects?.[projName];
    const projectDir = project?.path;
    if (!projectDir) continue;

    let projManifestUpdated = false;

    // -------------------------------------------------------------
    // 1. Python / Pip Ecosystem
    // -------------------------------------------------------------
    if (ecosystem === "pip" || ecosystem === "pypi") {
      const reqFile = path.join(projectDir, "requirements.txt");
      const pyprojectFile = path.join(projectDir, "pyproject.toml");

      try {
        const content = await fs.readFile(reqFile, "utf-8");
        const lines = content.split("\n");
        let modified = false;

        const updatedLines = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith(`${packageName}==`) || trimmed.startsWith(`${packageName}>=`)) {
            modified = true;
            return fixedVersion ? `${packageName}>=${fixedVersion}` : packageName;
          }
          return line;
        });

        if (modified) {
          await fs.writeFile(reqFile, updatedLines.join("\n"), "utf-8");
          projManifestUpdated = true;
          updatedManifestAny = true;
        }
      } catch {
        // requirements.txt might not exist, check pyproject.toml
        try {
          const pyContent = await fs.readFile(pyprojectFile, "utf-8");
          const lines = pyContent.split("\n");
          let modified = false;
          const updatedLines = lines.map((line) => {
            if (line.includes(`"${packageName}`) || line.includes(`'${packageName}`)) {
              modified = true;
              return fixedVersion
                ? line.replace(new RegExp(`["']${packageName}[><=\\w.-]*["']`), `"${packageName}>=${fixedVersion}"`)
                : line;
            }
            return line;
          });
          if (modified) {
            await fs.writeFile(pyprojectFile, updatedLines.join("\n"), "utf-8");
            projManifestUpdated = true;
            updatedManifestAny = true;
          }
        } catch {
          // No pyproject.toml either
        }
      }

      const hasPip = await isCommandAvailable("pip");
      if (hasPip) {
        const pipCmd = fixedVersion
          ? `pip install --upgrade '${packageName}>=${fixedVersion}'`
          : `pip install --upgrade ${packageName}`;

        try {
          await execAsync(pipCmd, { cwd: projectDir, timeout: 35000 });
          executedCommands.push(`${pipCmd} (${projName})`);
          projectsUpdated.push(projName);
        } catch (err: any) {
          if (projManifestUpdated) {
            executedCommands.push(`Manifest pinned to >=${fixedVersion} (${projName})`);
            projectsUpdated.push(projName);
          } else {
            hadAnyFailure = true;
            lastErrorMessage = err.stderr || err.message || `pip upgrade failed in ${projName}`;
          }
        }
      } else {
        if (projManifestUpdated) {
          executedCommands.push(`Manifest pinned to >=${fixedVersion} [pip not installed] (${projName})`);
          projectsUpdated.push(projName);
        } else {
          hadAnyFailure = true;
          lastErrorMessage = `Python pip is not installed on host ('sudo pacman -S python-pip' recommended).`;
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Node.js / npm Ecosystem
    // -------------------------------------------------------------
    else if (ecosystem === "npm" || ecosystem === "node") {
      const cleanFixed = fixedVersion ? fixedVersion.replace(/^[\^~>=v\s]+/, "") : "";
      const pkgJsonFile = path.join(projectDir, "package.json");

      // 1. Update package.json manifest directly
      try {
        const content = await fs.readFile(pkgJsonFile, "utf-8");
        const pkgJson = JSON.parse(content);
        let modified = false;

        if (pkgJson.dependencies?.[packageName]) {
          pkgJson.dependencies[packageName] = cleanFixed ? `^${cleanFixed}` : "latest";
          modified = true;
        }
        if (pkgJson.devDependencies?.[packageName]) {
          pkgJson.devDependencies[packageName] = cleanFixed ? `^${cleanFixed}` : "latest";
          modified = true;
        }

        if (modified) {
          await fs.writeFile(pkgJsonFile, JSON.stringify(pkgJson, null, 2) + "\n", "utf-8");
          projManifestUpdated = true;
          updatedManifestAny = true;
        }
      } catch {
        // package.json might not exist or be invalid JSON
      }

      // 2. Install / resolve via Bun or npm
      const hasBun = await isCommandAvailable("bun");
      const hasNpm = await isCommandAvailable("npm");

      let nodeCmd = "";
      if (hasBun) {
        nodeCmd = cleanFixed ? `bun add ${packageName}@^${cleanFixed}` : `bun update ${packageName}`;
      } else if (hasNpm) {
        nodeCmd = cleanFixed ? `npm install ${packageName}@^${cleanFixed}` : `npm update ${packageName}`;
      }

      if (nodeCmd) {
        try {
          await execAsync(nodeCmd, { cwd: projectDir, timeout: 60000 });
          executedCommands.push(`${nodeCmd} (${projName})`);
          projectsUpdated.push(projName);
        } catch (err: any) {
          // If bun add failed (e.g. lockfile or peer dep issue), fallback to bun install if manifest was updated
          if (hasBun && projManifestUpdated) {
            try {
              await execAsync("bun install", { cwd: projectDir, timeout: 60000 });
              executedCommands.push(`bun install [package.json updated to ^${cleanFixed}] (${projName})`);
              projectsUpdated.push(projName);
            } catch {
              executedCommands.push(`package.json updated to ^${cleanFixed} (${projName})`);
              projectsUpdated.push(projName);
            }
          } else if (projManifestUpdated) {
            executedCommands.push(`package.json updated to ^${cleanFixed} (${projName})`);
            projectsUpdated.push(projName);
          } else {
            hadAnyFailure = true;
            lastErrorMessage = err.stderr || err.message || `Update failed in ${projName}`;
          }
        }
      } else if (projManifestUpdated) {
        executedCommands.push(`package.json updated to ^${cleanFixed} [Node PM not installed] (${projName})`);
        projectsUpdated.push(projName);
      } else {
        hadAnyFailure = true;
        lastErrorMessage = `No Node package manager (bun/npm) found and package.json could not be modified.`;
      }
    }

    // -------------------------------------------------------------
    // 3. Rust / Cargo Ecosystem
    // -------------------------------------------------------------
    else if (ecosystem === "cargo" || ecosystem === "rust") {
      if (!fixedVersion) {
        hadAnyFailure = true;
        lastErrorMessage = `No upstream patch or fixed version released yet for ${packageName}.`;
      } else {
        const hasCargo = await isCommandAvailable("cargo");

        if (hasCargo) {
          let cargoCmd = `cargo update -p ${packageName}`;
          try {
            await execAsync(cargoCmd, { cwd: projectDir, timeout: 45000 });
            executedCommands.push(`${cargoCmd} (${projName})`);
            projectsUpdated.push(projName);
          } catch (err: any) {
            // If error is ambiguous (e.g. rand), try specifying installed version
            const installedVer = item.installed_version;
            if (installedVer) {
              const specificCmd = `cargo update -p ${packageName}@${installedVer}`;
              try {
                await execAsync(specificCmd, { cwd: projectDir, timeout: 45000 });
                executedCommands.push(`${specificCmd} (${projName})`);
                projectsUpdated.push(projName);
              } catch (err2: any) {
                hadAnyFailure = true;
                lastErrorMessage = err2.stderr || err2.message || `cargo update failed in ${projName}`;
              }
            } else {
              hadAnyFailure = true;
              lastErrorMessage = err.stderr || err.message || `cargo update failed in ${projName}`;
            }
          }
        } else {
          // Direct Cargo.toml pinning fallback when Cargo CLI is not installed
          const cargoTomlFile = path.join(projectDir, "Cargo.toml");
          try {
            const content = await fs.readFile(cargoTomlFile, "utf-8");
            const lines = content.split("\n");
            let modified = false;
            const cleanFixed = fixedVersion.replace(/^v/, "");

            const updatedLines = lines.map((line) => {
              const trimmed = line.trim();
              if (trimmed.startsWith(`${packageName} =`) || trimmed.startsWith(`${packageName}=`)) {
                modified = true;
                if (cleanFixed) {
                  if (line.includes(`version = "`)) {
                    return line.replace(/version\s*=\s*"[^"]+"/, `version = ">=${cleanFixed}"`);
                  } else {
                    return line.replace(/=\s*"[^"]+"/, `= ">=${cleanFixed}"`);
                  }
                }
              }
              return line;
            });

            if (modified) {
              await fs.writeFile(cargoTomlFile, updatedLines.join("\n"), "utf-8");
              projManifestUpdated = true;
              updatedManifestAny = true;
              executedCommands.push(`Cargo.toml pinned to >=${cleanFixed} [Cargo CLI not installed on host] (${projName})`);
              projectsUpdated.push(projName);
            } else {
              hadAnyFailure = true;
              lastErrorMessage = `Cargo CLI is not installed on host ('sudo pacman -S rust' recommended).`;
            }
          } catch {
            hadAnyFailure = true;
            lastErrorMessage = `Cargo CLI is not installed on host ('sudo pacman -S rust' recommended).`;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 4. Go Ecosystem
    // -------------------------------------------------------------
    else if (ecosystem === "go") {
      // First, directly update go.mod if present
      const goModFile = path.join(projectDir, "go.mod");
      let goModModified = false;
      try {
        const content = await fs.readFile(goModFile, "utf-8");
        const lines = content.split("\n");
        const cleanFixed = fixedVersion.replace(/^v/, "");

        const updatedLines = lines.map((line) => {
          if (line.includes(packageName)) {
            // e.g. "require golang.org/x/image v0.19.0" or "golang.org/x/image v0.19.0 // indirect"
            goModModified = true;
            if (cleanFixed) {
              return line.replace(/v\d+\.\d+\.\d+([-\w.]*)/, `v${cleanFixed}`);
            }
          }
          return line;
        });

        if (goModModified) {
          await fs.writeFile(goModFile, updatedLines.join("\n"), "utf-8");
          projManifestUpdated = true;
          updatedManifestAny = true;
        }
      } catch {
        // go.mod not found
      }

      const hasGo = await isCommandAvailable("go");
      if (hasGo) {
        const cleanFixed = fixedVersion.replace(/^v/, "");
        const goCmd = cleanFixed
          ? `go get ${packageName}@v${cleanFixed}`
          : `go get -u ${packageName}`;
        try {
          await execAsync(goCmd, { cwd: projectDir, timeout: 45000 });
          executedCommands.push(`${goCmd} (${projName})`);
          projectsUpdated.push(projName);
        } catch (err: any) {
          if (projManifestUpdated) {
            executedCommands.push(`go.mod updated to v${cleanFixed} (${projName})`);
            projectsUpdated.push(projName);
          } else {
            hadAnyFailure = true;
            lastErrorMessage = err.stderr || err.message || `go get failed in ${projName}`;
          }
        }
      } else {
        if (projManifestUpdated) {
          const cleanFixed = fixedVersion.replace(/^v/, "");
          executedCommands.push(`go.mod pinned to v${cleanFixed} [Go CLI not installed on host] (${projName})`);
          projectsUpdated.push(projName);
        } else {
          hadAnyFailure = true;
          lastErrorMessage = `Go toolchain is not installed on host system ('sudo pacman -S go' recommended).`;
        }
      }
    }

    // -------------------------------------------------------------
    // 5. Fallback or Custom Command
    // -------------------------------------------------------------
    else if (customCommand && /^(bun|npm|pnpm|yarn|cargo|pip|pip3|go|paru|pacman)\b/.test(customCommand)) {
      try {
        await execAsync(customCommand, { cwd: projectDir, timeout: 45000 });
        executedCommands.push(`${customCommand} (${projName})`);
        projectsUpdated.push(projName);
      } catch (err: any) {
        hadAnyFailure = true;
        lastErrorMessage = err.stderr || err.message || `Custom command failed in ${projName}`;
      }
    } else if (!fixedVersion) {
      hadAnyFailure = true;
      lastErrorMessage = `No upstream patch or fixed version released yet for ${packageName}.`;
    }
  }

  const success = projectsUpdated.length > 0 || updatedManifestAny;
  let finalMessage = "";
  if (success) {
    let toolchainNotice = "";
    if (ecosystem === "go" && !(await isCommandAvailable("go"))) {
      toolchainNotice = " (manifest pinned; Go CLI not installed on host — 'sudo pacman -S go' recommended)";
    } else if ((ecosystem === "pip" || ecosystem === "pypi") && !(await isCommandAvailable("pip"))) {
      toolchainNotice = " (manifest pinned; pip not installed on host — 'sudo pacman -S python-pip' recommended)";
    } else if ((ecosystem === "cargo" || ecosystem === "rust") && !(await isCommandAvailable("cargo"))) {
      toolchainNotice = " (manifest pinned; cargo not installed on host — 'sudo pacman -S rust' recommended)";
    } else if (updatedManifestAny) {
      toolchainNotice = " (manifest pinned)";
    }

    finalMessage = `Updated ${packageName} in ${projectsUpdated.length} project(s)${toolchainNotice}.`;
  } else {
    finalMessage = lastErrorMessage || `Failed to update ${packageName}.`;
  }

  return {
    package_name: packageName,
    success,
    message: finalMessage,
    executed_commands: executedCommands,
    projects_updated: projectsUpdated,
    updated_manifest: updatedManifestAny,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { success: false, error: "Remediation actions are only available in the local Linux environment." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Normalize input to an array of items
    let rawItems: RemediationItem[] = [];
    if (Array.isArray(body.items)) {
      rawItems = body.items;
    } else if (body.package_name) {
      rawItems = [body];
    } else {
      return NextResponse.json(
        { success: false, error: "No package_name or items provided for remediation." },
        { status: 400 }
      );
    }

    const validItems = rawItems.filter((i) => i && i.package_name && i.package_name.trim().length > 0);
    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid packages specified." },
        { status: 400 }
      );
    }

    const catalog = await getCatalogData();
    const results: ItemResult[] = [];

    for (const item of validItems) {
      const res = await remediateSingleItem(item, catalog);
      results.push(res);
    }

    // Trigger security scan ONCE at the end of the batch
    try {
      await triggerSecurityScan();
    } catch {
      // Non-fatal if scan fails
    }

    const succeededCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Single item backwards compatibility
    if (validItems.length === 1 && !Array.isArray(body.items)) {
      const single = results[0];
      return NextResponse.json({
        success: single.success,
        message: single.message,
        executed_command: single.executed_commands.join("; "),
        updated_manifest: single.updated_manifest,
        results,
      });
    }

    return NextResponse.json({
      success: succeededCount > 0,
      total: validItems.length,
      succeeded: succeededCount,
      failed: failedCount,
      message: `Batch remediation finished: ${succeededCount} succeeded, ${failedCount} failed.`,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
