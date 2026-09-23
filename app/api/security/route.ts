import { NextRequest, NextResponse } from "next/server";
import { getSecurityData, triggerSecurityScan, isLocalEnvironment } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSecurityData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        { error: "Security vulnerability scanning is only available in local Linux environment." },
        { status: 403 }
      );
    }

    const result = await triggerSecurityScan();
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
