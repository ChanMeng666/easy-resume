/**
 * Public career profile page (`/p/{slug}`) — the human-readable face of a
 * published candidate profile. Server component, no auth: it renders ONLY the
 * allowlist projection (`getPublicProfileBySlug`), and 404s for an unknown or
 * unpublished slug. Read-optimized Phantom: a single column, whisper-weight
 * type, generous whitespace, print-friendly. Its machine twins are
 * `/p/{slug}/json` and `/p/{slug}/md`, advertised via <link rel="alternate">
 * in the metadata.
 */

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProfileBySlug, type PublicProfile } from '@/server/profiles/store';
import { safePublicUrl } from '@/server/profiles/publicUrl';
import { formatDateRange } from '@/lib/typst/utils';
import { Button } from '@/components/ui/button';

export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// De-dupe the profile lookup within one request: generateMetadata and the page
// component both resolve the same slug, so React cache() collapses them to a
// single DB query per render.
const loadProfile = cache(getPublicProfileBySlug);

/**
 * SEO + agent-discovery metadata. Indexable, with the JSON/Markdown
 * representations advertised as alternates so a crawler or agent can find them.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  // notFound() here (before streaming starts) makes the response a real HTTP
  // 404; thrown only from the page body it would stream a soft 404 with a 200.
  if (!profile) notFound();
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

/** A light-weight aubergine section heading over an ash divider. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-light tracking-tight text-aubergine mb-5 pb-3 border-b border-ash">
      {children}
    </h2>
  );
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile: PublicProfile | null = await loadProfile(slug);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Quiet top bar: whose profile, plus its machine-readable twins. */}
      <div className="border-b border-ash print:hidden">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="truncate text-body-sm font-medium text-aubergine">{profile.name}</span>
          <nav className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm">
              <a href={`/p/${slug}/json`}>JSON</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/p/${slug}/md`}>Markdown</a>
            </Button>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 print:px-0 print:py-0">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-light tracking-tight text-aubergine sm:text-4xl">
            {profile.name}
          </h1>
          {profile.headline && (
            <p className="mt-3 text-lead text-fog-deep">{profile.headline}</p>
          )}
          {profile.location && (
            <p className="mt-2 text-body-sm text-muted-foreground">{profile.location}</p>
          )}
          {profile.profiles.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {profile.profiles.map((p, i) => {
                const href = safePublicUrl(p.url);
                const pillClass =
                  'inline-flex items-center rounded-full border border-ash px-3 py-1 text-caption text-aubergine transition-colors';
                return (
                  <li key={i}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={`${pillClass} hover:bg-bone`}
                      >
                        {p.label || p.network}
                      </a>
                    ) : (
                      <span className={pillClass}>{p.label || p.network}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </header>

        <div className="space-y-12">
          {/* Summary */}
          {profile.summary && (
            <section>
              <SectionHeading>Summary</SectionHeading>
              <p className="text-body-sm leading-relaxed text-obsidian">{profile.summary}</p>
            </section>
          )}

          {/* Experience */}
          {profile.work.length > 0 && (
            <section>
              <SectionHeading>Experience</SectionHeading>
              <div className="space-y-8">
                {profile.work.map((w, i) => (
                  <div key={i} className="work-item">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-base font-medium text-aubergine">
                        {w.position}
                        {w.company && <span className="text-fog-deep"> · {w.company}</span>}
                      </h3>
                      <span className="whitespace-nowrap text-caption text-muted-foreground">
                        {formatDateRange(w.startDate, w.endDate)}
                      </span>
                    </div>
                    {(w.location || w.type) && (
                      <p className="mt-1 text-caption text-muted-foreground">
                        {[w.location, w.type].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {w.highlights.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-body-sm leading-relaxed text-obsidian">
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
            <section>
              <SectionHeading>Projects</SectionHeading>
              <div className="space-y-8">
                {profile.projects.map((p, i) => {
                  const href = p.url ? safePublicUrl(p.url) : null;
                  return (
                    <div key={i} className="project-item">
                      <h3 className="text-base font-medium text-aubergine">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="underline-offset-2 hover:underline"
                          >
                            {p.name}
                          </a>
                        ) : (
                          p.name
                        )}
                      </h3>
                      {p.description && (
                        <p className="mt-1.5 text-body-sm leading-relaxed text-obsidian">
                          {p.description}
                        </p>
                      )}
                      {p.highlights.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-body-sm leading-relaxed text-obsidian">
                          {p.highlights.map((h, j) => (
                            <li key={j}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Education */}
          {profile.education.length > 0 && (
            <section>
              <SectionHeading>Education</SectionHeading>
              <div className="space-y-6">
                {profile.education.map((e, i) => (
                  <div key={i} className="education-item">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="text-base font-medium text-aubergine">
                        {[e.studyType, e.area].filter(Boolean).join(', ') || e.institution}
                      </h3>
                      <span className="whitespace-nowrap text-caption text-muted-foreground">
                        {formatDateRange(e.startDate, e.endDate)}
                      </span>
                    </div>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {[e.institution, e.location, e.gpa ? `GPA: ${e.gpa}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {e.note && (
                      <p className="mt-1.5 text-body-sm leading-relaxed text-obsidian">{e.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <section>
              <SectionHeading>Skills</SectionHeading>
              <div className="space-y-4">
                {profile.skills.map((s, i) => (
                  <div key={i}>
                    <p className="text-body-sm font-medium text-aubergine">{s.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.keywords.map((k, j) => (
                        <span key={j} className="skill-tag">
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
            <section>
              <SectionHeading>Achievements</SectionHeading>
              <ul className="list-disc space-y-1.5 pl-5 text-body-sm leading-relaxed text-obsidian">
                {profile.achievements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Certifications */}
          {profile.certifications.length > 0 && (
            <section>
              <SectionHeading>Certifications</SectionHeading>
              <ul className="list-disc space-y-1.5 pl-5 text-body-sm leading-relaxed text-obsidian">
                {profile.certifications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer: agent-readable hint + attribution */}
        <footer className="mt-16 border-t border-ash pt-6 print:hidden">
          <p className="text-caption text-muted-foreground">
            Readable by AI agents:{' '}
            <a href={`/p/${slug}/json`} className="text-aubergine hover:underline">
              /json
            </a>{' '}
            ·{' '}
            <a href={`/p/${slug}/md`} className="text-aubergine hover:underline">
              /md
            </a>
          </p>
          <p className="mt-2 text-caption text-muted-foreground">
            Published with{' '}
            <Link href="/" className="text-aubergine hover:underline">
              Vitex
            </Link>{' '}
            — LinkedIn is for humans; a Vitex endpoint is for AIs.
          </p>
        </footer>
      </main>
    </div>
  );
}
