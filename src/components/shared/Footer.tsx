import Image from 'next/image';
import Link from 'next/link';
import { Github, Sparkles, Terminal, Plug, Code2, LayoutDashboard, CreditCard } from 'lucide-react';

/**
 * Site footer — the one persistent dark aubergine band. Flat surface, quiet
 * periwinkle section labels, and understated white links.
 */
export function Footer() {
  return (
    <footer className="section-dark">
      <div className="mx-auto max-w-content px-4 py-16">
        {/* Top Section: Brand Identity */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex flex-col items-center justify-center gap-4">
            <Link href="/" aria-label="Vitex home">
              <Image
                src="/logo/vitex-logo-white.svg"
                alt="Vitex"
                width={200}
                height={86}
                className="h-12 w-auto transition-opacity hover:opacity-80"
              />
            </Link>
          </div>
          <p className="mx-auto max-w-2xl text-lead text-white/70 leading-relaxed">
            Your career, perfectly composed. AI-powered resumes, typeset and compiled to PDF.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Product */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-caption uppercase tracking-wider text-periwinkle">
              <Sparkles className="h-3.5 w-3.5" />
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
                  <Sparkles className="h-4 w-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
                  <CreditCard className="h-4 w-4" />
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers — the API is the UI: agent surfaces over HTTP */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-caption uppercase tracking-wider text-periwinkle">
              <Terminal className="h-3.5 w-3.5" />
              Developers
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://www.npmjs.com/package/vitex-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Terminal className="h-4 w-4" />
                  CLI (vitex-cli)
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ChanMeng666/easy-resume/blob/master/docs/api/v1.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Code2 className="h-4 w-4" />
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ChanMeng666/easy-resume/blob/master/docs/connectors/claude.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Plug className="h-4 w-4" />
                  MCP Connector
                </a>
              </li>
            </ul>
            <p className="mt-4 text-caption text-white/50">
              Career as Code — the API is the UI.
            </p>
          </div>

          {/* Built By — a modest maker credit, no freelance solicitation */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-caption uppercase tracking-wider text-periwinkle">
              <Github className="h-3.5 w-3.5" />
              Built By
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/chan_logo.svg"
                  alt="Chan Meng"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <p className="text-sm text-white">Chan Meng</p>
                  <p className="text-caption text-white/60">Full-Stack Developer</p>
                </div>
              </div>
              <a
                href="https://github.com/ChanMeng666"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Vitex by{' '}
            <a
              href="https://github.com/ChanMeng666"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white transition-colors hover:text-periwinkle"
            >
              Chan Meng
            </a>
            . Your career, perfectly composed.
          </p>
        </div>
      </div>
    </footer>
  );
}
