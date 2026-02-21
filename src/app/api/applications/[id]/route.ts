import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/** GET /api/applications/[id] - Get a single application. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(app);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}

/** PUT /api/applications/[id] - Update an application. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(applications)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

/** DELETE /api/applications/[id] - Delete an application. */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
