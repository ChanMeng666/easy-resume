'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Sparkles, Target, Bot, Download, User, Terminal, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { FadeIn } from '@/components/shared/FadeIn';

declare global {
  interface Window {
    // profileId is set when the background came from a saved profile, so the
    // editor can skip re-parsing it on the first generation ("enter once").
    __vitexInputs?: { jd: string; bg: string; profileId?: string };
  }
}

/** Saved-background summary, as returned by GET /api/profiles. */
interface ProfileSummary {
  id: string;
  label: string;
}

const MAX_INPUT_BYTES = 100_000;

/**
 * One-click starter examples that prefill both fields, so a first-time visitor
 * can see a real result without writing anything. Kept as static constants (no
 * Math.random / Date.now) to stay hydration-safe.
 */
const EXAMPLE_PROMPTS: { label: string; jd: string; bg: string }[] = [
  {
    label: 'Frontend Engineer',
    jd: 'Frontend Engineer at a fintech startup. Build accessible, high-performance UIs in React and TypeScript. Experience with Next.js, design systems, testing, and REST/GraphQL APIs required. Bonus: data-visualization and performance profiling.',
    bg: "I'm a frontend developer with 4 years of experience. I build web apps with React, TypeScript, and Next.js, and I've led a design-system migration that cut UI bugs by 30%. I write unit and end-to-end tests (Jest, Playwright) and care about accessibility and performance. B.S. in Computer Science, 2019.",
  },
  {
    label: 'Data Analyst',
    jd: 'Data Analyst for a retail company. Turn raw data into dashboards and insights. Strong SQL and Python required; experience with Tableau or Power BI, A/B testing, and stakeholder communication. Statistics background preferred.',
    bg: "Data analyst with 3 years of experience in retail and e-commerce. I write SQL and Python (pandas) daily, build Tableau dashboards, and ran A/B tests that lifted conversion by 12%. I present findings to non-technical stakeholders weekly. B.A. in Economics with a statistics minor.",
  },
];

/**
 * Product-first homepage that lets users immediately start generating a resume.
 */
