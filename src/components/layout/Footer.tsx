import Image from 'next/image';
import { Mail, Github, Star } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Left: Developer Brand */}
          <div className="flex flex-col items-start space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="/chan_logo.svg"
                alt="Chan Meng"
                width={32}
                height={32}
                className="rounded"
              />
              <div>
                <h3 className="font-semibold text-sm">Chan Meng</h3>
                <p className="text-xs text-muted-foreground">Web Developer & Designer</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Need a custom website? I craft tailored web solutions for businesses and individuals.
            </p>
          </div>

          {/* Center: Project Links */}
          <div className="flex flex-col items-start md:items-center space-y-3">
            <h4 className="text-sm font-semibold">This Project</h4>
            <a
              href="https://github.com/ChanMeng666/easy-resume"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Star className="h-4 w-4" />
              Star on GitHub
            </a>
            <p className="text-xs text-muted-foreground">
              Built with Next.js, Tailwind CSS, and LaTeX
            </p>
          </div>

          {/* Right: Contact */}
          <div className="flex flex-col items-start md:items-end space-y-3">
            <h4 className="text-sm font-semibold">Get in Touch</h4>
            <a
              href="mailto:chanmeng.dev@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              chanmeng.dev@gmail.com
            </a>
            <a
              href="https://github.com/ChanMeng666"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              View Portfolio
            </a>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Chan Meng. Available for freelance projects and collaborations.
          </p>
        </div>
      </div>
    </footer>
  );
}
