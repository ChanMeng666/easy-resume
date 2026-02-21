import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { db } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/** GET /api/applications - Get all applications for the current user. */
export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apps = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.updatedAt));

    return NextResponse.json(apps);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

/** POST /api/applications - Create a new application. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { company, position, jobDescriptionId, tailoredResumeId, status, notes } = await request.json();
    if (!company || !position) {
      return NextResponse.json({ error: "company and position are required" }, { status: 400 });
    }

    const [app] = await db
      .insert(applications)
      .values({
        userId: user.id,
        company,
        position,
        jobDescriptionId: jobDescriptionId || null,
        tailoredResumeId: tailoredResumeId || null,
        status: status || "draft",
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
