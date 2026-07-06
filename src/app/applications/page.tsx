"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
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
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/shared/FadeIn";
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

/** Map each application status to a tonal Phantom Badge variant. */
const STATUS_VARIANT: Record<ApplicationStatus, BadgeProps["variant"]> = {
  draft: "default",
  applied: "accent",
  interview: "warning",
  offer: "success",
  rejected: "destructive",
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
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/applications" />
        <div className="page-shell mx-auto max-w-content px-4 sm:px-6">
          <div className="flex h-[60vh] items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  const visible = items?.filter((it) => filter === "all" || it.status === filter) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/applications" />

      <main className="page-shell page-pad-b mx-auto max-w-content px-4 sm:px-6">
        <FadeIn className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl">Applications</h1>
            <p className="text-muted-foreground mt-2">
              Track where each resume went and how far it got.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="flex-shrink-0">
            <Sparkles className="w-4 h-4" />
            New Resume
          </Button>
        </FadeIn>

        <div className="max-w-3xl">
          {/* Add form */}
          <div className="mb-6 rounded-3xl border border-ash bg-card p-6">
            <p className="text-caption text-muted-foreground mb-3">Add an application</p>
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
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>
            {linkedJobId && (
              <p className="text-caption text-muted-foreground mt-3">
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
                className={`rounded-full px-4 py-1.5 text-caption capitalize transition-colors ${
                  filter === s
                    ? "bg-aubergine text-paper"
                    : "bg-bone text-fog-deep hover:bg-ash"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loadError ? (
            <div className="rounded-3xl border border-ash bg-card p-8">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-rose-ink" />
                <p className="font-medium text-aubergine">Couldn&apos;t load your applications</p>
              </div>
              <Button variant="secondary" onClick={fetchApplications}>
                Try again
              </Button>
            </div>
          ) : visible === null ? (
            <div className="space-y-4">
              <Skeleton className="h-[96px] w-full rounded-3xl" />
              <Skeleton className="h-[96px] w-full rounded-3xl" />
              <Skeleton className="h-[96px] w-full rounded-3xl" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-ash bg-card p-12 text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lead text-aubergine mb-1">
                {filter === "all" ? "No applications yet" : `No ${filter} applications`}
              </p>
              <p className="text-sm text-muted-foreground">
                Add one above, or use &ldquo;Track&rdquo; on a resume in My Resumes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-ash bg-card p-6 transition-colors hover:border-periwinkle"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-aubergine truncate">{item.company}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.position}</p>
                      <p className="text-caption text-muted-foreground mt-1">
                        {item.appliedAt ? `Applied ${formatDate(item.appliedAt)}` : `Added ${formatDate(item.createdAt)}`}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[item.status]} className="flex-shrink-0 capitalize">
                      {item.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-ash">
                    {/* Status state machine: any transition allowed. */}
                    <label className="text-caption text-muted-foreground inline-flex items-center gap-2">
                      Status
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as ApplicationStatus)}
                        disabled={updatingId === item.id}
                        aria-label="Change status"
                        className="rounded-full border border-ash bg-paper px-3 py-1.5 text-caption capitalize text-aubergine transition-colors hover:bg-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        onClick={() => router.push(`/editor?job=${item.generationJobId}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Resume
                      </Button>
                    )}

                    <div className="ml-auto">
                      {confirmingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-muted-foreground">Delete?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? "Deleting…" : "Yes"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmingId(null)}
                            disabled={deletingId === item.id}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingId(item.id)}
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
