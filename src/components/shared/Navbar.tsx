'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/UserButton';
import { ReactNode, Suspense } from 'react';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { useUser } from "@stackframe/stack";
import { Sparkles } from 'lucide-react';

interface NavbarProps {
  currentPath?: string;
  rightContent?: ReactNode;
  /** Whether to use fixed positioning. Defaults to true for backward compatibility. */
  fixed?: boolean;
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
          className={`text-sm font-bold transition-all hover:bg-gray-100 px-3 py-2 rounded-lg border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] ${
            currentPath === '/dashboard' 
              ? 'text-primary bg-primary/10 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]' 
              : 'text-foreground'
          }`}
        >
          Dashboard
        </Link>
      )}
      <Link
        href="/templates"
        className={`text-sm font-bold transition-all hover:bg-gray-100 px-3 py-2 rounded-lg border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] ${
          currentPath === '/templates' 
            ? 'text-primary bg-primary/10 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]' 
            : 'text-foreground'
        }`}
      >
        Templates
      </Link>
      <Link
        href="/editor/manual"
        className={`text-sm font-bold transition-all hover:bg-gray-100 px-3 py-2 rounded-lg border-2 border-transparent hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] ${
          currentPath === '/editor/manual' 
            ? 'text-primary bg-primary/10 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]' 
            : 'text-muted-foreground'
        }`}
      >
        Manual Editor
      </Link>
    </>
  );
}

/**
 * Neobrutalism styled navigation bar with auto-hide on scroll down.
 * Features bold borders, hard shadows, and clean typography.
 */
export function Navbar({ currentPath = '/', rightContent, fixed = true }: NavbarProps) {
  const scrollDirection = useScrollDirection();

  // Use fixed positioning by default for backward compatibility
  // When fixed=false, use relative positioning for flex layouts
  const positionClasses = fixed
    ? `fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
      }`
    : 'relative';

  return (
    <nav className={`${positionClasses} bg-white border-b-2 border-black`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo/vitex-logo-black.svg" alt="Vitex" width={120} height={52} className="h-auto" />
          </Link>

          {/* Right Content - Custom or Default Navigation */}
          {rightContent || (
            <div className="flex items-center gap-4">
              <Suspense fallback={
                <Link
                  href="/templates"
                  className="text-sm font-bold transition-all hover:bg-gray-100 px-3 py-2 rounded-lg"
                >
                  Templates
                </Link>
              }>
                <NavLinksInner currentPath={currentPath} />
              </Suspense>
              <Link href="/editor">
                <Button size="sm" className="gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI Editor
                </Button>
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
