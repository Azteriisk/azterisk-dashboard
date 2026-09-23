import { NextRequest, NextResponse } from "next/server";
import { triggerSync, triggerRescan, isLocalEnvironment } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    if (!isLocalEnvironment()) {
      return NextResponse.json(
        {
          success: false,
          error: "Synchronization actions are only executable in the local Linux environment.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const projectName = body.project?.trim();
    const isAll = body.all === true;

    let res;
    if (isAll) {
      res = await triggerSync();
    } else if (projectName) {
      res = await triggerSync(projectName);
    } else {
      // Re-scan only
      res = await triggerRescan();
    }

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
