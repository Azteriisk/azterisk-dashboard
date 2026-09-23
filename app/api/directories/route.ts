import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCatalogConfig, saveCatalogConfig, triggerRescan, isLocalEnvironment } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getCatalogConfig();
    return NextResponse.json({
      directories: config.indexed_directories,
      is_local: isLocalEnvironment(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let newDir = body.directory?.trim();

    if (!newDir) {
      return NextResponse.json({ error: "Directory path is required" }, { status: 400 });
    }

    // Expand ~ to HOME if local
    if (newDir.startsWith("~")) {
      const home = process.env.HOME || "/home/azterisk";
      newDir = path.join(home, newDir.slice(1));
    }

    // Validate path existence in local environment
    if (isLocalEnvironment()) {
      if (!fs.existsSync(newDir)) {
        return NextResponse.json(
          { error: `Directory does not exist on disk: ${newDir}` },
          { status: 400 }
        );
      }
      const stat = fs.statSync(newDir);
      if (!stat.isDirectory()) {
        return NextResponse.json(
          { error: `Path is not a directory: ${newDir}` },
          { status: 400 }
        );
      }
    }

    const config = await getCatalogConfig();
    if (!config.indexed_directories.includes(newDir)) {
      config.indexed_directories.push(newDir);
      await saveCatalogConfig(config);

      // Trigger automatic background re-scan
      if (isLocalEnvironment()) {
        await triggerRescan();
      }
    }

    return NextResponse.json({
      success: true,
      directories: config.indexed_directories,
      message: `Added and indexed directory: ${newDir}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const dirToRemove = body.directory?.trim();

    if (!dirToRemove) {
      return NextResponse.json({ error: "Directory path is required" }, { status: 400 });
    }

    const config = await getCatalogConfig();
    const prevCount = config.indexed_directories.length;
    config.indexed_directories = config.indexed_directories.filter((d) => d !== dirToRemove);

    if (config.indexed_directories.length === prevCount) {
      return NextResponse.json({ error: "Directory not found in indexed list" }, { status: 404 });
    }

    await saveCatalogConfig(config);

    if (isLocalEnvironment()) {
      await triggerRescan();
    }

    return NextResponse.json({
      success: true,
      directories: config.indexed_directories,
      message: `Removed directory: ${dirToRemove}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
