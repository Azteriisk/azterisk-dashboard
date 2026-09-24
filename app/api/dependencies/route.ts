import { NextRequest, NextResponse } from "next/server";
import { getCatalogData, triggerRescan, isLocalEnvironment } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const catalog = await getCatalogData();
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const query = searchParams.get("q")?.toLowerCase();

    let packages = Object.values(catalog.packages);

    if (type && type !== "all") {
      packages = packages.filter((p) => p.pkg_type.toLowerCase() === type.toLowerCase());
    }

    if (statusParam === "missing") {
      packages = packages.filter((p) => !p.installed);
    } else if (statusParam === "installed") {
      packages = packages.filter((p) => p.installed);
    }

    if (query) {
      packages = packages.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.required_by.some((req) => req.toLowerCase().includes(query))
      );
    }

    // Sort by dependents count descending
    packages.sort((a, b) => b.required_by.length - a.required_by.length);

    return NextResponse.json({
      total: packages.length,
      packages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { error: "Workspace re-scanning is only available in local Linux environment." },
        { status: 403 }
      );
    }

    const result = await triggerRescan();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
