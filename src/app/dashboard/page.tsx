"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import { Navbar } from "@/components/shared/Navbar";
import { ResumeCard } from "@/components/dashboard/ResumeCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, FileText, LayoutDashboard, CreditCard,
} from "lucide-react";

interface Resume {
  id: string;
  title: string;
  templateId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreditInfo {
  balance: number;
  subscriptionTier: string;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

/**
 * Dashboard page with tabs for Resumes and Credits.
 */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeTab = searchParams.get("tab") || "resumes";

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/dashboard");
    }
  }, [user, router]);

  const fetchResumes = useCallback(async () => {
    try {
      const response = await fetch("/api/resumes");
      if (response.ok) setResumes(await response.json());
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/credits");
      if (response.ok) setCreditInfo(await response.json());
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchResumes();
      fetchCredits();
    }
  }, [user, fetchResumes, fetchCredits]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (response.ok) setResumes(resumes.filter((r) => r.id !== id));
  };

  const handleTabChange = (value: string) => {
    router.push(`/dashboard?tab=${value}`, { scroll: false });
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <Navbar currentPath="/dashboard" />
        <div className="pt-20 container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="p-6 bg-white rounded-xl">
              <p className="font-bold text-muted-foreground animate-pulse">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar currentPath="/dashboard" />

      <main className="pt-20 pb-12 container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-brand">Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage your resumes and credits
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="resumes" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Resumes
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Credits
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
              <Button onClick={() => router.push("/")}>
                <Plus className="mr-2 h-4 w-4" />
                New Resume
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
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
                <div className="p-6 rounded-xl bg-white mb-6">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-black mb-2">No resumes yet</h2>
                <p className="text-muted-foreground mb-6 max-w-sm font-medium">
                  Create your first resume to get started.
                </p>
                <Button onClick={() => router.push("/")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Resume
                </Button>
              </motion.div>
            )}
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits">
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black">Credits & Billing</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    Manage your credit balance and subscription
                  </p>
                </div>
                <Button onClick={() => router.push('/pricing')}>
                  Buy Credits
                </Button>
              </div>

              {creditInfo ? (
                <div className="space-y-6">
                  {/* Balance Card */}
                  <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-muted-foreground">Current Balance</p>
                        <p className="text-4xl font-black">{creditInfo.balance} credits</p>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-purple-100 border-2 border-black">
                        <p className="text-sm font-black capitalize">{creditInfo.subscriptionTier} Plan</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="p-4 border-b-2 border-black">
                      <h3 className="font-black">Transaction History</h3>
                    </div>
                    {creditInfo.transactions.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-muted-foreground font-medium">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {creditInfo.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4">
                            <div>
                              <p className="text-sm font-bold">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`font-black text-sm ${
                              tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              )}
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}
