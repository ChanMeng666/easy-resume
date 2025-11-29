import { NextRequest, NextResponse } from "next/server";
import { shareLinkService } from "@/lib/services/shareLinkService";

type Params = {
  params: Promise<{ token: string }>;
};

/**
 * GET /api/share/[token] - Get a shared resume by token (public endpoint).
 * Returns the resume data if the share link is valid and not expired.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const data = await shareLinkService.get(token);
    if (!data) {
      return NextResponse.json(
        { error: "Share link not found or expired" },
        { status: 404 }
      );
    }

    // Get remaining TTL
    const ttl = await shareLinkService.getTtl(token);
    const expiresIn = ttl > 0 ? ttl : 0;

    return NextResponse.json({
      resumeData: data.resumeData,
      templateId: data.templateId,
      title: data.title,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      expiresInSeconds: expiresIn,
    });
  } catch (error) {
    console.error("Error fetching shared resume:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared resume" },
      { status: 500 }
    );
  }
}
