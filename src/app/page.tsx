'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Target, Bot, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { CropFrame } from '@/components/shared/CropFrame';

declare global {
  interface Window {
    __vitexInputs?: { jd: string; bg: string };
  }
}

const MAX_INPUT_BYTES = 100_000;

/**
 * A "bar" of typeset text used in the composed-resume preview. Reveals with the
 * compile animation at a staggered delay so the page looks like it is being set.
 */
function Bar({ w, accent, delay }: { w: string; accent?: boolean; delay: number }) {
  return (
    <div
      className={`compile-line h-2 rounded ${accent ? 'bg-primary' : 'bg-gray-300'}`}
      style={{ width: w, animationDelay: `${delay}s` }}
    />
  );
}

/**
 * Decorative preview of a "composed" two-column resume — the product's own
 * 60/40 layout, crop-marked like a print proof, with a compile sweep. This is
 * the homepage's signature element. Purely visual (aria-hidden).
 */
function ComposedPreview() {
  return (
    <CropFrame
      aria-hidden
      className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
    >
      {/* Proof header bar */}
      <div className="flex items-center justify-between border-b-2 border-black bg-gray-50 px-3 py-2">
        <span className="proof-label">resume.pdf · A4</span>
        <span className="proof-label !text-primary">ATS·094</span>
      </div>

      {/* Page body with a downward compile sweep */}
      <div className="relative p-4">
        <div className="compile-sweep pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cyan-300/50 to-transparent" />

        {/* Name + role */}
        <div className="compile-line mb-1.5 h-4 w-2/3 rounded bg-foreground" style={{ animationDelay: '0.05s' }} />
        <div className="compile-line mb-4 h-2 w-1/3 rounded bg-primary" style={{ animationDelay: '0.12s' }} />

        {/* 60 / 40 grid — mirrors generator.ts */}
        <div className="grid grid-cols-[60%_40%] gap-3">
          <div className="space-y-2">
            <Bar w="40%" accent delay={0.18} />
            <Bar w="100%" delay={0.24} />
            <Bar w="92%" delay={0.28} />
            <Bar w="80%" delay={0.32} />
            <div className="h-1" />
            <Bar w="40%" accent delay={0.4} />
            <Bar w="100%" delay={0.46} />
            <Bar w="88%" delay={0.5} />
          </div>
          <div className="space-y-2">
            <Bar w="55%" accent delay={0.36} />
            <Bar w="90%" delay={0.42} />
            <Bar w="70%" delay={0.46} />
            <div className="h-1" />
            <Bar w="55%" accent delay={0.54} />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {['28%', '34%', '24%', '30%'].map((w, i) => (
                <div
                  key={i}
                  className="compile-line h-3 rounded border border-black bg-cyan-100"
                  style={{ width: w, animationDelay: `${0.58 + i * 0.04}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </CropFrame>
  );
}

/**
 * Product-first homepage that lets users immediately start generating a resume.
 */
export default function HomePage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [background, setBackground] = useState('');

  /**
   * Hand off JD and background to the editor page through two channels:
   * a window global (survives client-side navigation) and sessionStorage
   * (survives full reload). The window global makes us resilient to the
   * iOS Safari private-mode sessionStorage quota (~5 KB), which used to
   * silently swallow long inputs and leave the editor with empty strings.
   */
  function handleGenerate() {
    const jd = jobDescription.trim();
    const bg = background.trim();

    if (!jd || !bg) {
      alert('Please fill in both the job description and your background.');
      return;
    }

    if (jd.length + bg.length > MAX_INPUT_BYTES) {
      alert(
        `Inputs are too long (${jd.length + bg.length} chars). ` +
          `Please keep them under ${MAX_INPUT_BYTES.toLocaleString()} characters total.`
      );
      return;
    }

    window.__vitexInputs = { jd, bg };
    try {
      sessionStorage.setItem('vitex_jd', jd);
      sessionStorage.setItem('vitex_bg', bg);
    } catch {
      // Private mode / quota exceeded — window global is our fallback.
    }
    router.push('/editor');
  }

  return (
    <div className="relative min-h-screen baseline-grid bg-[#f0f0f0] font-sans text-foreground">
      <div className="flex flex-col min-h-screen">
        <Navbar currentPath="/" />

        <main className="flex-grow page-shell page-pad-b">
          {/* Hero — 60/40 editorial grid: pitch + inputs (left), composed proof (right) */}
          <section className="container mx-auto px-4 max-w-6xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="proof-label mb-4"
            >
              § Vitex — AI Resume Composer
            </motion.p>

            <div className="vitex-grid">
              {/* Left: headline + input console */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="font-brand text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.05] mb-4"
                >
                  Your career,
                  <br />
                  perfectly composed.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-base sm:text-lg text-muted-foreground font-medium max-w-xl mb-6"
                >
                  Paste a job description and your background. Vitex tailors,
                  scores, and typesets a job-ready PDF in about 30 seconds.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.18 }}
                  className="rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="jd" className="proof-label !text-foreground">
                        JD.txt — Job Description
                      </Label>
                      <Textarea
                        id="jd"
                        rows={5}
                        placeholder="Paste the job description here…"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bg" className="proof-label !text-foreground">
                        BG.txt — Your Background
                      </Label>
                      <Textarea
                        id="bg"
                        rows={5}
                        placeholder="Briefly describe your experience, skills, and education…"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="proof-label">First resume free · No account required</p>
                    <Button
                      size="lg"
                      onClick={handleGenerate}
                      className="h-12 px-8 text-base gap-2 w-full sm:w-auto"
                    >
                      <Sparkles className="h-5 w-5" />
                      Generate My Resume
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* Right: composed-resume proof */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="hidden md:flex flex-col items-center pt-6"
              >
                <ComposedPreview />
                <p className="proof-label mt-6 text-center">
                  Two-column layout · Typst-compiled · Recruiter-ready
                </p>
              </motion.div>
            </div>
          </section>

          {/* How It Works — a real 3-step sequence, set as a typeset galley */}
          <section className="section-y mt-4 bg-white border-y-2 border-black">
            <div className="container mx-auto px-4 max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                className="motion-reveal mb-10 sm:mb-14"
              >
                <p className="proof-label mb-2">§ The Pipeline</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  Three steps, one compile.
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8 sm:gap-10">
                {[
                  {
                    icon: Target,
                    title: 'Paste the JD',
                    description: 'We parse requirements and keywords from the role.',
                  },
                  {
                    icon: Bot,
                    title: 'AI composes',
                    description: 'Your background is tailored and scored against the job.',
                  },
                  {
                    icon: Download,
                    title: 'Download PDF',
                    description: 'A typeset, recruiter-ready resume — compiled in seconds.',
                  },
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: idx * 0.1 }}
                    className="motion-reveal"
                  >
                    <CropFrame className="h-full rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px]">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono text-2xl font-bold text-foreground">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-primary">
                          <step.icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black mb-2">{step.title}</h3>
                      <p className="text-muted-foreground font-medium">
                        {step.description}
                      </p>
                    </CropFrame>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
