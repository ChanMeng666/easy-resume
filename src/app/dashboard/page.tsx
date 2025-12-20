"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, AccountSettings } from "@stackframe/stack";
import { motion } from "framer-motion";
import { Navbar } from "@/components/shared/Navbar";
import { ResumeCard } from "@/components/dashboard/ResumeCard";
import { CreateResumeDialog } from "@/components/dashboard/CreateResumeDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Settings, LayoutDashboard } from "lucide-react";

interface Resume {
  id: string;
  title: string;
  templateId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Neobrutalism styled dashboard page showing user's resumes and account settings.
 */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get active tab from URL or default to "resumes"
  const activeTab = searchParams.get("tab") || "resumes";

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/dashboard");
    }
  }, [user, router]);

  // Fetch resumes
  const fetchResumes = useCallback(async () => {
    try {
      const response = await fetch("/api/resumes");
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user, fetchResumes]);

  // Delete resume handler
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/resumes/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setResumes(resumes.filter((r) => r.id !== id));
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  // Show loading state while checking auth
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <Navbar currentPath="/dashboard" />
        <div className="pt-20 container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <p className="font-bold text-muted-foreground animate-pulse">
                Loading...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirecting to sign-in
  if (user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar currentPath="/dashboard" />

      <main className="pt-20 pb-12 container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-brand">Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage your resumes and account settings
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="resumes" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              My Resumes
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Account Settings
            </TabsTrigger>
          </TabsList>

          {/* Resumes Tab */}
          <TabsContent value="resumes">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black">Your Resumes</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Create, edit, and share your professional resumes
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Resume
              </Button>
            </div>

            {/* Resume Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[180px] w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : resumes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resumes.map((resume, idx) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <ResumeCard
                      id={resume.id}
                      title={resume.title}
                      templateId={resume.templateId}
                      updatedAt={resume.updatedAt}
                      isPublic={resume.isPublic}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="p-6 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] mb-6">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-black mb-2">No resumes yet</h2>
                <p className="text-muted-foreground mb-6 max-w-sm font-medium">
                  Create your first resume to get started. You can choose from
                  multiple templates and customize it to your needs.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Resume
                </Button>
              </motion.div>
            )}
          </TabsContent>

          {/* Account Settings Tab */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl"
            >
              <div className="mb-6">
                <h2 className="text-xl font-black">Account Settings</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Manage your profile, security, and connected accounts
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6">
                <AccountSettings />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Resume Dialog */}
      <CreateResumeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchResumes}
      />
    </div>
  );
}
