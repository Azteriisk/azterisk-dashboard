import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { getCatalogData, triggerSecurityScan, isLocalEnvironment } from "@/lib/catalog";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { success: false, error: "Remediation actions are only available in the local Linux environment." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packageName = body.package_name?.trim();
    const projectName = body.project_name?.trim();
    const ecosystem = (body.ecosystem || "").toLowerCase();
    const fixedVersion = body.fixed_version?.trim();
    const customCommand = body.command?.trim();

    if (!packageName) {
      return NextResponse.json(
        { success: false, error: "Package name is required for remediation." },
        { status: 400 }
      );
    }

    const catalog = await getCatalogData();
    const project = projectName ? catalog.projects[projectName] : null;
    const projectDir = project?.path;

    let executedCommand = "";
    let updatedManifest = false;

    // 1. Python / pip ecosystem
    if (ecosystem === "pip" || ecosystem === "pypi") {
      if (projectDir) {
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
            updatedManifest = true;
          }
        } catch {
          // No requirements.txt or couldn't read
        }
      }

      executedCommand = fixedVersion
        ? `pip install --upgrade '${packageName}>=${fixedVersion}'`
        : `pip install --upgrade ${packageName}`;

      try {
        await execAsync(executedCommand, { cwd: projectDir || undefined, timeout: 30000 });
      } catch (err: any) {
        // If system pip is externally managed, updating requirements.txt is still a success
        if (!updatedManifest) {
          return NextResponse.json({
            success: false,
            command: executedCommand,
            message: err.stderr || err.message || "Failed to run pip upgrade.",
          });
        }
      }
    }
    // 2. Node.js / npm ecosystem
    else if (ecosystem === "npm" || ecosystem === "node") {
      executedCommand = `bun update ${packageName}`;
      try {
        await execAsync(executedCommand, { cwd: projectDir || undefined, timeout: 45000 });
      } catch {
        // Fallback to npm
        executedCommand = `npm update ${packageName}`;
        try {
          await execAsync(executedCommand, { cwd: projectDir || undefined, timeout: 45000 });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            command: executedCommand,
            message: err.stderr || err.message || "Package update failed.",
          });
        }
      }
    }
    // 3. Rust / Cargo ecosystem
    else if (ecosystem === "cargo" || ecosystem === "rust") {
      executedCommand = `cargo update -p ${packageName}`;
      try {
        await execAsync(executedCommand, { cwd: projectDir || undefined, timeout: 45000 });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: err.stderr || err.message || "Cargo update failed.",
        });
      }
    }
    // 4. Go ecosystem
    else if (ecosystem === "go") {
      executedCommand = fixedVersion
        ? `go get ${packageName}@${fixedVersion}`
        : `go get -u ${packageName}`;
      try {
        await execAsync(executedCommand, { cwd: projectDir || undefined, timeout: 45000 });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: err.stderr || err.message || "Go get failed.",
        });
      }
    }
    // 5. Fallback or Custom Command
    else if (customCommand) {
      executedCommand = customCommand;
      try {
        await execAsync(customCommand, { cwd: projectDir || undefined, timeout: 45000 });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: err.stderr || err.message || "Command execution failed.",
        });
      }
    }

    // Refresh security audit after applying remediation
    await triggerSecurityScan();

    return NextResponse.json({
      success: true,
      message: `Successfully remediated ${packageName}${projectName ? ` in ${projectName}` : ""}.`,
      executed_command: executedCommand,
      updated_manifest: updatedManifest,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
