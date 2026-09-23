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

async function remediateSingleItem(
  item: RemediationItem,
  catalog: any
): Promise<ItemResult> {
  const packageName = item.package_name.trim();
  const ecosystem = (item.ecosystem || "").toLowerCase();
  const fixedVersion = item.fixed_version?.trim();
  const customCommand = item.command?.trim();

  // Determine all target project names
  let targetProjects: string[] = [];
  if (item.affected_projects && item.affected_projects.length > 0) {
    targetProjects = [...item.affected_projects];
  } else if (item.project_name) {
    targetProjects = [item.project_name];
  } else {
    // Attempt lookup from catalog
    const pkgEntry = catalog.packages?.[packageName];
    if (pkgEntry?.required_by?.length) {
      targetProjects = [...pkgEntry.required_by];
    }
  }

  // Deduplicate target projects
  targetProjects = Array.from(new Set(targetProjects));

  const executedCommands: string[] = [];
  const projectsUpdated: string[] = [];
  let updatedManifestAny = false;
  let hadAnyFailure = false;
  let lastErrorMessage = "";

  if (targetProjects.length === 0) {
    // No target project detected, run fallback command if provided
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

    // 1. Python / Pip
    if (ecosystem === "pip" || ecosystem === "pypi") {
      const reqFile = path.join(projectDir, "requirements.txt");
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
        // requirements.txt might not exist
      }

      const pipCmd = fixedVersion
        ? `pip install --upgrade '${packageName}>=${fixedVersion}'`
        : `pip install --upgrade ${packageName}`;

      try {
        await execAsync(pipCmd, { cwd: projectDir, timeout: 35000 });
        executedCommands.push(`${pipCmd} (${projName})`);
        projectsUpdated.push(projName);
      } catch (err: any) {
        if (!projManifestUpdated) {
          hadAnyFailure = true;
          lastErrorMessage = err.stderr || err.message || `pip upgrade failed in ${projName}`;
        } else {
          executedCommands.push(`${pipCmd} [manifest updated] (${projName})`);
          projectsUpdated.push(projName);
        }
      }
    }
    // 2. Node.js / npm
    else if (ecosystem === "npm" || ecosystem === "node") {
      let nodeCmd = `bun update ${packageName}`;
      try {
        await execAsync(nodeCmd, { cwd: projectDir, timeout: 45000 });
        executedCommands.push(`${nodeCmd} (${projName})`);
        projectsUpdated.push(projName);
      } catch {
        nodeCmd = `npm update ${packageName}`;
        try {
          await execAsync(nodeCmd, { cwd: projectDir, timeout: 45000 });
          executedCommands.push(`${nodeCmd} (${projName})`);
          projectsUpdated.push(projName);
        } catch (err: any) {
          hadAnyFailure = true;
          lastErrorMessage = err.stderr || err.message || `npm/bun update failed in ${projName}`;
        }
      }
    }
    // 3. Rust / Cargo
    else if (ecosystem === "cargo" || ecosystem === "rust") {
      const cargoCmd = `cargo update -p ${packageName}`;
      try {
        await execAsync(cargoCmd, { cwd: projectDir, timeout: 45000 });
        executedCommands.push(`${cargoCmd} (${projName})`);
        projectsUpdated.push(projName);
      } catch (err: any) {
        hadAnyFailure = true;
        lastErrorMessage = err.stderr || err.message || `cargo update failed in ${projName}`;
      }
    }
    // 4. Go
    else if (ecosystem === "go") {
      const goCmd = fixedVersion
        ? `go get ${packageName}@${fixedVersion}`
        : `go get -u ${packageName}`;
      try {
        await execAsync(goCmd, { cwd: projectDir, timeout: 45000 });
        executedCommands.push(`${goCmd} (${projName})`);
        projectsUpdated.push(projName);
      } catch (err: any) {
        hadAnyFailure = true;
        lastErrorMessage = err.stderr || err.message || `go get failed in ${projName}`;
      }
    }
    // 5. Custom Command
    else if (customCommand) {
      try {
        await execAsync(customCommand, { cwd: projectDir, timeout: 45000 });
        executedCommands.push(`${customCommand} (${projName})`);
        projectsUpdated.push(projName);
      } catch (err: any) {
        hadAnyFailure = true;
        lastErrorMessage = err.stderr || err.message || `Custom command failed in ${projName}`;
      }
    }
  }

  const success = !hadAnyFailure || projectsUpdated.length > 0;
  return {
    package_name: packageName,
    success,
    message: success
      ? `Updated ${packageName} in ${projectsUpdated.length} project(s)${updatedManifestAny ? " (manifest pinned)" : ""}.`
      : lastErrorMessage || `Failed to update ${packageName}.`,
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
    await triggerSecurityScan();

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
