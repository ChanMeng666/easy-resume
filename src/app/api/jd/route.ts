import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { jdService } from "@/lib/services/jdService";
import { parseJobDescription } from "@/lib/agent/jd-parser";

/** GET /api/jd - Get all job descriptions for the current user. */
export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jds = await jdService.getByUser(user.id);
    return NextResponse.json(jds);
  } catch (error) {
    console.error("Error fetching JDs:", error);
    return NextResponse.json({ error: "Failed to fetch job descriptions" }, { status: 500 });
  }
}

/** POST /api/jd - Parse and save a new job description. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rawText, sourceUrl } = await request.json();
    if (!rawText) return NextResponse.json({ error: "rawText is required" }, { status: 400 });

    const parsed = await parseJobDescription(rawText);
    const jd = await jdService.create({
      userId: user.id,
      rawText,
      sourceUrl: sourceUrl || null,
      parsed,
    });

    return NextResponse.json(jd, { status: 201 });
  } catch (error) {
    console.error("Error parsing JD:", error);
    return NextResponse.json({ error: "Failed to parse job description" }, { status: 500 });
  }
}
