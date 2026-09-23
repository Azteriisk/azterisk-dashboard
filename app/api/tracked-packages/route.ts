import { NextRequest, NextResponse } from "next/server";
import { getCatalogConfig, saveCatalogConfig, getCatalogData, isLocalEnvironment } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const DEFAULT_EXAMPLE_PACKAGES = [
  "omarchy",
  "hyprland",
  "quickshell",
  "linux-wallpaperengine-git",
];

export async function GET() {
  try {
    const config = await getCatalogConfig();
    const catalog = await getCatalogData();
    const packages = config.critical_watch_packages || DEFAULT_EXAMPLE_PACKAGES;

    // Get list of catalog package names as quick suggestions
    const available_packages = Object.keys(catalog.packages || {}).sort();

    return NextResponse.json({
      packages,
      available_packages,
      is_local: isLocalEnvironment(),
      default_examples: DEFAULT_EXAMPLE_PACKAGES,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pkgName = body.package?.trim().toLowerCase();

    if (!pkgName) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }

    const config = await getCatalogConfig();
    if (!config.critical_watch_packages) {
      config.critical_watch_packages = [...DEFAULT_EXAMPLE_PACKAGES];
    }

    if (config.critical_watch_packages.includes(pkgName)) {
      return NextResponse.json({
        message: `Package "${pkgName}" is already monitored.`,
        packages: config.critical_watch_packages,
      });
    }

    config.critical_watch_packages.push(pkgName);
    const saved = await saveCatalogConfig(config);

    if (!saved) {
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Added "${pkgName}" to tracked packages.`,
      packages: config.critical_watch_packages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const pkgName = body.package?.trim().toLowerCase();

    if (!pkgName) {
      return NextResponse.json({ error: "Package name is required" }, { status: 400 });
    }

    const config = await getCatalogConfig();
    if (!config.critical_watch_packages) {
      config.critical_watch_packages = [...DEFAULT_EXAMPLE_PACKAGES];
    }

    if (config.critical_watch_packages.length <= 1) {
      return NextResponse.json(
        { error: "Must keep at least one tracked package." },
        { status: 400 }
      );
    }

    config.critical_watch_packages = config.critical_watch_packages.filter(
      (p) => p.toLowerCase() !== pkgName
    );

    const saved = await saveCatalogConfig(config);

    if (!saved) {
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Removed "${pkgName}" from tracked packages.`,
      packages: config.critical_watch_packages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    let newPackages: string[] = [];
    if (body.reset_defaults) {
      newPackages = [...DEFAULT_EXAMPLE_PACKAGES];
    } else if (Array.isArray(body.packages)) {
      newPackages = body.packages
        .map((p: string) => (typeof p === "string" ? p.trim().toLowerCase() : ""))
        .filter(Boolean);
    } else {
      return NextResponse.json(
        { error: "Expected 'packages' array or 'reset_defaults: true'" },
        { status: 400 }
      );
    }

    if (newPackages.length === 0) {
      return NextResponse.json(
        { error: "Tracked packages list cannot be empty." },
        { status: 400 }
      );
    }

    const config = await getCatalogConfig();
    config.critical_watch_packages = Array.from(new Set(newPackages));
    const saved = await saveCatalogConfig(config);

    if (!saved) {
      return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: body.reset_defaults
        ? "Reset tracked packages to author example defaults."
        : "Updated tracked packages.",
      packages: config.critical_watch_packages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
