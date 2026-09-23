import { NextRequest, NextResponse } from "next/server";
import { getCatalogData } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  try {
    const catalog = await getCatalogData();
    const searchParams = req.nextUrl.searchParams;
    const ecosystem = searchParams.get("ecosystem");
    const status = searchParams.get("status");
    const query = searchParams.get("q")?.toLowerCase();

    let projects = Object.values(catalog.projects);

    if (ecosystem && ecosystem !== "all") {
      projects = projects.filter((p) => p.ecosystem.toLowerCase() === ecosystem.toLowerCase());
    }

    if (status) {
      if (status === "drifted") {
        projects = projects.filter((p) => p.is_drifted);
      } else if (status === "unpinned") {
        projects = projects.filter((p) => !p.is_pinned && p.pkgbuild_path);
      } else if (status === "synced") {
        projects = projects.filter((p) => !p.is_drifted && (p.is_pinned || !p.pkgbuild_path));
      }
    }

    if (query) {
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.manifest_id && p.manifest_id.toLowerCase().includes(query)) ||
          (p.pkgname && p.pkgname.toLowerCase().includes(query))
      );
    }

    // Sort projects: most recent commits at the top
    projects.sort((a, b) => {
      const timeA = a.git_commit_timestamp || 0;
      const timeB = b.git_commit_timestamp || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      total: projects.length,
      projects,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
