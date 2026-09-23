import { NextResponse } from "next/server";
import { getCatalogData, computeWorkspaceStats } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getCatalogData();
    const stats = await computeWorkspaceStats(catalog);
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
