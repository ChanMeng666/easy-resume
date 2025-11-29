"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { LatexPreview } from "@/components/preview/LatexPreview";
import { ExportButtons } from "@/components/preview/ExportButtons";
import { generateLatexCode } from "@/lib/latex/generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import type { ResumeData } from "@/lib/validation/schema";

interface ShareData {
  resumeData: ResumeData;
  templateId: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  expiresInSeconds: number;
}

/**
 * Public page for viewing a shared resume via temporary link.
 */
export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShareData() {
      try {
        const response = await fetch(`/api/share/${token}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to load shared resume");
          return;
        }
        const data = await response.json();
        setShareData(data);
      } catch {
        setError("Failed to load shared resume");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchShareData();
    }
  }, [token]);

  const latexCode = useMemo(() => {
    if (!shareData) return "";
    return generateLatexCode(shareData.resumeData);
  }, [shareData]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Expired";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes} minutes remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading shared resume...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  Share Link Unavailable
                </h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{shareData.title}</h1>
              <p className="text-muted-foreground text-sm">
                Shared resume preview
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeRemaining(shareData.expiresInSeconds)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">LaTeX Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <LatexPreview code={latexCode} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export this resume to PDF using Overleaf or download the LaTeX
                  source code.
                </p>
                <ExportButtons latexCode={latexCode} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            This is a temporary share link that will expire on{" "}
            {new Date(shareData.expiresAt).toLocaleString()}.
          </p>
        </div>
      </div>
    </div>
  );
}
