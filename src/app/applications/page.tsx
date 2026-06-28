"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/validation/schema";

interface ApplicationItem {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  generationJobId: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Neobrutalism per-status badge colors (all share the 2px black border). */
const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  applied: "bg-blue-100 text-blue-800",
  interview: "bg-yellow-100 text-yellow-800",
  offer: "bg-green-200 text-green-900",
  rejected: "bg-red-100 text-red-800",
};

/** Format an ISO timestamp as a compact, locale-aware date. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/**
 * "Applications" — the signed-in user's job application tracker. Records a
 * company/position and walks it through a status log (draft → applied →
 * interview → offer/rejected). An application can optionally link to the
 * generated resume that was sent (via the "Track" button on My Resumes).
 */
function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();

  const [items, setItems] = useState<ApplicationItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add-form state. Prefilled from ?company / ?position / ?jobId when the user
  // arrives via the "Track" button on the My Resumes page.
  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [position, setPosition] = useState(searchParams.get("position") ?? "");
  const linkedJobId = searchParams.get("jobId") ?? undefined;
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/applications");
    }
  }, [user, router]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoadError(false);
      setItems(null);
      const res = await fetch("/api/applications");
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user, fetchApplications]);

  /** Create a new application, prepending it to the list. */
  const handleCreate = useCallback(async () => {
    const c = company.trim();
    const p = position.trim();
    if (!c || !p) return;
    setCreating(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: c, position: p, generationJobId: linkedJobId }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      const created: ApplicationItem = await res.json();
      setItems((cur) => [created, ...(cur ?? [])]);
      setCompany("");
      setPosition("");
    } catch (error) {
      console.error("Failed to create application:", error);
    } finally {
      setCreating(false);
    }
  }, [company, position, linkedJobId]);

  /** Change an application's status (optimistic), PATCHing the server. */
  const handleStatusChange = useCallback(
    async (id: string, status: ApplicationStatus) => {
      setUpdatingId(id);
      const previous = items;
      setItems((cur) => cur?.map((it) => (it.id === id ? { ...it, status } : it)) ?? cur);
      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const updated: ApplicationItem = await res.json();
        setItems((cur) => cur?.map((it) => (it.id === id ? updated : it)) ?? cur);
      } catch (error) {
        console.error("Failed to update status:", error);
        setItems(previous ?? null);
      } finally {
        setUpdatingId(null);
      }
    },
    [items]
  );

  /** Delete an application, optimistically removing it. */
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      const previous = items;
      setItems((cur) => cur?.filter((it) => it.id !== id) ?? cur);
      try {
        const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      } catch (error) {
        console.error("Failed to delete application:", error);
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
        <Navbar currentPath="/applications" />
        <div className="page-shell container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <span className="proof-label">applications</span>
              <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">loading…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  const visible = items?.filter((it) => filter === "all" || it.status === filter) ?? null;

  return (
    <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
      <Navbar currentPath="/applications" />

      <main className="page-shell page-pad-b container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="proof-label mb-2">§ Pipeline — Job Applications</p>
            <h1 className="text-3xl font-brand">Applications</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Track where each resume went and how far it got.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="gap-2 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            New Resume
          </Button>
        </motion.div>

        <div className="max-w-3xl">
          {/* Add form */}
          <div className="mb-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-5">
            <p className="proof-label mb-3">Add an application</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Company"
                aria-label="Company"
                className="flex-1"
              />
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Position"
                aria-label="Position"
                className="flex-1"
              />
              <Button
                onClick={handleCreate}
                disabled={creating || !company.trim() || !position.trim()}
                className="gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
            {linkedJobId && (
              <p className="font-mono text-[11px] text-muted-foreground mt-3">
                Linking to the generated resume you opened.
              </p>
            )}
          </div>

          {/* Status filter */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {(["all", ...APPLICATION_STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg border-2 border-black px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                  filter === s
                    ? "bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]"
                    : "bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loadError ? (
            <div className="bg-white rounded-xl p-6 border-2 border-red-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="font-black text-red-800">Couldn&apos;t load your applications</p>
              </div>
              <Button variant="outline" onClick={fetchApplications}>
                Try again
              </Button>
            </div>
          ) : visible === null ? (
            <div className="space-y-4">
              <Skeleton className="h-[96px] w-full rounded-xl" />
              <Skeleton className="h-[96px] w-full rounded-xl" />
              <Skeleton className="h-[96px] w-full rounded-xl" />
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-10 text-center">
              <Briefcase className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black text-lg mb-1">
                {filter === "all" ? "No applications yet" : `No ${filter} applications`}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Add one above, or use &ldquo;Track&rdquo; on a resume in My Resumes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-base truncate">{item.company}</p>
                      <p className="text-sm text-muted-foreground font-medium truncate">{item.position}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        {item.appliedAt ? `Applied ${formatDate(item.appliedAt)}` : `Added ${formatDate(item.createdAt)}`}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-lg border-2 border-black px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] ${STATUS_STYLES[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-gray-100">
                    {/* Status state machine: any transition allowed. */}
                    <label className="font-mono text-[11px] font-medium text-muted-foreground inline-flex items-center gap-2">
                      Status
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as ApplicationStatus)}
                        disabled={updatingId === item.id}
                        aria-label="Change status"
                        className="rounded-lg border-2 border-black bg-white px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] focus:outline-none"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>

                    {item.generationJobId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => router.push(`/editor?job=${item.generationJobId}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Resume
                      </Button>
                    )}

                    <div className="ml-auto">
                      {confirmingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-medium text-muted-foreground">Delete?</span>
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
                          aria-label="Delete application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * "Applications" page — the job application tracker for the signed-in user.
 * Wrapped in Suspense because it reads search params (the "Track" prefill).
 */
export default function ApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsContent />
    </Suspense>
  );
}
