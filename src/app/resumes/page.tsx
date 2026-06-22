"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import { AlertCircle, FileText, Download, Trash2, Sparkles, Mail } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ResumeListItem {
  id: string;
  title: string;
  status: string;
  atsScore?: number;
  templateId?: string;
  hasCoverLetter: boolean;
  createdAt: string;
  pdfUrl?: string;
}

/** Format an ISO timestamp as a compact, locale-aware date + time. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * "My Resumes" — history of the signed-in user's AI-generated resumes.
 * Reuses the same `generationJobs` persistence the public v1 API writes to, so
 * paid generations are never lost: users can re-open a past result in the editor
 * for free, re-download its PDF, or delete it.
 */
function ResumesContent() {
  const router = useRouter();
  const user = useUser();
  const [items, setItems] = useState<ResumeListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/resumes");
    }
  }, [user, router]);

  const fetchResumes = useCallback(async () => {
    try {
      setLoadError(false);
      const response = await fetch("/api/resumes");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items ?? []);
      } else {
        setLoadError(true);
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (user) fetchResumes();
  }, [user, fetchResumes]);

  /** Delete a generation, optimistically removing it from the list. */
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      const previous = items;
      setItems((cur) => cur?.filter((it) => it.id !== id) ?? cur);
      try {
        const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      } catch (error) {
        console.error("Failed to delete resume:", error);
        // Roll back on failure.
        setItems(previous ?? null);
      } finally {
        setDeletingId(null);
        setConfirmingId(null);
      }
    },
    [items]
  );

  if (user === undefined) {
    return (
      <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
        <Navbar currentPath="/resumes" />
        <div className="page-shell container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <span className="proof-label">my resumes</span>
              <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">loading…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  return (
    <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
      <Navbar currentPath="/resumes" />

      <main className="page-shell page-pad-b container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="proof-label mb-2">§ Library — Generated Resumes</p>
            <h1 className="text-3xl font-brand">My Resumes</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Re-open, re-download, or remove resumes you&apos;ve generated.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="gap-2 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            New Resume
          </Button>
        </motion.div>

        <div className="max-w-3xl">
          {loadError ? (
            <div className="bg-white rounded-xl p-6 border-2 border-red-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="font-black text-red-800">Couldn&apos;t load your resumes</p>
              </div>
              <p className="text-sm text-red-700 mb-4 font-medium">
                Something went wrong fetching your history.
              </p>
              <Button variant="outline" onClick={fetchResumes}>
                Try again
              </Button>
            </div>
          ) : items === null ? (
            <div className="space-y-4">
              <Skeleton className="h-[104px] w-full rounded-xl" />
              <Skeleton className="h-[104px] w-full rounded-xl" />
              <Skeleton className="h-[104px] w-full rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-10 text-center">
              <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black text-lg mb-1">No resumes yet</p>
              <p className="text-sm text-muted-foreground font-medium mb-6">
                Generate your first tailored resume and it&apos;ll show up here.
              </p>
              <Button onClick={() => router.push("/")} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate a Resume
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const isSucceeded = item.status === "succeeded";
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-black text-base truncate">{item.title}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          {formatDate(item.createdAt)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {!isSucceeded && (
                            <span className="px-2 py-1 rounded-lg bg-gray-100 border-2 border-black font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                              {item.status}
                            </span>
                          )}
                          {typeof item.atsScore === "number" && (
                            <span className="px-2 py-1 rounded-lg bg-primary/10 border-2 border-black font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                              ATS {item.atsScore}
                            </span>
                          )}
                          {item.templateId && (
                            <span className="px-2 py-1 rounded-lg bg-gray-50 border-2 border-black font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                              {item.templateId}
                            </span>
                          )}
                          {item.hasCoverLetter && (
                            <span className="px-2 py-1 rounded-lg bg-gray-50 border-2 border-black font-mono text-[10px] font-bold uppercase tracking-[0.14em] flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Cover Letter
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-gray-100">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/editor?job=${item.id}`)}
                        disabled={!isSucceeded}
                      >
                        Open
                      </Button>
                      {isSucceeded && item.pdfUrl && (
                        <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            PDF
                          </Button>
                        </a>
                      )}
                      <div className="ml-auto">
                        {confirmingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-muted-foreground">
                              Delete?
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="border-red-400 text-red-700 hover:bg-red-50"
                            >
                              {deletingId === item.id ? "Deleting…" : "Yes"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmingId(null)}
                              disabled={deletingId === item.id}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmingId(item.id)}
                            className="gap-2"
                            aria-label="Delete resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * "My Resumes" page — generation history for the signed-in user.
 */
export default function ResumesPage() {
  return <ResumesContent />;
}
