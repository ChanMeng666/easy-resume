import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { tailorService } from "@/lib/services/tailorService";

/** GET /api/tailor/[id] - Get a tailored resume. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tailored = await tailorService.getById(id);
    if (!tailored) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(tailored);
  } catch (error) {
    console.error("Error fetching tailored resume:", error);
    return NextResponse.json({ error: "Failed to fetch tailored resume" }, { status: 500 });
  }
}

/** DELETE /api/tailor/[id] - Delete a tailored resume. */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await tailorService.delete(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tailored resume:", error);
    return NextResponse.json({ error: "Failed to delete tailored resume" }, { status: 500 });
  }
}
