import Image from 'next/image';
import Link from 'next/link';
import { Mail, Github, Sparkles, Briefcase, MessageSquare, Palette, PenTool, LayoutDashboard, Bot } from 'lucide-react';

/**
 * Neobrutalism styled footer with brand identity and developer information.
 * Features thin borders (1px) for non-interactive elements and clean grid layout.
 */
export function Footer() {
  return (
    <footer className="relative bg-white border-t-2 border-black">
      <div className="container mx-auto px-4 py-16">
        {/* Top Section: Brand Identity */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex flex-col items-center justify-center gap-4">
            <Link href="/">
              <Image
                src="/logo/vitex-logo-black.svg"
                alt="Vitex"
                width={200}
                height={86}
                className="h-auto hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground font-medium leading-relaxed">
            Your Career, Perfectly Composed. AI-powered resume builder with professional LaTeX templates.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Product - Editors */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider mb-4">
              <div className="p-1.5 bg-primary rounded-md">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Editors
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/editor" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <Bot className="h-4 w-4" />
                  AI Editor
                </Link>
              </li>
              <li>
                <Link href="/editor/manual" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <PenTool className="h-4 w-4" />
                  Manual Editor
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider mb-4">
              <div className="p-1.5 bg-accent rounded-md">
                <Palette className="h-4 w-4 text-white" />
              </div>
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/templates" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <Palette className="h-4 w-4" />
                  Templates
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:translate-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider mb-4">
              <div className="p-1.5 bg-purple-500 rounded-md">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              Developer
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-lg">
                  <Image
                    src="/chan_logo.svg"
                    alt="Chan Meng"
                    width={40}
                    height={40}
                    className="rounded-md"
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
          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider mb-4">
              <div className="p-1.5 bg-cyan-500 rounded-md">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              Contact
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
        <div className="border-t-2 border-black pt-8 text-center">
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
            . AI-powered resume builder for your career success.
          </p>
        </div>
      </div>
    </footer>
  );
}
