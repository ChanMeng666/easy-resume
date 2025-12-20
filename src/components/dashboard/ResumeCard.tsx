"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FileText,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
  Download,
  Clock,
} from "lucide-react";
import { ShareDialog } from "./ShareDialog";

interface ResumeCardProps {
  id: string;
  title: string;
  templateId: string;
  updatedAt: string;
  isPublic?: boolean;
  onDelete: (id: string) => Promise<void>;
}

/**
 * Neobrutalism styled card component displaying a resume with actions.
 */
export function ResumeCard({
  id,
  title,
  templateId,
  updatedAt,
  isPublic,
  onDelete,
}: ResumeCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="transition-all duration-200"
      >
        <Card className="group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black line-clamp-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-medium capitalize">
                    {templateId.replace("-", " ")} template
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/editor?id=${id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/api/resumes/${id}/pdf`} target="_blank">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <div className="p-1 bg-gray-100 rounded border border-black">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span>Updated {formatDate(updatedAt)}</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full">
              {isPublic && (
                <Badge variant="success" className="text-xs">
                  Public
                </Badge>
              )}
              <div className="flex-1" />
              <Link href={`/editor?id=${id}`}>
                <Button size="sm">Edit Resume</Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        resumeId={id}
        resumeTitle={title}
      />
    </>
  );
}
