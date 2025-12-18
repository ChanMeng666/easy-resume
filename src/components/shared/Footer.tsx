import Image from 'next/image';
import Link from 'next/link';
import { Mail, Github, Star, FileText, Palette, Download, Sparkles, Briefcase, MessageSquare, Code } from 'lucide-react';

/**
 * Footer component with brand identity and developer information
 * Features modern design with gradient effects and clear call-to-actions
 */
export function Footer() {
  return (
    <footer className="relative border-t bg-gradient-to-b from-white/80 to-gray-50/80 backdrop-blur-sm dark:from-gray-900/80 dark:to-gray-950/80">
      <div className="container mx-auto px-4 py-16">
        {/* Top Section: Brand Identity */}
        <div className="mb-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-4">
            <Image
              src="/vitex.svg"
              alt="Vitex"
              width={56}
              height={56}
              className="transition-transform hover:scale-110"
            />
            <div className="text-left">
              <h2 className="bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-3xl font-bold text-transparent">
                Vitex
              </h2>
              <p className="text-sm text-muted-foreground">Your Career, Perfectly Composed</p>
            </div>
          </div>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed">
            Create beautiful, ATS-friendly resumes in minutes. No registration, no hassle, completely free.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Product */}
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-primary" />
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/editor" className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                  <FileText className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  Resume Editor
                </Link>
              </li>
              <li>
                <Link href="/templates" className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                  <Palette className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  Templates
                </Link>
              </li>
              <li>
                <a href="#features" className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                  <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Code className="h-4 w-4 text-primary" />
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/ChanMeng666/easy-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Github className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ChanMeng666/easy-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <Star className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
                  Star on GitHub
                </a>
              </li>
              <li>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  Open Source & Free Forever
                </span>
              </li>
            </ul>
          </div>

          {/* Developer */}
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Briefcase className="h-4 w-4 text-primary" />
              Developer
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/chan_logo.svg"
                  alt="Chan Meng"
                  width={48}
                  height={48}
                  className="rounded-lg ring-2 ring-primary/10 transition-transform hover:scale-105"
                />
                <div>
                  <p className="font-semibold">Chan Meng</p>
                  <p className="text-xs text-muted-foreground">Full-Stack Developer</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI/ML Infrastructure Engineer & Full-Stack Developer
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://github.com/ChanMeng666"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Github className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                    Portfolio & Projects
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <MessageSquare className="h-4 w-4 text-primary" />
              Contact
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open to collaboration and freelance opportunities.
              </p>
              <a
                href="mailto:chanmeng.dev@gmail.com"
                className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                chanmeng.dev@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright */}
        <div className="border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vitex by{' '}
            <a
              href="https://github.com/ChanMeng666"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Chan Meng
            </a>
            . Open source and free forever.
          </p>
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </footer>
  );
}
