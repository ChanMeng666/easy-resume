import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  currentPath?: string;
}

export function Navbar({ currentPath = '/' }: NavbarProps) {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easy-resume.svg" alt="Easy Resume" width={32} height={32} />
            <span className="text-xl font-bold">Easy Resume</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/templates"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                currentPath === '/templates' ? 'text-primary' : 'text-foreground'
              }`}
            >
              Templates
            </Link>
            <a
              href="https://github.com/yourusername/easy-resume"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              GitHub
            </a>
            <Link href="/editor">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
