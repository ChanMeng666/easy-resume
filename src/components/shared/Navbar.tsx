'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/UserButton';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { ReactNode, Suspense, useState } from 'react';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { useUser } from "@stackframe/stack";
import { Sparkles, Menu, X, LayoutDashboard, CreditCard, Files } from 'lucide-react';

interface NavbarProps {
  currentPath?: string;
  rightContent?: ReactNode;
  /** 
   * Positioning mode for the navbar:
   * - 'fixed': Fixed at top of viewport with scroll-hide behavior (default)
   * - 'sticky': Sticky at top of scroll container with scroll-hide behavior
   * - 'static': No special positioning, flows with content
   */
  position?: 'fixed' | 'sticky' | 'static';
  /** @deprecated Use position prop instead. Kept for backward compatibility. */
  fixed?: boolean;
  /** External scroll direction override. When provided, uses this instead of window scroll. */
  externalScrollDirection?: 'up' | 'down' | null;
}

/**
 * Helper function to check if a path is active.
 */
function isActivePath(currentPath: string, targetPath: string): boolean {
  if (targetPath === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(targetPath);
}

/**
 * Navigation link style generator.
 */
function getNavLinkStyles(currentPath: string, targetPath: string): string {
  const isActive = isActivePath(currentPath, targetPath);
  return `font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-all px-3 py-2 rounded-lg border-2 flex items-center gap-2 ${
    isActive
      ? 'text-primary bg-primary/10 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]'
      : 'text-foreground border-transparent hover:border-black hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]'
  }`;
}

/**
 * Inner navigation links component that shows contextual links.
 */
function NavLinksInner({ currentPath }: { currentPath: string }) {
  const user = useUser();

  return (
    <>
      {/* My Resumes - Only show for logged-in users */}
      {user && (
        <Link href="/resumes" className={getNavLinkStyles(currentPath, '/resumes')}>
          <Files className="w-4 h-4" />
          My Resumes
        </Link>
      )}

      {/* Dashboard - Only show for logged-in users */}
      {user && (
        <Link href="/dashboard" className={getNavLinkStyles(currentPath, '/dashboard')}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      )}

      {/* Pricing */}
      <Link href="/pricing" className={getNavLinkStyles(currentPath, '/pricing')}>
        <CreditCard className="w-4 h-4" />
        Pricing
      </Link>
    </>
  );
}

/**
 * Mobile navigation menu component.
 */
function MobileMenu({ 
  isOpen, 
  onClose, 
  currentPath 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentPath: string;
}) {
  const user = useUser();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="absolute right-0 top-0 h-full w-64 bg-white border-l-2 border-black shadow-[-4px_0px_0px_0px_rgba(0,0,0,0.9)] p-6">
        <div className="flex justify-end mb-6">
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-3">
          {/* My Resumes - Only for logged-in users */}
          {user && (
            <Link
              href="/resumes"
              onClick={onClose}
              className={`${getNavLinkStyles(currentPath, '/resumes')} w-full`}
            >
              <Files className="w-4 h-4" />
              My Resumes
            </Link>
          )}

          {/* Dashboard - Only for logged-in users */}
          {user && (
            <Link
              href="/dashboard"
              onClick={onClose}
              className={`${getNavLinkStyles(currentPath, '/dashboard')} w-full`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}

          {/* Pricing */}
          <Link
            href="/pricing"
            onClick={onClose}
            className={`${getNavLinkStyles(currentPath, '/pricing')} w-full`}
          >
            <CreditCard className="w-4 h-4" />
            Pricing
          </Link>

          {/* Get Started - Primary CTA */}
          <Link href="/" onClick={onClose}>
            <Button className="w-full gap-2 mt-2">
              <Sparkles className="w-4 h-4" />
              Get Started
            </Button>
          </Link>
        </nav>
      </div>
    </div>
  );
}

/**
 * Neobrutalism styled navigation bar with auto-hide on scroll down.
 * Features bold borders, hard shadows, clean typography, and mobile responsiveness.
 */
export function Navbar({ currentPath = '/', rightContent, position, fixed, externalScrollDirection }: NavbarProps) {
  const windowScrollDirection = useScrollDirection();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use external scroll direction if provided, otherwise use window scroll
  const scrollDirection = externalScrollDirection !== undefined 
    ? externalScrollDirection 
    : windowScrollDirection;

  // Resolve position from new prop or legacy fixed prop
  const resolvedPosition = position ?? (fixed === false ? 'static' : 'fixed');

  // Generate position classes based on mode
  const getPositionClasses = () => {
    switch (resolvedPosition) {
      case 'fixed':
        return `fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
        }`;
      case 'sticky':
        return `sticky top-0 z-50 transition-transform duration-300 ${
          scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
        }`;
      case 'static':
      default:
        return 'relative';
    }
  };

  const positionClasses = getPositionClasses();

  return (
    <>
      <nav className={`${positionClasses} bg-white border-b-2 border-black`}>
        <div className="container mx-auto px-4">
          <div className="flex h-[4.5rem] items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="Vitex home">
              <Image src="/logo/vitex-logo-black.svg" alt="Vitex" width={120} height={52} priority className="h-9 w-auto" />
            </Link>

            {/* Right Content - Custom or Default Navigation */}
            {rightContent || (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-4">
                  <Suspense fallback={
                    <Link
                      href="/pricing"
                      className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition-all hover:bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pricing
                    </Link>
                  }>
                    <NavLinksInner currentPath={currentPath} />
                  </Suspense>
                  
                  {/* Get Started - Primary CTA */}
                  <Link href="/">
                    <Button size="sm" className="gap-1">
                      <Sparkles className="w-4 h-4" />
                      Get Started
                    </Button>
                  </Link>

                  <Suspense fallback={null}>
                    <CreditBadge />
                  </Suspense>
                  <UserButton />
                </div>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden items-center gap-3">
                  <Suspense fallback={null}>
                    <CreditBadge />
                  </Suspense>
                  <UserButton />
                  <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        currentPath={currentPath}
      />
    </>
  );
}
