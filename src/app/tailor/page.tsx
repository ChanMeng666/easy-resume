'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import {
  FileText, Target, Mail, Loader2, CheckCircle,
  ArrowRight, Copy, ExternalLink
} from 'lucide-react';

interface Resume {
  id: string;
  title: string;
  templateId: string;
}

interface ParsedJD {
  title: string;
  company: string;
  location: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
}

/**
 * Job tailoring flow page.
 * JD input -> analysis -> tailoring -> export pipeline.
 */
export default function TailorPage() {
  const router = useRouter();
  const user = useUser();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jdText, setJdText] = useState('');
  const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input');
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [tailoredResult, setTailoredResult] = useState<{
    id: string;
    matchScore: number;
    matchAnalysis: { skillMatch: { matched: string[]; missing: string[] }; suggestions: string[] };
  } | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [error, setError] = useState<string>('');

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/handler/sign-in?after_auth_return_to=/tailor');
    }
  }, [user, router]);

  // Fetch resumes
  useEffect(() => {
    if (user) {
      fetch('/api/resumes')
        .then(r => r.json())
        .then(setResumes)
        .catch(console.error);
    }
  }, [user]);

  /** Parse JD and tailor resume. */
  const handleTailor = async () => {
    if (!jdText.trim() || !selectedResumeId) return;
    setStep('analyzing');
    setError('');

    try {
      // Parse JD
      const jdRes = await fetch('/api/jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: jdText }),
      });
      if (!jdRes.ok) throw new Error('Failed to parse job description');
      const jdData = await jdRes.json();
      setParsedJD(jdData.parsed);

      // Tailor resume
      const tailorRes = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseResumeId: selectedResumeId,
          jobDescriptionId: jdData.id,
        }),
      });
      if (!tailorRes.ok) throw new Error('Failed to tailor resume');
      const tailored = await tailorRes.json();
      setTailoredResult(tailored);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('input');
    }
  };

  /** Generate cover letter. */
  const handleGenerateCoverLetter = async () => {
    if (!tailoredResult || !parsedJD) return;
    setIsGeneratingCL(true);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: tailoredResult,
          parsedJD,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate cover letter');
      const data = await res.json();
      setCoverLetter(data.coverLetter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setIsGeneratingCL(false);
    }
  };

  if (user === undefined || user === null) return null;

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar currentPath="/tailor" />

      <main className="pt-20 pb-12 container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-brand">Tailor Your Resume</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Paste a job description and we&apos;ll optimize your resume for the role
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="text-red-800 font-bold text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Input */}
        {step === 'input' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Resume selector */}
            <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <label className="block text-sm font-black mb-2">Select Base Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded-lg border-2 border-black px-3 py-2 text-sm font-medium"
              >
                <option value="">Choose a resume...</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {/* JD input */}
            <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <label className="block text-sm font-black mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Paste Job Description
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={12}
                className="w-full rounded-lg border-2 border-black px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-shadow"
              />
            </div>

            <Button
              onClick={handleTailor}
              disabled={!jdText.trim() || !selectedResumeId}
              className="w-full h-14 text-lg gap-2"
            >
              <Target className="h-5 w-5" />
              Analyze & Tailor Resume
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-6" />
            <h2 className="text-xl font-black mb-2">Analyzing & Tailoring...</h2>
            <p className="text-muted-foreground font-medium">
              Parsing job description, matching skills, and optimizing your resume
            </p>
          </motion.div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && tailoredResult && parsedJD && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Match Score */}
            <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Match Analysis</h2>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-3xl font-black text-purple-600">
                    {tailoredResult.matchScore}/100
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-black text-green-700 mb-2">Matched Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tailoredResult.matchAnalysis?.skillMatch?.matched?.map((skill: string) => (
                      <span key={skill} className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-md border border-green-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-700 mb-2">Skills to Develop</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tailoredResult.matchAnalysis?.skillMatch?.missing?.map((skill: string) => (
                      <span key={skill} className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-md border border-red-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {tailoredResult.matchAnalysis?.suggestions && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-black mb-2">Suggestions</h3>
                  <ul className="space-y-1">
                    {tailoredResult.matchAnalysis.suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground font-medium flex gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg font-black mb-4">Export Tailored Resume</h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push(`/editor?resumeId=${tailoredResult.id}`)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Editor
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGenerateCoverLetter} disabled={isGeneratingCL}>
                  {isGeneratingCL ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Generate Cover Letter
                </Button>
              </div>
            </div>

            {/* Cover Letter */}
            {coverLetter && (
              <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black">Cover Letter</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(coverLetter)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-medium bg-gray-50 rounded-lg p-4 border">
                    {coverLetter}
                  </pre>
                </div>
              </div>
            )}

            {/* Start Over */}
            <Button
              variant="outline"
              onClick={() => {
                setStep('input');
                setTailoredResult(null);
                setParsedJD(null);
                setCoverLetter('');
                setJdText('');
              }}
              className="w-full"
            >
              Tailor Another Resume
            </Button>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
