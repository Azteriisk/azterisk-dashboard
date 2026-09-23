import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { isLocalEnvironment } from "@/lib/catalog";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { success: false, error: "Global installations are only available in the local Linux environment." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packageName = body.package_name?.trim();
    const ecosystem = (body.ecosystem || "").toLowerCase();
    const customCommand = body.command?.trim();

    if (!packageName) {
      return NextResponse.json(
        { success: false, error: "Package name is required." },
        { status: 400 }
      );
    }

    let executedCommand = "";

    // 1. Node / npm ecosystem
    if (ecosystem === "npm" || ecosystem === "node") {
      executedCommand = `bun add -g ${packageName}`;
      try {
        await execAsync(executedCommand, { timeout: 45000 });
      } catch {
        executedCommand = `npm install -g ${packageName}`;
        try {
          await execAsync(executedCommand, { timeout: 45000 });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            command: executedCommand,
            message: err.stderr || err.message || "Failed to install package globally.",
          });
        }
      }
    }
    // 2. Python / Pip ecosystem
    else if (ecosystem === "pip" || ecosystem === "pypi") {
      executedCommand = `pipx install ${packageName}`;
      try {
        await execAsync(executedCommand, { timeout: 45000 });
      } catch {
        executedCommand = `pip install --user ${packageName}`;
        try {
          await execAsync(executedCommand, { timeout: 45000 });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            command: executedCommand,
            message: err.stderr || err.message || "Failed to install Python tool globally.",
          });
        }
      }
    }
    // 3. Rust / Cargo ecosystem
    else if (ecosystem === "cargo" || ecosystem === "rust") {
      executedCommand = `cargo install ${packageName}`;
      try {
        await execAsync(executedCommand, { timeout: 60000 });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: err.stderr || err.message || "Cargo global install failed.",
        });
      }
    }
    // 4. Arch / Pacman / Native
    else if (ecosystem === "pacman" || ecosystem === "arch" || ecosystem === "aur") {
      const pacmanCmd = `sudo -n pacman -S --needed --noconfirm ${packageName}`;
      const userCmd = `yay -S --needed ${packageName}`;

      // Check non-blocking sudo
      try {
        await execAsync("sudo -n true", { timeout: 3000 });
        await execAsync(pacmanCmd, { timeout: 45000 });
        executedCommand = pacmanCmd;
      } catch {
        return NextResponse.json({
          success: false,
          requires_auth: true,
          command: userCmd,
          message: `Root authorization required — run '${userCmd}' in terminal (copied to clipboard!).`,
        });
      }
    }
    // 5. Fallback or Custom Command
    else if (customCommand) {
      executedCommand = customCommand;
      try {
        await execAsync(customCommand, { timeout: 45000 });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: err.stderr || err.message || "Command execution failed.",
        });
      }
    } else {
      executedCommand = `bun add -g ${packageName}`;
      try {
        await execAsync(executedCommand, { timeout: 45000 });
      } catch {
        return NextResponse.json({
          success: false,
          command: executedCommand,
          message: `Unknown ecosystem '${ecosystem}'.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully installed ${packageName} globally on host system.`,
      command: executedCommand,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
