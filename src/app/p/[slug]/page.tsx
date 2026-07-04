/**
 * Public career profile page (`/p/{slug}`) — the human-readable face of a
 * published candidate profile. Server component, no auth: it renders ONLY the
 * allowlist projection (`getPublicProfileBySlug`), and 404s for an unknown or
 * unpublished slug. Read-optimized Neobrutalism: a single column, generous
 * typography, print-friendly. Its machine twins are `/p/{slug}/json` and
 * `/p/{slug}/md`, advertised via <link rel="alternate"> in the metadata.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProfileBySlug, type PublicProfile } from '@/server/profiles/store';
import { formatDateRange } from '@/lib/typst/utils';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * SEO + agent-discovery metadata. Indexable, with the JSON/Markdown
 * representations advertised as alternates so a crawler or agent can find them.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) {
    return { title: 'Profile not found — Vitex', robots: { index: false, follow: false } };
  }
  const title = profile.headline ? `${profile.name} — ${profile.headline}` : profile.name;
  const description =
    profile.summary?.slice(0, 200) ||
    `The public career profile of ${profile.name}, readable by people and AI agents.`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/p/${slug}`,
      types: {
        'application/json': `/p/${slug}/json`,
        'text/markdown': `/p/${slug}/md`,
      },
    },
    openGraph: { title, description, type: 'profile' },
  };
}

/** A bold Neobrutalism section heading with a hard underline. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-black uppercase tracking-tight mb-4 pb-2 border-b-[3px] border-black">
      {children}
    </h2>
  );
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile: PublicProfile | null = await getPublicProfileBySlug(slug);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-[#f0f0f0] py-10 px-4 print:bg-white print:py-0">
      <article className="mx-auto max-w-2xl bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-8 sm:p-10 print:border-0 print:shadow-none print:p-0">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tight leading-tight">{profile.name}</h1>
          {profile.headline && (
            <p className="mt-2 text-lg font-bold text-[#6C3CE9]">{profile.headline}</p>
          )}
          {profile.location && (
            <p className="mt-1 font-mono text-sm text-neutral-600">{profile.location}</p>
          )}
          {profile.profiles.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {profile.profiles.map((p, i) => (
                <li key={i}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-block border-2 border-black rounded-lg px-3 py-1 text-sm font-bold bg-[#00D4AA] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] transition-all"
                  >
                    {p.label || p.network}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </header>

        {/* Summary */}
        {profile.summary && (
          <section className="mb-8">
            <SectionHeading>Summary</SectionHeading>
            <p className="leading-relaxed text-[15px]">{profile.summary}</p>
          </section>
        )}

        {/* Experience */}
        {profile.work.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Experience</SectionHeading>
            <div className="space-y-6">
              {profile.work.map((w, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-black text-base">
                      {w.position}
                      {w.company && <span className="font-bold text-neutral-700"> · {w.company}</span>}
                    </h3>
                    <span className="font-mono text-xs text-neutral-500 whitespace-nowrap">
                      {formatDateRange(w.startDate, w.endDate)}
                    </span>
                  </div>
                  {(w.location || w.type) && (
                    <p className="font-mono text-xs text-neutral-500 mt-0.5">
                      {[w.location, w.type].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {w.highlights.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-[15px] leading-relaxed">
                      {w.highlights.map((h, j) => (
                        <li key={j}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Projects</SectionHeading>
            <div className="space-y-6">
              {profile.projects.map((p, i) => (
                <div key={i}>
                  <h3 className="font-black text-base">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="underline decoration-2 underline-offset-2 hover:text-[#6C3CE9]"
                      >
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                  </h3>
                  {p.description && (
                    <p className="mt-1 text-[15px] leading-relaxed text-neutral-800">{p.description}</p>
                  )}
                  {p.highlights.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-[15px] leading-relaxed">
                      {p.highlights.map((h, j) => (
                        <li key={j}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Education</SectionHeading>
            <div className="space-y-4">
              {profile.education.map((e, i) => (
                <div key={i}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-black text-base">
                      {[e.studyType, e.area].filter(Boolean).join(', ') || e.institution}
                    </h3>
                    <span className="font-mono text-xs text-neutral-500 whitespace-nowrap">
                      {formatDateRange(e.startDate, e.endDate)}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-neutral-500 mt-0.5">
                    {[e.institution, e.location, e.gpa ? `GPA: ${e.gpa}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {e.note && <p className="mt-1 text-[15px] leading-relaxed">{e.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {profile.skills.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Skills</SectionHeading>
            <div className="space-y-3">
              {profile.skills.map((s, i) => (
                <div key={i}>
                  <p className="font-black text-sm uppercase tracking-wide text-neutral-700">
                    {s.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {s.keywords.map((k, j) => (
                      <span
                        key={j}
                        className="inline-block border-2 border-black rounded-md px-2 py-0.5 text-xs font-bold bg-[#f0f0f0]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Achievements */}
        {profile.achievements.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Achievements</SectionHeading>
            <ul className="list-disc pl-5 space-y-1 text-[15px] leading-relaxed">
              {profile.achievements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Certifications */}
        {profile.certifications.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Certifications</SectionHeading>
            <ul className="list-disc pl-5 space-y-1 text-[15px] leading-relaxed">
              {profile.certifications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer: agent-readable hint + attribution */}
        <footer className="mt-10 pt-6 border-t-2 border-black print:hidden">
          <p className="font-mono text-xs text-neutral-600">
            Readable by AI agents:{' '}
            <a href={`/p/${slug}/json`} className="font-bold underline hover:text-[#6C3CE9]">
              /json
            </a>{' '}
            ·{' '}
            <a href={`/p/${slug}/md`} className="font-bold underline hover:text-[#6C3CE9]">
              /md
            </a>
          </p>
          <p className="mt-2 font-mono text-xs text-neutral-500">
            Published with{' '}
            <Link href="/" className="font-bold underline hover:text-[#6C3CE9]">
              Vitex
            </Link>{' '}
            — LinkedIn is for humans; a Vitex endpoint is for AIs.
          </p>
        </footer>
      </article>
    </div>
  );
}
