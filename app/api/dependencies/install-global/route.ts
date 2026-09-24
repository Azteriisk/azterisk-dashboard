import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { isLocalEnvironment, triggerRescan } from "@/lib/catalog";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { success: false, error: "Global installations are only available in the local Linux environment." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let items: Array<{ name: string; ecosystem: string; command?: string }> = [];

    if (Array.isArray(body.packages) && body.packages.length > 0) {
      items = body.packages
        .map((p: any) => {
          if (typeof p === "string") {
            return { name: p.trim(), ecosystem: "npm" };
          }
          return {
            name: (p.name || p.package_name || "").trim(),
            ecosystem: (p.ecosystem || p.pkg_type || "npm").toLowerCase().trim(),
            command: p.command?.trim(),
          };
        })
        .filter((p: any) => p.name.length > 0);
    } else if (body.package_name) {
      items = [
        {
          name: body.package_name.trim(),
          ecosystem: (body.ecosystem || "npm").toLowerCase().trim(),
          command: body.command?.trim(),
        },
      ];
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No package(s) provided for global installation." },
        { status: 400 }
      );
    }

    // Group items by ecosystem
    const byEcosystem: Record<string, string[]> = {};
    for (const item of items) {
      let eco = item.ecosystem;
      if (eco === "node") eco = "npm";
      if (eco === "pypi" || eco === "python") eco = "pip";
      if (eco === "rust") eco = "cargo";
      if (eco === "arch" || eco === "aur") eco = "pacman";

      if (!byEcosystem[eco]) byEcosystem[eco] = [];
      if (!byEcosystem[eco].includes(item.name)) {
        byEcosystem[eco].push(item.name);
      }
    }

    const installed: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];
    const executedCommands: string[] = [];
    const authRequiredCommands: string[] = [];

    // 1. Process NPM / Node packages in efficient batch
    if (byEcosystem["npm"] && byEcosystem["npm"].length > 0) {
      const npmPkgs = byEcosystem["npm"];
      const batchCmd = `bun add -g ${npmPkgs.join(" ")}`;
      try {
        await execAsync(batchCmd, { timeout: 90000 });
        executedCommands.push(batchCmd);
        installed.push(...npmPkgs);
      } catch {
        // Fallback: try individual installs
        for (const pkg of npmPkgs) {
          try {
            await execAsync(`bun add -g ${pkg}`, { timeout: 45000 });
            installed.push(pkg);
          } catch {
            try {
              await execAsync(`npm install -g ${pkg}`, { timeout: 45000 });
              installed.push(pkg);
            } catch (err: any) {
              failed.push({ name: pkg, error: err.stderr || err.message || "Failed to install via bun/npm" });
            }
          }
        }
      }
    }

    // 2. Process Python / Pip packages
    if (byEcosystem["pip"] && byEcosystem["pip"].length > 0) {
      const pipPkgs = byEcosystem["pip"];
      for (const pkg of pipPkgs) {
        try {
          await execAsync(`pipx install ${pkg}`, { timeout: 60000 });
          installed.push(pkg);
        } catch {
          try {
            await execAsync(`pip install --user ${pkg}`, { timeout: 45000 });
            installed.push(pkg);
          } catch (err: any) {
            failed.push({ name: pkg, error: err.stderr || err.message || "Failed to install via pip" });
          }
        }
      }
    }

    // 3. Process Cargo / Rust packages
    if (byEcosystem["cargo"] && byEcosystem["cargo"].length > 0) {
      const cargoPkgs = byEcosystem["cargo"];
      for (const pkg of cargoPkgs) {
        try {
          await execAsync(`cargo install ${pkg}`, { timeout: 90000 });
          installed.push(pkg);
        } catch (err: any) {
          failed.push({ name: pkg, error: err.stderr || err.message || "Cargo global install failed" });
        }
      }
    }

    // 4. Process Pacman / Arch / AUR packages
    if (byEcosystem["pacman"] && byEcosystem["pacman"].length > 0) {
      const pacmanPkgs = byEcosystem["pacman"];
      const pacmanCmd = `sudo -n pacman -S --needed --noconfirm ${pacmanPkgs.join(" ")}`;
      const userCmd = `yay -S --needed ${pacmanPkgs.join(" ")}`;

      try {
        await execAsync("sudo -n true", { timeout: 3000 });
        await execAsync(pacmanCmd, { timeout: 60000 });
        executedCommands.push(pacmanCmd);
        installed.push(...pacmanPkgs);
      } catch {
        authRequiredCommands.push(userCmd);
      }
    }

    // Trigger background catalog rescan to refresh package statuses
    try {
      await triggerRescan();
    } catch {
      // Ignore background rescan error
    }

    if (authRequiredCommands.length > 0 && installed.length === 0) {
      const combinedCmd = authRequiredCommands.join(" && ");
      return NextResponse.json({
        success: false,
        requires_auth: true,
        command: combinedCmd,
        installed,
        failed,
        message: `Root authorization required — command copied to clipboard for your terminal!`,
      });
    }

    const messages = [];
    if (installed.length > 0) {
      messages.push(`Successfully installed ${installed.length} package(s) globally.`);
    }
    if (authRequiredCommands.length > 0) {
      messages.push(`Pacman packages require sudo ('${authRequiredCommands.join(" && ")}' copied to clipboard).`);
    }
    if (failed.length > 0) {
      messages.push(`${failed.length} package(s) encountered errors.`);
    }

    return NextResponse.json({
      success: installed.length > 0 || authRequiredCommands.length === 0,
      requires_auth: authRequiredCommands.length > 0,
      command: authRequiredCommands.join(" && ") || undefined,
      installed,
      failed,
      message: messages.join(" ") || "Batch installation completed.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
