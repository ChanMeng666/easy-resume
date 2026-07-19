import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { FadeIn } from '@/components/shared/FadeIn';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';

export const metadata: Metadata = {
  title: 'Privacy Policy — Vitex',
  description:
    'How Vitex collects, uses, stores, and shares your data — grounded in what the product actually does.',
};

/** Last substantive update to this policy. */
const EFFECTIVE_DATE = '19 July 2026';

/** Where privacy questions and deletion requests go. */
const CONTACT_EMAIL = 'chanmeng.dev@gmail.com';

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          Vitex (<span className="font-mono">vitex.org.nz</span>) is an AI resume
          generator: you provide a job description and your background, and Vitex
          produces a tailored, ATS-optimized resume PDF and cover letter. This
          policy explains exactly what data that involves. It is written to match
          what the product actually does — not a generic template.
        </p>
        <p className="mt-3">
          Vitex is operated by Chan Meng, the data controller for the purposes of
          this policy. For any privacy question or request, see{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-aubergine underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <ul className="space-y-3">
        <li>
          <span className="text-obsidian">Account.</span> Authentication is handled
          by Neon Auth (Stack Auth). When you sign in we hold the identity it
          provides (such as your email) and a cookie session for the web app.
        </li>
        <li>
          <span className="text-obsidian">Resume content you provide.</span> Job
          descriptions, your background text, the generated resumes and cover
          letters, any saved candidate profiles, and an optional writing
          &quot;voice sample&quot; you may add so cover letters match your style.
        </li>
        <li>
          <span className="text-obsidian">Billing.</span> Payments run through
          Stripe. Card details are entered on Stripe and never touch Vitex servers;
          we store only the resulting credit balance and transaction records.
        </li>
        <li>
          <span className="text-obsidian">Product analytics.</span> We record a
          small set of server-side funnel events (for example{' '}
          <span className="font-mono">signup</span> or{' '}
          <span className="font-mono">generation_succeeded</span>) with a userId and
          a small bag of non-PII fields. This deliberately{' '}
          <span className="text-obsidian">never</span> includes your raw resume or
          job-description text or contact details. There is no browser analytics
          SDK, no third-party analytics, and no advertising trackers — our Content
          Security Policy permits no analytics origins.
        </li>
        <li>
          <span className="text-obsidian">Attribution cookie.</span> If you arrive
          via a campaign link, a single first-party cookie (
          <span className="font-mono">vitex_attr</span>) stores the campaign
          parameters (<span className="font-mono">utm_source</span>,{' '}
          <span className="font-mono">utm_medium</span>,{' '}
          <span className="font-mono">utm_campaign</span>,{' '}
          <span className="font-mono">ref</span>) so a later signup can be
          attributed to a channel. It is first-touch (never overwritten),
          server-read only (<span className="font-mono">httpOnly</span>), and expires
          after 90 days.
        </li>
      </ul>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use your data',
    body: (
      <ul className="space-y-3">
        <li>To generate, refine, and re-open your resumes and cover letters.</li>
        <li>To keep your generation history and saved profiles available to you.</li>
        <li>
          To bill outcome-based credits — one credit only when a resume PDF is
          successfully compiled; refinements, AI edits, and failed builds are free.
        </li>
        <li>To understand, in aggregate, how people find and move through Vitex.</li>
      </ul>
    ),
  },
  {
    id: 'processors',
    title: 'Who processes your data',
    body: (
      <>
        <p>We rely on a small set of third-party processors:</p>
        <ul className="mt-3 space-y-3">
          <li>
            <span className="text-obsidian">OpenAI</span> — to generate and refine
            resume and cover-letter content, your background and the job-description
            text are sent to the OpenAI API. Recording of raw prompt inputs/outputs
            on our AI telemetry spans is off by default.
          </li>
          <li>
            <span className="text-obsidian">Stripe</span> — payment processing. Card
            data is collected by Stripe directly and never reaches Vitex.
          </li>
          <li>
            <span className="text-obsidian">Neon</span> — the Postgres database that
            stores your account, resumes, profiles, and credit records.
          </li>
          <li>
            <span className="text-obsidian">Cloudflare R2</span> — object storage for
            compiled PDF files (when configured).
          </li>
          <li>
            <span className="text-obsidian">DigitalOcean</span> — hosting for the
            application server.
          </li>
        </ul>
        <p className="mt-3">
          We do not sell your data or share it for advertising.
        </p>
      </>
    ),
  },
  {
    id: 'public-pages',
    title: 'Public career pages',
    body: (
      <p>
        Publishing a candidate profile to a public page (
        <span className="font-mono">/p/&lt;slug&gt;</span>) is strictly opt-in. When
        you publish, only an explicit allowlist of fields is exposed. Contact
        details — email, phone, and photo — along with your raw background text and
        any voice sample are deliberately excluded and are never placed on the
        public page. The URL uses an unguessable slug, and you can unpublish at any
        time.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security & API keys',
    body: (
      <p>
        Traffic is served over HTTPS with HSTS and site-wide security headers. API
        keys (used for agent/CLI/MCP access) are stored only as SHA-256 hashes — the
        raw token is shown once at creation and never stored in a recoverable form.
        You can revoke any key or connection from your dashboard.
      </p>
    ),
  },
  {
    id: 'retention-deletion',
    title: 'Retention & deletion',
    body: (
      <p>
        You control your content. Deleting a resume from &quot;My Resumes&quot; (or
        via the API) removes the record and its stored PDF files. To delete your account and
        associated data, contact us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-aubergine underline underline-offset-2">
          {CONTACT_EMAIL}
        </a>{' '}
        and we will remove it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If this policy changes materially, we will update the effective date above
        and, where appropriate, note the change on this page.
      </p>
    ),
  },
];

/**
 * Static privacy policy page. Server-rendered, Phantom-styled, and grounded in
 * the product's actual data handling (analytics, processors, public-page
 * allowlist, hashed API keys). Required for MCP-directory submissions.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/privacy" />

      <PageShell width="narrow">
        <PageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          lede={`How Vitex collects, uses, stores, and shares your data. Effective ${EFFECTIVE_DATE}.`}
        />

        <div className="space-y-6">
          {SECTIONS.map((section, idx) => (
            <FadeIn key={section.id} delay={idx * 0.05}>
              <section
                id={section.id}
                className="scroll-mt-28 rounded-3xl border border-ash bg-white p-8"
              >
                <h2 className="text-2xl text-aubergine">{section.title}</h2>
                <div className="mt-4 leading-relaxed text-muted-foreground">
                  {section.body}
                </div>
              </section>
            </FadeIn>
          ))}
        </div>
      </PageShell>

      <Footer />
    </div>
  );
}
