"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { RowActions } from "@/components/shared/RowActions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Max length of a voice-writing sample (mirrors the server-side zod cap). */
const VOICE_SAMPLE_MAX = 4000;

interface ProfileListItem {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  // Public-endpoint state. `published` is derived from publishedAt != null; the
  // slug persists across unpublish so republishing restores the same URL.
  publicSlug: string | null;
  publishedAt: string | null;
  // Whether the owner saved a voice-writing sample (derived boolean; the raw
  // text is fetched on demand via the owner-scoped detail GET).
  hasVoiceSample: boolean;
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
  // Voice-sample editor dialog state (loaded lazily from the detail GET).
  const [voiceProfileId, setVoiceProfileId] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);

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

  /** Open the voice-sample dialog for a profile, loading its current text. */
  const openVoiceDialog = useCallback(async (id: string) => {
    setVoiceProfileId(id);
    setVoiceText("");
    setVoiceLoadError(false);
    setVoiceLoading(true);
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setVoiceText(typeof data.voiceSample === "string" ? data.voiceSample : "");
    } catch (error) {
      console.error("Failed to load voice sample:", error);
      setVoiceLoadError(true);
    } finally {
      setVoiceLoading(false);
    }
  }, []);

  /**
   * Persist the voice sample (owner-scoped PUT). An empty string clears it —
   * the store normalizes blank/whitespace to null. Updates the row's badge.
   */
  const handleSaveVoice = useCallback(
    async (id: string, sample: string) => {
      setVoiceSaving(true);
      try {
        const res = await fetch(`/api/profiles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceSample: sample }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const hasVoiceSample = sample.trim().length > 0;
        setItems((cur) => cur?.map((it) => (it.id === id ? { ...it, hasVoiceSample } : it)) ?? cur);
        setVoiceProfileId(null);
      } catch (error) {
        console.error("Failed to save voice sample:", error);
      } finally {
        setVoiceSaving(false);
      }
    },
    []
  );

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/profiles" />
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/profiles" />

      <PageShell>
        <PageHeader
          eyebrow="Workspace"
          title="Profiles"
          lede="Reusable backgrounds — enter once, reuse across every job description."
          actions={
            <Button onClick={() => router.push("/")} className="flex-shrink-0">
              New Resume
            </Button>
          }
        />

        <div className="max-w-3xl">
          {loadError ? (
            <div className="rounded-3xl border border-ash bg-card p-8">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-rose-ink" />
                <p className="font-medium text-aubergine">Couldn&apos;t load your profiles</p>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Something went wrong fetching your saved backgrounds.
              </p>
              <Button variant="secondary" onClick={fetchProfiles}>
                Try again
              </Button>
            </div>
          ) : items === null ? (
            <div className="space-y-4">
              <Skeleton className="h-[88px] w-full rounded-3xl" />
              <Skeleton className="h-[88px] w-full rounded-3xl" />
              <Skeleton className="h-[88px] w-full rounded-3xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-ash bg-card p-12 text-center">
              <p className="text-lead text-aubergine mb-1">No saved profiles yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Generate a resume, then use &ldquo;Save as profile&rdquo; to store your
                background for reuse.
              </p>
              <Button onClick={() => router.push("/")}>Generate a Resume</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-ash bg-card p-6 transition-colors hover:border-periwinkle"
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
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            disabled={savingEdit}
                            aria-label="Cancel rename"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-base font-medium text-aubergine truncate">{item.label}</p>
                      )}
                      <p className="text-caption text-muted-foreground mt-1">
                        Updated {formatDate(item.updatedAt)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {item.publishedAt && item.publicSlug && (
                          <Badge variant="success">Public</Badge>
                        )}
                        {item.hasVoiceSample && (
                          <Badge variant="accent">Voice sample</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingId !== item.id && (
                    <div className="mt-5 pt-5 border-t border-ash">
                      {confirmingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
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
                        <RowActions
                          more={[
                            {
                              label: "Rename",
                              onClick: () => {
                                setEditingId(item.id);
                                setEditLabel(item.label);
                              },
                            },
                            {
                              label: "Voice sample",
                              onClick: () => openVoiceDialog(item.id),
                            },
                            ...(item.publishedAt && item.publicSlug
                              ? [
                                  {
                                    label: copiedId === item.id ? "Copied" : "Copy link",
                                    onClick: () => handleCopyLink(item.publicSlug!, item.id),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              destructive: true,
                              onClick: () => setConfirmingId(item.id),
                            },
                          ]}
                        >
                          {item.publishedAt && item.publicSlug ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnpublish(item.id)}
                              disabled={publishingId === item.id}
                            >
                              {publishingId === item.id ? "Unpublishing…" : "Unpublish"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setPublishConfirmId(item.id)}
                              disabled={publishingId === item.id}
                            >
                              {publishingId === item.id ? "Publishing…" : "Publish"}
                            </Button>
                          )}
                        </RowActions>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>

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

      <Dialog
        open={voiceProfileId !== null}
        onOpenChange={(open) => {
          if (!open && !voiceSaving) setVoiceProfileId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice sample</DialogTitle>
            <DialogDescription>
              Paste a short piece of your own writing. Cover-letter generation uses it to match
              your voice. It stays private — never shown on your public profile.
            </DialogDescription>
          </DialogHeader>

          {voiceLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : voiceLoadError ? (
            <div className="flex items-center gap-2 py-6 text-rose-ink">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Couldn&apos;t load this voice sample.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value.slice(0, VOICE_SAMPLE_MAX))}
                placeholder="e.g. a paragraph from a past cover letter, blog post, or email you wrote…"
                rows={8}
                aria-label="Voice sample"
                disabled={voiceSaving}
              />
              <p className="text-caption text-muted-foreground text-right">
                {voiceText.length} / {VOICE_SAMPLE_MAX}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => voiceProfileId && handleSaveVoice(voiceProfileId, "")}
              disabled={voiceSaving || voiceLoading || voiceLoadError || voiceText.trim().length === 0}
            >
              Clear
            </Button>
            <Button
              onClick={() => voiceProfileId && handleSaveVoice(voiceProfileId, voiceText)}
              disabled={voiceSaving || voiceLoading || voiceLoadError}
            >
              {voiceSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * "Profiles" page — saved reusable backgrounds for the signed-in user.
 */
export default function ProfilesPage() {
  return <ProfilesContent />;
}
