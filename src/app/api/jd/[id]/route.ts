import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { jdService } from "@/lib/services/jdService";

/** GET /api/jd/[id] - Get a single job description. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const jd = await jdService.getById(id);
    if (!jd) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(jd);
  } catch (error) {
    console.error("Error fetching JD:", error);
    return NextResponse.json({ error: "Failed to fetch job description" }, { status: 500 });
  }
}

/** DELETE /api/jd/[id] - Delete a job description. */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await jdService.delete(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting JD:", error);
    return NextResponse.json({ error: "Failed to delete job description" }, { status: 500 });
  }
}
