'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { AlertCircle, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { FadeIn } from '@/components/shared/FadeIn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import type { ResumeData } from '@/lib/validation/schema';

/** A rendered transcript entry. */
type ChatEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'tool'; id: string; toolName: string; error: boolean };

/** A persisted message as returned by GET /api/threads/[id]. */
interface StoredMessage {
  role: string;
  content: string;
  toolName: string | null;
  toolResult: unknown;
}

/** Human-friendly verb for a tool chip. */
function toolLabel(name: string): string {
  const map: Record<string, string> = {
    editSummary: 'Editing summary',
    editBasics: 'Editing basics',
    editWorkHighlights: 'Editing work highlights',
    editProjectHighlights: 'Editing project highlights',
    addSkillCategory: 'Adding skill category',
    editSkillCategory: 'Editing skill category',
    removeSkillCategory: 'Removing skill category',
    reorderSkills: 'Reordering skills',
    previewResume: 'Reviewing the resume',
    rewriteCoverLetterParagraph: 'Editing cover letter',
    setCoverLetterText: 'Rewriting cover letter',
    previewCoverLetter: 'Reviewing the cover letter',
  };
  return map[name] ?? name;
}

/** Starter prompts shown on an empty conversation. */
const STARTERS = [
  'Tighten my summary to two sentences.',
  'Make my most recent role emphasize leadership.',
  'Add a "DevOps" skill category with Docker and Kubernetes.',
];

/**
 * Conversational resume editor (P2-1). Opens (or resumes) the thread for a
 * generated resume, streams edit turns over SSE, and shows the live PDF (which
 * recompiles the streamed Typst via the free /api/compile). Editing is FREE — no
 * credit is ever charged here; only an explicit "Save as version" persists a new
 * (uncharged) version.
 */
