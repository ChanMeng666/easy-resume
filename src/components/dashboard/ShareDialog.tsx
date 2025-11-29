"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Link2, Trash2, Clock, Loader2 } from "lucide-react";

interface ShareLink {
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string;
  resumeTitle: string;
}

/**
 * Dialog for creating and managing temporary share links.
 */
export function ShareDialog({
  open,
  onOpenChange,
  resumeId,
  resumeTitle,
}: ShareDialogProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);

  // Fetch share links function
  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/share`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
      }
    } catch (error) {
      console.error("Failed to fetch share links:", error);
    } finally {
      setIsLoading(false);
    }
  }, [resumeId]);

  // Fetch existing share links when dialog opens
  useEffect(() => {
    if (open) {
      fetchLinks();
    }
  }, [open, fetchLinks]);

  const createLink = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/resumes/${resumeId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlHours: 72 }),
      });
      if (response.ok) {
        const data = await response.json();
        setNewShareUrl(data.shareUrl);
        await fetchLinks();
      }
    } catch (error) {
      console.error("Failed to create share link:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const revokeLink = async (token: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        setLinks(links.filter((link) => link.token !== token));
      }
    } catch (error) {
      console.error("Failed to revoke share link:", error);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return "Expired";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Resume</DialogTitle>
          <DialogDescription>
            Create a temporary link to share &quot;{resumeTitle}&quot;. Links
            expire after 72 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Share URL Display */}
          {newShareUrl && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                Share link created!
              </p>
              <div className="flex gap-2">
                <Input
                  value={newShareUrl}
                  readOnly
                  className="text-xs bg-white dark:bg-gray-900"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(newShareUrl);
                    setCopiedToken("new");
                    setTimeout(() => setCopiedToken(null), 2000);
                  }}
                >
                  {copiedToken === "new" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Create New Link Button */}
          <Button
            onClick={createLink}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Create Share Link
              </>
            )}
          </Button>

          {/* Existing Links */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Links</p>
              {links.map((link) => (
                <div
                  key={link.token}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimeRemaining(link.expiresAt)}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      ...{link.token.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(link.token)}
                    >
                      {copiedToken === link.token ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => revokeLink(link.token)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No active share links
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
