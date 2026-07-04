"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import { AlertCircle, User, Trash2, Sparkles, Pencil, Check, X, Loader2, Globe, Link2, Copy } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileListItem {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  // Public-endpoint state. `published` is derived from publishedAt != null; the
  // slug persists across unpublish so republishing restores the same URL.
  publicSlug: string | null;
  publishedAt: string | null;
}

/** Format an ISO timestamp as a compact, locale-aware date + time. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * "Profiles" — the signed-in user's reusable backgrounds ("enter once, reuse
 * across JDs"). Each profile stores a raw background and its parsed ResumeData,
 * so generating from it skips re-parsing. Users can rename or delete here, and
 * select a profile on the home page to seed a generation.
 */
function ProfilesContent() {
  const router = useRouter();
  const user = useUser();
  const [items, setItems] = useState<ProfileListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/profiles");
    }
  }, [user, router]);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoadError(false);
      setItems(null);
      const response = await fetch("/api/profiles");
      if (!response.ok) {
        setLoadError(true);
        return;
      }
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProfiles();
  }, [user, fetchProfiles]);

  /** Delete a profile, optimistically removing it from the list. */
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      const previous = items;
      setItems((cur) => cur?.filter((it) => it.id !== id) ?? cur);
      try {
        const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      } catch (error) {
        console.error("Failed to delete profile:", error);
        setItems(previous ?? null);
      } finally {
        setDeletingId(null);
        setConfirmingId(null);
      }
    },
    [items]
  );

  /** Persist a renamed label (owner-scoped PUT). */
  const handleSaveLabel = useCallback(
    async (id: string) => {
      const label = editLabel.trim();
      if (!label) return;
      setSavingEdit(true);
      try {
        const res = await fetch(`/api/profiles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label }),
        });
        if (!res.ok) throw new Error(`Rename failed (${res.status})`);
        setItems((cur) => cur?.map((it) => (it.id === id ? { ...it, label } : it)) ?? cur);
        setEditingId(null);
      } catch (error) {
        console.error("Failed to rename profile:", error);
      } finally {
        setSavingEdit(false);
      }
    },
    [editLabel]
  );

  /** Publish a profile at its public endpoint (confirmed via dialog). */
  const handlePublish = useCallback(async (id: string) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/profiles/${id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error(`Publish failed (${res.status})`);
      const data = await res.json();
      setItems((cur) =>
        cur?.map((it) =>
          it.id === id
            ? { ...it, publicSlug: data.slug ?? it.publicSlug, publishedAt: data.publishedAt ?? new Date().toISOString() }
            : it
        ) ?? cur
      );
    } catch (error) {
      console.error("Failed to publish profile:", error);
    } finally {
      setPublishingId(null);
      setPublishConfirmId(null);
    }
  }, []);

  /** Unpublish a profile (keeps the slug so republishing restores the URL). */
  const handleUnpublish = useCallback(async (id: string) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/profiles/${id}/publish`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Unpublish failed (${res.status})`);
      setItems((cur) =>
        cur?.map((it) => (it.id === id ? { ...it, publishedAt: null } : it)) ?? cur
      );
    } catch (error) {
      console.error("Failed to unpublish profile:", error);
    } finally {
      setPublishingId(null);
    }
  }, []);

  /** Copy the absolute public URL to the clipboard. */
  const handleCopyLink = useCallback(async (slug: string, id: string) => {
    try {
      const url = `${window.location.origin}/p/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
        <Navbar currentPath="/profiles" />
        <div className="page-shell container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <span className="proof-label">profiles</span>
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
      <Navbar currentPath="/profiles" />

      <main className="page-shell page-pad-b container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="proof-label mb-2">§ Library — Saved Backgrounds</p>
            <h1 className="text-3xl font-brand">Profiles</h1>
            <p className="text-muted-foreground mt-1 font-medium">
              Reusable backgrounds — enter once, reuse across every job description.
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
                <p className="font-black text-red-800">Couldn&apos;t load your profiles</p>
              </div>
              <p className="text-sm text-red-700 mb-4 font-medium">
                Something went wrong fetching your saved backgrounds.
              </p>
              <Button variant="outline" onClick={fetchProfiles}>
                Try again
              </Button>
            </div>
          ) : items === null ? (
            <div className="space-y-4">
              <Skeleton className="h-[88px] w-full rounded-xl" />
              <Skeleton className="h-[88px] w-full rounded-xl" />
              <Skeleton className="h-[88px] w-full rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-10 text-center">
              <User className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-black text-lg mb-1">No saved profiles yet</p>
              <p className="text-sm text-muted-foreground font-medium mb-6">
                Generate a resume, then use &ldquo;Save as profile&rdquo; to store your
                background for reuse.
              </p>
              <Button onClick={() => router.push("/")} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate a Resume
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveLabel(item.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="max-w-xs"
                            aria-label="Profile name"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveLabel(item.id)}
                            disabled={savingEdit || !editLabel.trim()}
                            aria-label="Save name"
                          >
                            {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            disabled={savingEdit}
                            aria-label="Cancel rename"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-black text-base truncate">{item.label}</p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Updated {formatDate(item.updatedAt)}
                      </p>
                      {item.publishedAt && item.publicSlug && (
                        <span className="inline-flex items-center gap-1 mt-2 border-2 border-black rounded-md px-2 py-0.5 text-[11px] font-black bg-[#00D4AA] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                          <Globe className="w-3 h-3" />
                          Public
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-gray-100">
                    {editingId !== item.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditLabel(item.label);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        Rename
                      </Button>
                    )}
                    {editingId !== item.id &&
                      (item.publishedAt && item.publicSlug ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleCopyLink(item.publicSlug!, item.id)}
                            aria-label="Copy public link"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy link
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleUnpublish(item.id)}
                            disabled={publishingId === item.id}
                            aria-label="Unpublish profile"
                          >
                            {publishingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                            Unpublish
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => setPublishConfirmId(item.id)}
                          disabled={publishingId === item.id}
                          aria-label="Publish profile"
                        >
                          {publishingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                          Publish
                        </Button>
                      ))}
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
                          aria-label="Delete profile"
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

      <AlertDialog
        open={publishConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setPublishConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This makes your career profile publicly visible to anyone with the link, and it
              may be indexed by search engines. Your email, phone number, and photo are never
              included. You can unpublish at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishConfirmId && handlePublish(publishConfirmId)}
              disabled={publishingId !== null}
            >
              {publishingId ? "Publishing…" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * "Profiles" page — saved reusable backgrounds for the signed-in user.
 */
export default function ProfilesPage() {
  return <ProfilesContent />;
}