export default function HomePage() {
  const router = useRouter();
  const user = useUser();
  const [jobDescription, setJobDescription] = useState('');
  const [background, setBackground] = useState('');
  // Saved backgrounds ("enter once, reuse many"). Only loaded for signed-in
  // users; selecting one fills the background and pins `selectedProfileId` so the
  // first generation reuses the parsed data instead of re-parsing it.
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Load the user's saved profiles once they're signed in.
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      return;
    }
    let cancelled = false;
    fetch('/api/profiles')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (!cancelled) setProfiles(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        /* non-critical — the manual background textarea still works. */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Select a saved profile: fetch its raw background, fill the textarea (so the
   * user sees exactly what will be used and can still tweak it), and pin the
   * profile id for the fast no-reparse path.
   */
  async function handleSelectProfile(id: string) {
    if (selectedProfileId === id) {
      // Toggle off — back to a blank, manually-typed background.
      setSelectedProfileId(null);
      setBackground('');
      return;
    }
    try {
      const res = await fetch(`/api/profiles/${id}`);
      if (!res.ok) return;
      const profile = await res.json();
      setBackground(profile.rawBackground ?? '');
      setSelectedProfileId(id);
    } catch {
      /* ignore — selection is best-effort. */
    }
  }

  /**
   * Background edits diverge from the pinned profile, so drop the pin: an edited
   * background must be re-parsed (we can't reuse the profile's stale parse).
   */
  function handleBackgroundChange(value: string) {
    setBackground(value);
    if (selectedProfileId) setSelectedProfileId(null);
  }

  /** Prefill both fields from a starter example (and clear any pinned profile). */
  function applyExample(example: { jd: string; bg: string }) {
    setJobDescription(example.jd);
    setBackground(example.bg);
    setSelectedProfileId(null);
  }

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

    const profileId = selectedProfileId ?? undefined;
    window.__vitexInputs = { jd, bg, profileId };
    try {
      sessionStorage.setItem('vitex_jd', jd);
      sessionStorage.setItem('vitex_bg', bg);
      if (profileId) sessionStorage.setItem('vitex_profile_id', profileId);
      else sessionStorage.removeItem('vitex_profile_id');
    } catch {
      // Private mode / quota exceeded — window global is our fallback.
    }

    // Generation requires a signed-in user (we can't charge an anonymous
    // caller). Gate on the way IN rather than letting the editor ambush the user
    // with an auth error after they've already typed and clicked Generate: route
    // straight to sign-in with a return-to-/editor. sessionStorage survives the
    // same-origin auth round-trip, so on return the editor restores the inputs
    // and auto-starts generation. (The window global is dropped by the full
    // navigation; sessionStorage is the survivor here.)
    if (!user) {
      router.push(`/handler/sign-in?after_auth_return_to=${encodeURIComponent('/editor')}`);
      return;
    }
    router.push('/editor');
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Navbar currentPath="/" />

      <main className="flex-grow page-shell page-pad-b">
        {/* Hero — centered pitch + the input console */}
        <section className="mx-auto max-w-content px-4 sm:px-6 py-16 md:py-24">
          <FadeIn className="mx-auto max-w-3xl text-center">
            <p className="mb-5 text-caption uppercase tracking-wider text-fog-deep">
              Career as Code
            </p>
            <h1 className="text-5xl md:text-display font-light tracking-tight leading-[1.05] text-aubergine">
              Your career, perfectly composed.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lead text-muted-foreground">
              Your career facts are source code. Paste a job description and your
              background — Vitex tailors, ATS-scores, and compiles a job-ready PDF
              in about 30 seconds. You&apos;re charged only when the PDF builds;
              refines are free.
            </p>
          </FadeIn>

          <FadeIn delay={0.06} className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-3xl border border-ash bg-white p-6 sm:p-8">
              <div className="space-y-5">
                {/* Onboarding: one-click examples to prefill both fields. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption text-muted-foreground">New here? Try:</span>
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => applyExample(ex)}
                      className="rounded-full border border-ash bg-bone px-3 py-1 text-caption text-aubergine transition-colors hover:bg-ash"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jd" className="text-body-sm font-medium text-aubergine">
                    Job Description
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
                  <Label htmlFor="bg" className="text-body-sm font-medium text-aubergine">
                    Your Background
                  </Label>

                  {/* Saved profiles — "enter once, reuse many". Selecting one
                      fills the background below; you can still edit it. */}
                  {profiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                      <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Use a saved profile:
                      </span>
                      {profiles.map((p) => {
                        const active = selectedProfileId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProfile(p.id)}
                            className={`rounded-full border px-3 py-1 text-caption transition-colors ${
                              active
                                ? 'border-periwinkle bg-periwinkle text-aubergine'
                                : 'border-ash bg-bone text-aubergine hover:bg-ash'
                            }`}
                            aria-pressed={active}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Textarea
                    id="bg"
                    rows={5}
                    placeholder="Briefly describe your experience, skills, and education…"
                    value={background}
                    onChange={(e) => handleBackgroundChange(e.target.value)}
                    className="min-h-[120px]"
                  />
                  {selectedProfileId && (
                    <p className="text-caption text-fog-deep">
                      Using saved profile — generation skips re-parsing.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-muted-foreground">
                  3 free resumes on sign-up · No credit card required
                </p>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Sparkles className="h-5 w-5" />
                  Generate My Resume
                </Button>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* How It Works — a real 3-step sequence */}
        <section className="section-y">
          <div className="mx-auto max-w-content px-4 sm:px-6">
            <FadeIn className="mb-12 md:mb-16 text-center">
              <p className="mb-3 text-caption uppercase tracking-wider text-fog-deep">
                The Pipeline
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-aubergine">
                Three steps, one compile.
              </h2>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
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
                <FadeIn key={idx} delay={idx * 0.06}>
                  <div className="h-full rounded-3xl border border-ash bg-white p-8">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-2xl font-light text-fog">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-periwinkle">
                        <step.icon className="h-5 w-5 text-aubergine" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-medium text-aubergine">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Or skip the browser — same pipeline, from the terminal or an AI assistant. */}
            <p className="mt-10 text-center text-body-sm text-muted-foreground">
              Or skip the browser —{' '}
              <span className="font-mono text-aubergine">npx vitex-cli</span>{' '}
              or the MCP connector. Same pipeline, same PDF.
            </p>
          </div>
        </section>

        {/* Agent access — the one dark band: drive the same pipeline from a
            terminal or an AI assistant. */}
        <section className="section-dark">
          <div className="mx-auto max-w-content px-4 sm:px-6 py-16 md:py-24">
            <FadeIn className="mb-10 md:mb-12">
              <p className="mb-3 text-caption uppercase tracking-wider text-periwinkle">
                The API is the UI
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight">
                Prefer your terminal — or your AI assistant?
              </h2>
              <p className="mt-4 max-w-2xl text-lead text-white/70">
                Drive the exact same pipeline from the{' '}
                <span className="font-mono text-white">vitex</span> CLI, or connect
                Vitex to ChatGPT or Claude over MCP. LinkedIn is for humans; a
                Vitex endpoint is for AIs.
              </p>
            </FadeIn>

            <FadeIn delay={0.06}>
              <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                <a
                  href="https://www.npmjs.com/package/vitex-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-3xl border border-white/10 bg-white/5 p-8 transition-colors hover:bg-white/10"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-caption uppercase tracking-wider text-periwinkle">CLI</span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Terminal className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-medium">Run it from your terminal</h3>
                  <p className="mb-4 text-white/70">
                    Compile a tailored resume without leaving your shell.
                  </p>
                  <code className="inline-block rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-white/90">
                    npx vitex-cli
                  </code>
                </a>

                <a
                  href="https://github.com/ChanMeng666/easy-resume/blob/master/docs/connectors/claude.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-3xl border border-white/10 bg-white/5 p-8 transition-colors hover:bg-white/10"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-caption uppercase tracking-wider text-periwinkle">MCP Connector</span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Plug className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-medium">Connect your AI assistant</h3>
                  <p className="mb-4 text-white/70">
                    Wire Vitex into{' '}
                    <a
                      href="https://github.com/ChanMeng666/easy-resume/blob/master/docs/connectors/chatgpt.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline underline-offset-2 hover:text-white/80"
                    >
                      ChatGPT
                    </a>{' '}
                    or Claude over MCP and let it build for you.
                  </p>
                  <span className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/90">
                    ChatGPT &amp; Claude
                  </span>
                </a>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
