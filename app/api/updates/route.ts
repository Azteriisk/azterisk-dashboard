import { NextResponse } from "next/server";
import { getCatalogData } from "@/lib/catalog";
import { getCriticalWatchList } from "@/lib/updates-checker";

export async function GET() {
  try {
    const catalog = await getCatalogData();
    const criticalWatch = await getCriticalWatchList(catalog);

    const hasUpdates = criticalWatch.some((c) => c.status === "update_available");
    const hasDiverged = criticalWatch.some((c) => c.status === "diverged");

    return NextResponse.json({
      critical_watch: criticalWatch,
      has_updates: hasUpdates,
      has_diverged: hasDiverged,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
