"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { LatexPreview } from "@/components/preview/LatexPreview";
import { ExportButtons } from "@/components/preview/ExportButtons";
import { generateLatexCode } from "@/lib/latex/generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, FileText, Download } from "lucide-react";
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
 * Neobrutalism styled public page for viewing a shared resume via temporary link.
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
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <p className="font-bold text-muted-foreground animate-pulse">
            Loading shared resume...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-red-100 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)]">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black mb-2">
                    Share Link Unavailable
                  </h2>
                  <p className="text-muted-foreground font-medium">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4 p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black">{shareData.title}</h1>
                <p className="text-muted-foreground text-sm font-medium">
                  Shared resume preview
                </p>
              </div>
            </div>
            <Badge variant="warning" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeRemaining(shareData.expiresInSeconds)}
            </Badge>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-black">LaTeX Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <LatexPreview code={latexCode} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-medium">
                    Export this resume to PDF using Overleaf or download the LaTeX
                    source code.
                  </p>
                  <ExportButtons latexCode={latexCode} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <div className="inline-block px-4 py-2 bg-white rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
            <p className="text-sm text-muted-foreground font-medium">
              This is a temporary share link that will expire on{" "}
              <strong>{new Date(shareData.expiresAt).toLocaleString()}</strong>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
