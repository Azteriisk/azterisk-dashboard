import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { isLocalEnvironment, triggerRescan } from "@/lib/catalog";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        {
          success: false,
          error: "Package installation is only available in the local Linux environment.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let packageNames: string[] = [];

    if (body.packages && Array.isArray(body.packages)) {
      packageNames = body.packages;
    } else if (body.package_name && typeof body.package_name === "string") {
      packageNames = [body.package_name];
    }

    // Filter and sanitize
    const sanitizedNames = packageNames
      .map((p) => p.trim())
      .filter((p) => /^[a-zA-Z0-9_\-\.\+]+$/.test(p));

    if (sanitizedNames.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid package names provided." },
        { status: 400 }
      );
    }

    const yayCommand = `yay -S --needed ${sanitizedNames.join(" ")}`;

    // Instantly check if non-interactive sudo is available
    let hasSudo = false;
    try {
      await execAsync("sudo -n true 2>/dev/null", { timeout: 2000 });
      hasSudo = true;
    } catch {
      hasSudo = false;
    }

    if (!hasSudo) {
      return NextResponse.json({
        success: false,
        requires_sudo: true,
        command: yayCommand,
        message: "Root authorization required. Run the command in your terminal.",
      });
    }

    const cmd = `yay -S --needed --noconfirm ${sanitizedNames.join(" ")}`;

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
      // Re-scan catalog after successful installation
      await triggerRescan();

      return NextResponse.json({
        success: true,
        message: `Successfully installed ${sanitizedNames.join(", ")} and updated catalog.`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    } catch (err: any) {
      const errMsg = (err.stderr || err.message || "").toString();
      const requiresSudo =
        errMsg.includes("password is required") ||
        errMsg.includes("sudo: a password is required") ||
        errMsg.includes("root privileges") ||
        err.code === 1;

      return NextResponse.json({
        success: false,
        requires_sudo: requiresSudo,
        command: yayCommand,
        message: requiresSudo
          ? "Root authorization required. Run the command in your terminal."
          : errMsg || "Failed to install packages.",
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
