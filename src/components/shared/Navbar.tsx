'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/UserButton';
import { CreditBadge } from '@/components/shared/CreditBadge';
import { ReactNode, Suspense, useState } from 'react';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { useUser } from "@stackframe/stack";
import { Menu, X } from 'lucide-react';

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
 * Navigation link style generator — soft pill links in aubergine.
 */
function getNavLinkStyles(currentPath: string, targetPath: string): string {
  const isActive = isActivePath(currentPath, targetPath);
  return `text-sm text-aubergine transition-colors px-3 py-2 rounded-full ${
    isActive ? 'bg-bone' : 'hover:bg-bone'
  }`;
}

/**
 * Inner navigation links + primary CTA — auth-aware, text-only.
 *
 * Logged-in surfaces the two high-frequency destinations (My Resumes,
 * Applications); the rest (Profiles, Credits & Billing, Pricing) live in the
 * UserButton menu. Logged-out surfaces Pricing. The CTA always deep-links to
 * the homepage input console (`/#start`).
 */
function NavLinksInner({ currentPath }: { currentPath: string }) {
  const user = useUser();

  return (
    <>
      {user ? (
        <>
          <Link href="/resumes" className={getNavLinkStyles(currentPath, '/resumes')}>
            My Resumes
          </Link>
          <Link href="/applications" className={getNavLinkStyles(currentPath, '/applications')}>
            Applications
          </Link>
        </>
      ) : (
        <>
          <Link href="/pricing" className={getNavLinkStyles(currentPath, '/pricing')}>
            Pricing
          </Link>
          {/* Conversion CTA for visitors only — the logo already links home,
              so signed-in users get no duplicate entry point. */}
          <Link href="/#start">
            <Button size="sm">Get Started</Button>
          </Link>
        </>
      )}
    </>
  );
}

/**
 * Mobile navigation menu component — soft drawer, no hard shadow.
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
        className="absolute inset-0 bg-obsidian/40"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute right-0 top-0 h-full w-64 bg-white border-l border-ash rounded-l-3xl p-6">
        <div className="flex justify-end mb-6">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-full text-aubergine hover:bg-bone transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-3">
          {/* Credits row — balance + a route into Credits & Billing */}
          {user && (
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-ash">
              <Suspense fallback={null}>
                <CreditBadge />
              </Suspense>
              <Link
                href="/dashboard"
                onClick={onClose}
                className={`${getNavLinkStyles(currentPath, '/dashboard')} flex-1`}
              >
                Credits &amp; Billing
              </Link>
            </div>
          )}

          {user ? (
            <>
              <Link
                href="/resumes"
                onClick={onClose}
                className={`${getNavLinkStyles(currentPath, '/resumes')} w-full`}
              >
                My Resumes
              </Link>
              <Link
                href="/applications"
                onClick={onClose}
                className={`${getNavLinkStyles(currentPath, '/applications')} w-full`}
              >
                Applications
              </Link>
              <Link
                href="/profiles"
                onClick={onClose}
                className={`${getNavLinkStyles(currentPath, '/profiles')} w-full`}
              >
                Profiles
              </Link>
              <Link
                href="/pricing"
                onClick={onClose}
                className={`${getNavLinkStyles(currentPath, '/pricing')} w-full`}
              >
                Pricing
              </Link>
            </>
          ) : (
            <Link
              href="/pricing"
              onClick={onClose}
              className={`${getNavLinkStyles(currentPath, '/pricing')} w-full`}
            >
              Pricing
            </Link>
          )}

          {/* Conversion CTA for visitors only (logo already links home) */}
          {!user && (
            <Link href="/#start" onClick={onClose}>
              <Button className="w-full mt-2">Get Started</Button>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

/**
 * Phantom floating pill navigation with auto-hide on scroll down.
 * A capsule floats over the page; links are soft pills and the CTA is the
 * lavender glow button.
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

  // Generate position classes based on mode. The pill floats with a top gap;
  // it slides fully out of view (past its own height) when scrolling down.
  const getPositionClasses = () => {
    switch (resolvedPosition) {
      case 'fixed':
        return `fixed top-4 inset-x-0 z-50 px-4 transition-transform duration-300 ${
          scrollDirection === 'down' ? '-translate-y-[150%]' : 'translate-y-0'
        }`;
      case 'sticky':
        return `sticky top-4 z-50 px-4 transition-transform duration-300 ${
          scrollDirection === 'down' ? '-translate-y-[150%]' : 'translate-y-0'
        }`;
      case 'static':
      default:
        return 'relative px-4';
    }
  };

  const positionClasses = getPositionClasses();

  return (
    <>
      <nav className={positionClasses}>
        <div className="mx-auto max-w-content">
          <div className="flex h-14 items-center justify-between rounded-full border border-ash bg-paper pl-5 pr-2">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="Vitex home">
              <Image src="/logo/vitex-logo-black.svg" alt="Vitex" width={120} height={52} priority className="h-8 w-auto" />
            </Link>

            {/* Right Content - Custom or Default Navigation */}
            {rightContent || (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                  <Suspense fallback={
                    <Link
                      href="/pricing"
                      className="text-sm text-aubergine transition-colors hover:bg-bone px-3 py-2 rounded-full"
                    >
                      Pricing
                    </Link>
                  }>
                    <NavLinksInner currentPath={currentPath} />
                  </Suspense>

                  <Suspense fallback={null}>
                    <CreditBadge />
                  </Suspense>
                  <UserButton />
                </div>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden items-center gap-2">
                  <Suspense fallback={null}>
                    <CreditBadge />
                  </Suspense>
                  <UserButton />
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    aria-label="Open menu"
                    className="p-2 rounded-full text-aubergine hover:bg-bone transition-colors"
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
