import Image from 'next/image';
import Link from 'next/link';
import { Mail, Github, Sparkles, Briefcase, MessageSquare, LayoutDashboard, CreditCard } from 'lucide-react';

/**
 * Site footer — "typeset proof" treatment: monospace section labels, a single
 * disciplined ink accent (no rainbow badges), and crop marks on the brand block.
 */
export function Footer() {
  return (
    <footer className="relative bg-white border-t-2 border-black">
      <div className="container mx-auto px-4 py-10 sm:py-16">
        {/* Top Section: Brand Identity */}
        <div className="mb-10 sm:mb-16 text-center">
          <div className="mb-6 flex flex-col items-center justify-center gap-4">
            <Link href="/" aria-label="Vitex home">
              <Image
                src="/logo/vitex-logo-black.svg"
                alt="Vitex"
                width={200}
                height={86}
                className="h-12 w-auto hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground font-medium leading-relaxed">
            Your career, perfectly composed. AI-powered resumes, typeset and compiled to PDF.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="mb-8 sm:mb-12 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
          {/* Product */}
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-black">
            <h3 className="proof-label mb-4 flex items-center gap-2 !text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              §01 — Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <Sparkles className="h-4 w-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <CreditCard className="h-4 w-4" />
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer */}
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-black">
            <h3 className="proof-label mb-4 flex items-center gap-2 !text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              §02 — Developer
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-lg border-2 border-black">
                  <Image
                    src="/chan_logo.svg"
                    alt="Chan Meng"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-md"
                  />
                </div>
                <div>
                  <p className="font-black">Chan Meng</p>
                  <p className="text-xs text-muted-foreground font-medium">Full-Stack Developer</p>
                </div>
              </div>
              <a
                href="https://github.com/ChanMeng666"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1"
              >
                <Github className="h-4 w-4" />
                Portfolio & Projects
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-black">
            <h3 className="proof-label mb-4 flex items-center gap-2 !text-foreground">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              §03 — Contact
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                Open to collaboration and freelance opportunities.
              </p>
              <a
                href="mailto:chanmeng.dev@gmail.com"
                className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1"
              >
                <Mail className="h-4 w-4" />
                chanmeng.dev@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-t-2 border-black pt-6 sm:pt-8 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} Vitex by{' '}
            <a
              href="https://github.com/ChanMeng666"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary transition-colors hover:text-primary/80"
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
