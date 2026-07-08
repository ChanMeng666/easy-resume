import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { FadeIn } from '@/components/shared/FadeIn';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { CopyBlock } from '@/components/shared/CopyBlock';
import { ILLUSTRATIONS } from '@/lib/illustrations';

export const metadata: Metadata = {
  title: 'Connect your AI — Vitex',
  description:
    'Drive the same Vitex pipeline from ChatGPT, Claude, your terminal, or any MCP client — no API key to paste.',
};

/** The one hosted MCP endpoint every remote connector points at. */
const MCP_URL = 'https://www.vitex.org.nz/api/mcp';

/** GitHub source for the v1 reference (docs are not served by the app itself). */
const V1_DOCS_URL =
  'https://github.com/ChanMeng666/easy-resume/blob/master/docs/api/v1.md';

interface ConnectSection {
  id: string;
  title: string;
  steps: ReactNode[];
  copy?: { code: string; label?: string };
  /** A short trailing note under the steps (e.g. how to revoke). */
  note?: ReactNode;
}

const SECTIONS: ConnectSection[] = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    steps: [
      <>
        Open <strong className="font-medium">Settings → Connectors</strong> (on
        some plans this lives under <strong className="font-medium">Apps</strong>{' '}
        or needs <strong className="font-medium">Developer mode</strong> enabled).
      </>,
      <>
        Choose <strong className="font-medium">Add custom connector</strong> and
        paste the MCP server URL below.
      </>,
      <>
        Name it <span className="font-mono">Vitex</span>, then sign in with your
        Vitex account in the browser and approve access.
      </>,
    ],
    copy: { code: MCP_URL, label: 'MCP server URL' },
    note: (
      <>
        The connection shows up in your Vitex dashboard as an API key labeled{' '}
        <span className="font-mono">MCP: …</span> — revoke it there any time to
        disconnect.
      </>
    ),
  },
  {
    id: 'claude',
    title: 'Claude',
    steps: [
      <>
        Open <strong className="font-medium">Settings → Connectors</strong> and
        click <strong className="font-medium">Add custom connector</strong>.
      </>,
      <>Paste the same remote MCP server URL below and add it.</>,
      <>
        Sign in with your Vitex account and approve — the tools then appear in
        Claude on the web and in Claude Desktop.
      </>,
    ],
    copy: { code: MCP_URL, label: 'Remote MCP server URL' },
  },
  {
    id: 'cli',
    title: 'Terminal (CLI)',
    steps: [
      <>
        Create an API key on your{' '}
        <a
          href="/dashboard"
          className="text-aubergine underline underline-offset-4 hover:text-periwinkle"
        >
          dashboard
        </a>{' '}
        and set it as <span className="font-mono">VITEX_API_KEY</span> in your
        shell.
      </>,
      <>Run the CLI — it drives the same public v1 API the web app uses.</>,
      <>
        Check your credit balance any time with{' '}
        <span className="font-mono">vitex whoami</span>.
      </>,
    ],
    copy: { code: 'npx vitex-cli' },
  },
  {
    id: 'mcp-stdio',
    title: 'Claude Code / Cursor (stdio MCP)',
    steps: [
      <>
        Add Vitex as an MCP server in your client config (e.g.{' '}
        <span className="font-mono">claude_desktop_config.json</span> or your
        Cursor settings) with the command below.
      </>,
      <>
        Set <span className="font-mono">VITEX_API_KEY</span> in that server&apos;s{' '}
        <span className="font-mono">env</span> — the stdio server exposes the same
        nine tools as the hosted connector.
      </>,
    ],
    copy: { code: 'npx -y vitex-cli mcp', label: 'Server command' },
  },
];

/** Agent-facing machine-readable resources, one line each. */
const AGENT_LINKS: { href: string; label: string; desc: string }[] = [
  { href: '/openapi.yaml', label: 'openapi.yaml', desc: 'OpenAPI 3.1 spec for the v1 API.' },
  { href: '/llms.txt', label: 'llms.txt', desc: 'A compact map of the product for LLMs.' },
  { href: '/skill.md', label: 'skill.md', desc: 'A curl playbook an agent can follow.' },
  { href: V1_DOCS_URL, label: 'v1 API reference', desc: 'The full endpoint reference on GitHub.' },
];

/**
 * "Connect your AI" — a static, server-rendered guide for pointing ChatGPT,
 * Claude, the CLI, or a stdio MCP client at the same Vitex pipeline. The API is
 * the UI: every surface here is a thin adapter over one shared backend core.
 */
export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/connect" />

      <PageShell>
        <PageHeader
          eyebrow="The API is the UI"
          title="Connect your AI"
          lede="Drive the same pipeline from ChatGPT, Claude, your terminal, or any MCP client — no API key to paste."
          actions={
            <Image
              src={ILLUSTRATIONS.connections.src}
              alt={ILLUSTRATIONS.connections.alt}
              width={ILLUSTRATIONS.connections.width}
              height={ILLUSTRATIONS.connections.height}
              priority
              className="hidden h-auto w-48 lg:block"
            />
          }
        />

        <div className="space-y-6">
          {SECTIONS.map((section, idx) => (
            <FadeIn key={section.id} delay={idx * 0.06}>
              <section
                id={section.id}
                className="scroll-mt-28 rounded-3xl border border-ash bg-white p-8"
              >
                <h2 className="text-2xl text-aubergine">{section.title}</h2>
                <ol className="mt-5 space-y-3">
                  {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-obsidian">
                      <span
                        aria-hidden
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-bone text-caption text-aubergine"
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed text-muted-foreground">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                {section.copy && (
                  <CopyBlock
                    code={section.copy.code}
                    label={section.copy.label}
                    className="mt-5"
                  />
                )}
                {section.note && (
                  <p className="mt-4 text-caption text-muted-foreground">
                    {section.note}
                  </p>
                )}
              </section>
            </FadeIn>
          ))}
        </div>

        {/* For agents — machine-readable resources (bone panel, never dark). */}
        <FadeIn delay={SECTIONS.length * 0.06}>
          <section className="mt-6 rounded-3xl border border-ash bg-bone p-8">
            <h2 className="text-xl text-aubergine">For agents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Machine-readable entry points if you want to skip the setup and call
              Vitex directly.
            </p>
            <ul className="mt-5 space-y-3">
              {AGENT_LINKS.map((link) => (
                <li key={link.href} className="text-sm">
                  <a
                    href={link.href}
                    className="font-mono text-aubergine underline underline-offset-4 hover:text-periwinkle"
                  >
                    {link.label}
                  </a>
                  <span className="text-muted-foreground"> — {link.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </FadeIn>
      </PageShell>

      <Footer />
    </div>
  );
}
