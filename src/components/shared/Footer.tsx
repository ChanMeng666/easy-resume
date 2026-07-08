import Image from 'next/image';
import Link from 'next/link';
import { Github } from 'lucide-react';

/** Shared link style for footer entries — understated white, color-only hover. */
const linkClass = 'text-sm text-white/70 transition-colors hover:text-white';

/**
 * Site footer — the one persistent dark aubergine band. Flat surface, quiet
 * periwinkle section labels, understated white links, and text-only navigation
 * organized into Product / For agents / Account columns.
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
            Career as Code — the API is the UI.
          </p>
        </div>

        {/* Main Content Grid — three text columns */}
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Product */}
          <div>
            <h3 className="mb-4 text-caption uppercase tracking-wider text-periwinkle">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#start" className={linkClass}>
                  New resume
                </Link>
              </li>
              <li>
                <Link href="/resumes" className={linkClass}>
                  My Resumes
                </Link>
              </li>
              <li>
                <Link href="/applications" className={linkClass}>
                  Applications
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass}>
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* For agents — the API is the UI: agent surfaces over HTTP */}
          <div>
            <h3 className="mb-4 text-caption uppercase tracking-wider text-periwinkle">
              For agents
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/connect" className={linkClass}>
                  Connect your AI
                </Link>
              </li>
              <li>
                <a href="/openapi.yaml" className={linkClass}>
                  API reference
                </a>
              </li>
              <li>
                <a href="/llms.txt" className={linkClass}>
                  llms.txt
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/vitex-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  CLI on npm
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="mb-4 text-caption uppercase tracking-wider text-periwinkle">
              Account
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className={linkClass}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/profiles" className={linkClass}>
                  Profiles
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: maker credit + copyright */}
        <div className="flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
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
            <a
              href="https://github.com/ChanMeng666"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="ml-1 rounded-full p-2 text-white/70 transition-colors hover:text-white"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
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
