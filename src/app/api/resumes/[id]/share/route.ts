import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { resumeService } from "@/lib/services/resumeService";
import { shareLinkService } from "@/lib/services/shareLinkService";
import type { ResumeData } from "@/lib/validation/schema";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/resumes/[id]/share - Create a temporary share link for a resume.
 * The link will expire after 72 hours by default.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Get optional custom TTL from request body
    const body = await request.json().catch(() => ({}));
    const ttlHours = body.ttlHours || 72;
    const ttlSeconds = ttlHours * 60 * 60;

    const { token, expiresAt } = await shareLinkService.create(
      id,
      user.id,
      resume.data as ResumeData,
      resume.templateId,
      resume.title,
      ttlSeconds
    );

    // Generate the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({
      success: true,
      token,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
      ttlHours,
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resumes/[id]/share - List all active share links for a resume.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Get all share links for this user and filter by resume ID
    const allLinks = await shareLinkService.listByUser(user.id);
    const resumeLinks = allLinks.filter((link) => link.data.resumeId === id);

    return NextResponse.json({
      links: resumeLinks.map((link) => ({
        token: link.token,
        expiresAt: link.data.expiresAt,
        createdAt: link.data.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing share links:", error);
    return NextResponse.json(
      { error: "Failed to list share links" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes/[id]/share - Revoke a share link.
 * Expects { token: string } in request body.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await resumeService.getById(id, user.id);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const revoked = await shareLinkService.revoke(token, user.id);
    if (!revoked) {
      return NextResponse.json(
        { error: "Share link not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking share link:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    );
  }
}