export function AssistantContent({ jobId }: { jobId: string }) {
  const router = useRouter();
  const user = useUser();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [typstCode, setTypstCode] = useState(''); // live preview (may be a streaming draft)
  const [committedTypst, setCommittedTypst] = useState(''); // last successfully-saved render (revert target)
  const [resumeData, setResumeData] = useState<ResumeData | null>(null); // last SAVED resume (what "Save as version" sends)
  const [templateId, setTemplateId] = useState('two-column');
  // Cover letter — tracked INDEPENDENTLY of the resume (its own draft/commit/revert),
  // mirroring the resume state above. `coverLetter` is the last SAVED letter body
  // (what "Save as version" sends); '' when the resume has no letter.
  const [coverLetter, setCoverLetter] = useState('');
  const [letterTypst, setLetterTypst] = useState(''); // live letter preview
  const [committedLetterTypst, setCommittedLetterTypst] = useState(''); // revert target
  const [letterDirty, setLetterDirty] = useState(false); // letter changed this session → include in save
  const [preview, setPreview] = useState<'resume' | 'letter'>('resume');
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'init' | 'ready' | 'error'>('init');
  const [initError, setInitError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  // Below lg the chat and preview stack; this segmented control picks which one
  // is visible. Both regions stay mounted (hidden via CSS) so chat state and
  // scroll survive a toggle.
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');

  const idRef = useRef(0);
  const nextId = () => `e${(idRef.current += 1)}`;
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user === null) router.push(`/handler/sign-in?after_auth_return_to=/resumes/${jobId}/assistant`);
  }, [user, router, jobId]);

  // Map a persisted message to a transcript entry (tool rows become chips).
  const toEntry = useCallback((m: StoredMessage): ChatEntry | null => {
    if (m.role === 'user') return { kind: 'user', id: nextId(), text: m.content };
    if (m.role === 'assistant' && m.content.trim()) return { kind: 'assistant', id: nextId(), text: m.content };
    if (m.role === 'tool' && m.toolName) {
      const error = Boolean(m.toolResult && typeof m.toolResult === 'object' && 'error' in (m.toolResult as object));
      return { kind: 'tool', id: nextId(), toolName: m.toolName, error };
    }
    return null;
  }, []);

  // Open (or resume) the thread + load its messages and current working resume.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const createRes = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationJobId: jobId }),
        });
        if (!createRes.ok) {
          if (!cancelled) {
            setInitError(createRes.status === 404 ? 'Resume not found.' : 'Could not open the assistant.');
            setPhase('error');
          }
          return;
        }
        const { thread } = await createRes.json();
        const detailRes = await fetch(`/api/threads/${thread.id}`);
        if (!detailRes.ok) {
          if (!cancelled) {
            setInitError('Could not load the conversation.');
            setPhase('error');
          }
          return;
        }
        const { messages, snapshot } = await detailRes.json();
        if (cancelled) return;
        setThreadId(thread.id);
        setEntries((messages as StoredMessage[]).map(toEntry).filter((e): e is ChatEntry => e !== null));
        if (snapshot) {
          setTypstCode(snapshot.typstCode);
          setCommittedTypst(snapshot.typstCode);
          setResumeData(snapshot.resumeData);
          setTemplateId(snapshot.templateId ?? 'two-column');
          setCoverLetter(snapshot.coverLetter ?? '');
          setLetterTypst(snapshot.coverLetterTypst ?? '');
          setCommittedLetterTypst(snapshot.coverLetterTypst ?? '');
        } else {
          setUnavailable(true);
        }
        setPhase('ready');
      } catch {
        if (!cancelled) {
          setInitError('Could not open the assistant.');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, jobId, toEntry]);

  // Auto-scroll the transcript on new entries.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries, streaming]);

  /** Immutably update one entry by id. */
  const updateEntry = (id: string, fn: (e: ChatEntry) => ChatEntry) =>
    setEntries((cur) => cur.map((e) => (e.id === id ? fn(e) : e)));

  const send = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!threadId || streaming || !message || unavailable) return;
      setInput('');
      setTurnError(null);
      setSavedId(null);
      setEntries((cur) => [...cur, { kind: 'user', id: nextId(), text: message }]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let assistantId: string | null = null;
      // Streamed edits are a DRAFT shown live; they only become saveable once the
      // turn persists ('saved'). A failed/aborted turn reverts the preview to the
      // last committed render and never marks the resume saveable.
      const revertTypst = committedTypst;
      const revertLetterTypst = committedLetterTypst;
      let draftResume: ResumeData | null = null;
      let draftTypst: string | null = null;
      // Cover letter draft (independent of the resume draft above).
      let draftCoverLetter: string | null = null;
      let draftLetterTypst: string | null = null;
      let savedThisTurn = false;

      try {
        const res = await fetch(`/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          let msg = 'The assistant is unavailable right now.';
          try {
            const env = await res.json();
            msg = env?.error?.message ?? msg;
          } catch {
            /* non-JSON */
          }
          setTurnError(msg);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const line = part.replace(/^data: /, '').trim();
            if (!line) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(line);
            } catch {
              continue;
            }
            switch (ev.type) {
              case 'tool-call':
                setEntries((cur) => [...cur, { kind: 'tool', id: nextId(), toolName: String(ev.toolName), error: false }]);
                break;
              case 'tool-result': {
                const isError = Boolean(ev.toolResult && typeof ev.toolResult === 'object' && 'error' in (ev.toolResult as object));
                if (isError) {
                  // Mark the most recent matching tool chip as errored.
                  setEntries((cur) => {
                    const copy = [...cur];
                    for (let i = copy.length - 1; i >= 0; i--) {
                      const e = copy[i];
                      if (e.kind === 'tool' && e.toolName === ev.toolName && !e.error) {
                        copy[i] = { ...e, error: true };
                        break;
                      }
                    }
                    return copy;
                  });
                }
                break;
              }
              case 'resume':
                // Live draft preview only; not saveable until 'saved' arrives.
                draftTypst = String(ev.typstCode ?? '');
                draftResume = (ev.resumeData as ResumeData) ?? draftResume;
                if (typeof ev.templateId === 'string') setTemplateId(ev.templateId);
                setTypstCode(draftTypst);
                setPreview('resume');
                break;
              case 'cover-letter':
                // Live letter draft (independent of the resume). Surface it by
                // switching the preview to the letter so the edit is visible.
                draftLetterTypst = String(ev.coverLetterTypst ?? '');
                draftCoverLetter = String(ev.coverLetter ?? '');
                setLetterTypst(draftLetterTypst);
                setPreview('letter');
                break;
              case 'saved':
                savedThisTurn = true;
                break;
              case 'text': {
                const text = String(ev.text ?? '');
                if (!text) break;
                if (assistantId === null) {
                  assistantId = nextId();
                  const id = assistantId;
                  setEntries((cur) => [...cur, { kind: 'assistant', id, text }]);
                } else {
                  const id = assistantId;
                  updateEntry(id, (e) => (e.kind === 'assistant' ? { ...e, text: e.text + text } : e));
                }
                break;
              }
              case 'error':
                setTurnError(String(ev.message ?? 'The assistant ran into a problem.'));
                break;
              default:
                break;
            }
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setTurnError('The assistant ran into a problem. Please try again.');
        }
      } finally {
        // Commit the streamed edits ONLY if the turn persisted ('saved'); otherwise
        // revert the live preview to the last committed render and leave the
        // saveable resume/letter untouched (a failed/aborted turn is never saveable).
        // Resume and letter are committed/reverted independently.
        if (savedThisTurn && draftResume && draftTypst !== null) {
          setResumeData(draftResume);
          setCommittedTypst(draftTypst);
          setDirty(true);
        } else if (draftTypst !== null) {
          setTypstCode(revertTypst);
        }
        if (savedThisTurn && draftCoverLetter !== null && draftLetterTypst !== null) {
          setCoverLetter(draftCoverLetter);
          setCommittedLetterTypst(draftLetterTypst);
          setLetterDirty(true);
          setDirty(true);
        } else if (draftLetterTypst !== null) {
          setLetterTypst(revertLetterTypst);
        }
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [threadId, streaming, unavailable, committedTypst, committedLetterTypst]
  );

  const saveVersion = useCallback(async () => {
    if (!resumeData || saving || !dirty) return;
    setSaving(true);
    setTurnError(null);
    try {
      const res = await fetch(`/api/resumes/${jobId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Include the edited cover letter only when it changed this session; the
        // server regenerates its Typst (client Typst is never trusted) and carries
        // the parent's letter forward untouched otherwise.
        body: JSON.stringify({ resumeData, templateId, ...(letterDirty && coverLetter ? { coverLetter } : {}) }),
      });
      if (!res.ok) throw new Error('save failed');
      const { id } = await res.json();
      setSavedId(id);
      setDirty(false);
      setLetterDirty(false);
    } catch {
      setTurnError('Could not save this as a new version. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [resumeData, saving, dirty, jobId, templateId, letterDirty, coverLetter]);

  // Show the Resume/Letter toggle only once the thread has a cover letter to show
  // (either a saved one from the anchor/prior edits, or one drafted this session).
  const hasLetter = Boolean(coverLetter || letterTypst);

  if (user === undefined || user === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/resumes" />
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/resumes" />
      <main className="page-shell page-pad-b mx-auto max-w-content px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-aubergine">
              Edit with AI
            </h1>
            <p className="mt-2 text-muted-foreground">
              Describe a change and watch your resume update — chatting and edits are free.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="success">Free · no credit</Badge>
            <button
              onClick={() => router.push('/resumes')}
              className="text-sm text-aubergine underline underline-offset-4 transition-colors hover:text-periwinkle"
            >
              Back
            </button>
          </div>
        </div>

        {phase === 'error' ? (
          <div className="max-w-xl rounded-3xl border border-ash bg-white p-8">
            <div className="mb-2 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-ink" />
              <p className="font-medium text-rose-ink">{initError}</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/resumes')} className="mt-2">
              Back to My Resumes
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile-only Chat / Preview segmented control (both regions stay
                mounted; hidden via CSS so chat state and scroll are preserved). */}
            <div className="mb-4 flex lg:hidden">
              <div className="inline-flex rounded-full bg-bone p-1">
                {(['chat', 'preview'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMobileView(tab)}
                    className={`pill-interactive rounded-full px-4 py-1.5 text-caption capitalize transition-colors ${
                      mobileView === tab ? 'bg-white text-aubergine' : 'text-muted-foreground hover:text-aubergine'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
            {/* Chat column */}
            <FadeIn className={`${mobileView === 'chat' ? 'flex' : 'hidden'} h-[70vh] flex-col overflow-hidden rounded-3xl border border-ash bg-white lg:flex`}>
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
                {phase === 'init' ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Opening conversation…</span>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="mb-1 font-medium text-aubergine">Ask for an edit</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Try one of these to get started:
                    </p>
                    <div className="mx-auto flex max-w-sm flex-col items-stretch gap-2">
                      {STARTERS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          disabled={unavailable}
                          className="rounded-2xl border border-ash bg-white px-4 py-3 text-left text-sm text-aubergine transition-colors hover:bg-bone disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  entries.map((e) =>
                    e.kind === 'tool' ? (
                      <div key={e.id} className="flex justify-center">
                        <span className={`text-caption ${e.error ? 'text-rose-ink' : 'text-muted-foreground'}`}>
                          {toolLabel(e.toolName)}
                          {e.error ? ' — skipped' : ''}
                        </span>
                      </div>
                    ) : (
                      <div key={e.id} className={`flex ${e.kind === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-3 text-sm ${
                            e.kind === 'user'
                              ? 'bg-bone text-obsidian'
                              : 'border border-ash bg-white text-obsidian'
                          }`}
                        >
                          {e.text}
                        </div>
                      </div>
                    )
                  )
                )}
                {streaming && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-caption">Working…</span>
                  </div>
                )}
              </div>

              {/* Errors + composer */}
              {turnError && (
                <div className="flex items-center gap-2 border-t border-ash bg-blush/30 px-6 py-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-ink" />
                  <span className="text-caption text-rose-ink">{turnError}</span>
                </div>
              )}
              {savedId && (
                <div className="flex items-center justify-between gap-2 border-t border-ash bg-mint/15 px-6 py-3">
                  <span className="flex items-center gap-2 text-caption text-mint-ink">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved as a new version.
                  </span>
                  <button
                    onClick={() => router.push(`/editor?job=${savedId}`)}
                    className="text-caption text-aubergine underline underline-offset-4"
                  >
                    Open it
                  </button>
                </div>
              )}
              <div className="border-t border-ash p-4">
                {unavailable ? (
                  <p className="py-2 text-center text-caption text-muted-foreground">
                    The resume this conversation edits is no longer available.
                  </p>
                ) : (
                  <div className="flex items-end gap-2 rounded-full border border-ash bg-white py-1.5 pl-4 pr-2 transition-colors focus-within:border-periwinkle focus-within:ring-2 focus-within:ring-periwinkle/40">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      placeholder="e.g. Tighten my summary to two sentences"
                      rows={1}
                      disabled={streaming || phase !== 'ready'}
                      className="min-h-0 flex-1 border-0 bg-transparent px-0 py-1.5 focus:border-0 focus:ring-0"
                    />
                    <Button
                      onClick={() => send(input)}
                      disabled={streaming || phase !== 'ready' || !input.trim()}
                      size="icon"
                      className="flex-shrink-0"
                      aria-label="Send message"
                    >
                      {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Live PDF column */}
            <FadeIn delay={0.06} className={`${mobileView === 'preview' ? 'flex' : 'hidden'} min-h-[70vh] flex-col gap-4 lg:flex`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-caption text-muted-foreground">Live preview</span>
                  {/* Resume / Letter toggle — only when the resume has a cover letter. */}
                  {hasLetter && (
                    <div className="inline-flex rounded-full bg-bone p-1">
                      {(['resume', 'letter'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setPreview(tab)}
                          className={`pill-interactive rounded-full px-3 py-1 text-caption capitalize transition-colors ${
                            preview === tab ? 'bg-white text-aubergine' : 'text-muted-foreground hover:text-aubergine'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={saveVersion}
                  disabled={!dirty || saving || !resumeData}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save as new version · Free
                </Button>
              </div>
              <LivePdfPreview
                typstCode={preview === 'letter' ? letterTypst : typstCode}
                filename={preview === 'letter' ? 'cover-letter' : 'resume'}
              />
            </FadeIn>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
