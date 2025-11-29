'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/UserButton';
import { ReactNode, Suspense } from 'react';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { useUser } from "@stackframe/stack";

interface NavbarProps {
  currentPath?: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

/**
 * Inner navigation links component that shows dashboard link for logged-in users.
 */
function NavLinksInner({ currentPath }: { currentPath: string }) {
  const user = useUser();

  return (
    <>
      {user && (
        <Link
          href="/dashboard"
          className={`text-sm font-medium transition-colors hover:text-primary ${
            currentPath === '/dashboard' ? 'text-primary' : 'text-foreground'
          }`}
        >
          Dashboard
        </Link>
      )}
      <Link
        href="/templates"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          currentPath === '/templates' ? 'text-primary' : 'text-foreground'
        }`}
      >
        Templates
      </Link>
      <a
        href="https://github.com/ChanMeng666/easy-resume"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        GitHub
      </a>
    </>
  );
}

/**
 * Navigation bar component with auto-hide on scroll down functionality
 * Shows navbar when scrolling up, hides when scrolling down
 */
export function Navbar({ currentPath = '/', subtitle, rightContent }: NavbarProps) {
  const scrollDirection = useScrollDirection();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 transition-transform duration-300 ${
      scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easy-resume.svg" alt="Easy Resume" width={32} height={32} />
            <div>
              <span className="text-xl font-bold">Easy Resume</span>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </Link>

          {/* Right Content - Custom or Default Navigation */}
          {rightContent || (
            <div className="flex items-center gap-6">
              <Suspense fallback={
                <Link
                  href="/templates"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Templates
                </Link>
              }>
                <NavLinksInner currentPath={currentPath} />
              </Suspense>
              <Link href="/editor">
                <Button size="sm">Get Started</Button>
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
